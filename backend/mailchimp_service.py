import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import os
import json
import logging
import time
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_session_with_retry():
    """Create a requests session with retry logic"""
    session = requests.Session()
    retry_strategy = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["HEAD", "GET", "OPTIONS"]
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


class MailchimpClient:
    def __init__(self, region='US'):
        """
        Initialize Mailchimp client for a specific region.
        region: 'US', 'EU', 'APAC', or 'JP'
        """
        self.region = region
        self.session = create_session_with_retry()

        # Try to get region-specific credentials first, fall back to default
        api_key = os.getenv(f"MAILCHIMP_API_KEY_{region}") or os.getenv("MAILCHIMP_API_KEY")
        server_prefix = os.getenv(f"MAILCHIMP_SERVER_PREFIX_{region}") or os.getenv("MAILCHIMP_SERVER_PREFIX")

        if not api_key or not server_prefix:
            logger.warning(f"Mailchimp API credentials not found for region {region}")
            self.base_url = "https://us1.api.mailchimp.com/3.0"
            self.admin_url = "https://us1.admin.mailchimp.com"
            self.headers = {}
        else:
            self.base_url = f"https://{server_prefix}.api.mailchimp.com/3.0"
            self.admin_url = f"https://{server_prefix}.admin.mailchimp.com"
            self.headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }

    def _get(self, endpoint, params=None):
        url = f"{self.base_url}{endpoint}"
        try:
            response = self.session.get(
                url,
                headers=self.headers,
                params=params,
                timeout=30  # Increased timeout for reliability
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.Timeout:
            logger.error(f"Mailchimp API Timeout for {self.region}: {endpoint}")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"Mailchimp API Error for {self.region}: {e}")
            return None

    def get_lists(self):
        """Fetch all audience lists for this account"""
        data = self._get("/lists", params={"count": 100})
        if not data:
            return []

        lists = []
        for lst in data.get('lists', []):
            lists.append({
                "id": lst['id'],
                "name": lst['name'],
                "member_count": lst.get('stats', {}).get('member_count', 0),
                "unsubscribe_count": lst.get('stats', {}).get('unsubscribe_count', 0),
                "open_rate": lst.get('stats', {}).get('open_rate', 0),
                "click_rate": lst.get('stats', {}).get('click_rate', 0),
            })
        return lists

    def get_segment_name(self, list_id, segment_id):
        """Fetch segment name by ID"""
        if not list_id or not segment_id:
            return None
        data = self._get(f"/lists/{list_id}/segments/{segment_id}")
        if data:
            return data.get('name', '')
        return None

    def get_campaigns(self, days=30, status="sent", count=1000):
        """Fetch sent campaigns from the last N days with pagination support"""
        since_send_time = (datetime.utcnow() - timedelta(days=days)).isoformat()

        all_campaigns = []
        offset = 0
        batch_size = 1000  # MailChimp API max is 1000 per request

        while True:
            params = {
                "status": status,
                "since_send_time": since_send_time,
                "count": min(batch_size, count - len(all_campaigns)),
                "offset": offset,
                "sort_field": "send_time",
                "sort_dir": "DESC"
            }

            logger.info(f"Fetching campaigns for region {self.region}: offset={offset}, count={params['count']}")
            data = self._get("/campaigns", params=params)

            if not data or 'campaigns' not in data:
                logger.debug(f"No more campaigns found for region {self.region}")
                break

            campaigns_batch = data.get('campaigns', [])
            if not campaigns_batch:
                break

            for c in campaigns_batch:
                # Extract audience/list information
                recipients = c.get('recipients', {})
                list_id = recipients.get('list_id', '')
                list_name = recipients.get('list_name', 'Unknown Audience')

                # Extract segment information if available
                segment_opts = recipients.get('segment_opts', {})
                segment_id = segment_opts.get('saved_segment_id') or segment_opts.get('prebuilt_segment_id')

                # Try multiple locations for segment text/name
                segment_text = (
                    recipients.get('segment_text') or  # Direct on recipients
                    segment_opts.get('segment_text') or  # Inside segment_opts
                    segment_opts.get('match', '')  # Fallback to match type if no name
                )

                # If we have segment_id but no text, try to fetch segment name
                if segment_id and not segment_text:
                    # Use cache to avoid redundant API calls
                    cache_key = f"{list_id}:{segment_id}"
                    if not hasattr(self, '_segment_cache'):
                        self._segment_cache = {}

                    if cache_key not in self._segment_cache:
                        segment_name = self.get_segment_name(list_id, segment_id)
                        self._segment_cache[cache_key] = segment_name or f"Segment #{segment_id}"

                    segment_text = self._segment_cache[cache_key]

                all_campaigns.append({
                    "id": c['id'],
                    "web_id": c['web_id'],
                    "title": c['settings']['title'],
                    "subject_line": c['settings']['subject_line'],
                    "send_time": c['send_time'],
                    "emails_sent": c['emails_sent'],
                    "archive_url": c['archive_url'],
                    "report_url": f"{self.admin_url}/reports/summary?id={c['web_id']}",
                    "audience_id": list_id,
                    "audience_name": list_name,
                    "segment_id": segment_id,
                    "segment_text": segment_text,
                    "recipient_count": recipients.get('recipient_count', 0)
                })

            logger.info(f"Fetched {len(campaigns_batch)} campaigns for region {self.region} (total so far: {len(all_campaigns)})")

            # Check if we've reached the total or our limit
            total_items = data.get('total_items', 0)
            if len(all_campaigns) >= total_items or len(all_campaigns) >= count:
                break

            offset += batch_size

        logger.info(f"Total campaigns fetched for region {self.region}: {len(all_campaigns)}")
        return all_campaigns

    def get_campaign_report(self, campaign_id):
        """Fetch report stats for a specific campaign"""
        data = self._get(f"/reports/{campaign_id}")
        if not data:
            return {}

        return {
            "campaign_id": campaign_id,
            "opens": data.get('opens', {}).get('opens_total', 0),
            "unique_opens": data.get('opens', {}).get('unique_opens', 0),
            "open_rate": data.get('opens', {}).get('open_rate', 0),
            "clicks": data.get('clicks', {}).get('clicks_total', 0),
            "unique_clicks": data.get('clicks', {}).get('unique_clicks', 0),
            "click_rate": data.get('clicks', {}).get('click_rate', 0),
            "unsubscribed": data.get('unsubscribed', 0),
            "bounces": data.get('bounces', {}).get('hard_bounces', 0) + data.get('bounces', {}).get('soft_bounces', 0),
            "share_report": data.get('share_report', {}).get('share_url', ''),  # Shareable report URL
        }

    def get_dashboard_data(self, days=30):
        """Aggregate data for dashboard with parallel report fetching"""
        campaigns = self.get_campaigns(days=days)

        if not campaigns:
            return []

        logger.info(f"Fetching reports for {len(campaigns)} campaigns in region {self.region}")

        # Use ThreadPoolExecutor for parallel requests (limit to 5 concurrent to avoid rate limits)
        results = []
        failed_count = 0

        def fetch_report_with_delay(camp):
            """Fetch report with small delay to avoid rate limits"""
            try:
                report = self.get_campaign_report(camp['id'])
                if report:
                    return {**camp, **report}
                return camp
            except Exception as e:
                logger.warning(f"Failed to fetch report for campaign {camp['id']}: {e}")
                return camp

        # Process in batches of 10 with small delays to respect rate limits
        batch_size = 10
        for i in range(0, len(campaigns), batch_size):
            batch = campaigns[i:i + batch_size]

            with ThreadPoolExecutor(max_workers=5) as executor:
                futures = {executor.submit(fetch_report_with_delay, camp): camp for camp in batch}
                for future in as_completed(futures):
                    try:
                        result = future.result()
                        results.append(result)
                    except Exception as e:
                        failed_count += 1
                        results.append(futures[future])

            # Small delay between batches to avoid rate limits
            if i + batch_size < len(campaigns):
                time.sleep(0.5)

        if failed_count > 0:
            logger.warning(f"Failed to fetch {failed_count} reports for region {self.region}")

        logger.info(f"Completed fetching {len(results)} campaigns with reports for region {self.region}")
        return results

class MultiRegionMailchimpService:
    """Service to manage MailChimp clients across multiple regions"""

    def __init__(self):
        # Dynamically detect available regions from environment variables
        self.REGIONS = self._detect_available_regions()
        self.clients = {
            region: MailchimpClient(region=region)
            for region in self.REGIONS
        }

    def _detect_available_regions(self):
        """Detect which regions have API credentials configured"""
        available_regions = []

        # Check for common region names
        possible_regions = ['US', 'EU', 'APAC', 'JP', 'INDIA', 'AU', 'CA', 'UK', 'SG']

        for region in possible_regions:
            api_key = os.getenv(f"MAILCHIMP_API_KEY_{region}")
            server_prefix = os.getenv(f"MAILCHIMP_SERVER_PREFIX_{region}")

            # If both credentials exist, add this region
            if api_key and server_prefix:
                available_regions.append(region)

        # Fallback to default region if no specific regions configured
        if not available_regions:
            default_key = os.getenv("MAILCHIMP_API_KEY")
            default_prefix = os.getenv("MAILCHIMP_SERVER_PREFIX")
            if default_key and default_prefix:
                available_regions.append("DEFAULT")

        logger.info(f"Detected MailChimp regions: {available_regions}")
        return available_regions

    def get_client(self, region):
        """Get MailChimp client for a specific region"""
        return self.clients.get(region)

    def get_dashboard_data(self, days=30, region=None):
        """
        Get dashboard data for one or all regions
        region: specific region code or None for all regions
        """
        if region:
            # Single region
            client = self.get_client(region)
            if client:
                return client.get_dashboard_data(days=days)
            return []
        else:
            # All regions
            all_data = {}
            for reg in self.REGIONS:
                client = self.get_client(reg)
                if client:
                    all_data[reg] = client.get_dashboard_data(days=days)
            return all_data

# Singleton instance for multi-region service
mailchimp_service = MultiRegionMailchimpService()
