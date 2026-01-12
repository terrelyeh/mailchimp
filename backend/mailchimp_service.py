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

    def get_growth_history(self, list_id, count=12):
        """Fetch subscriber growth history for an audience list"""
        data = self._get(f"/lists/{list_id}/growth-history", params={"count": count})
        if not data:
            return []

        history = []
        for item in data.get('history', []):
            history.append({
                "month": item.get('month'),
                "existing": item.get('existing', 0),
                "imports": item.get('imports', 0),
                "optins": item.get('optins', 0),
                "subscribed": item.get('subscribed', 0),
                "unsubscribed": item.get('unsubscribed', 0),
                "cleaned": item.get('cleaned', 0),
            })
        return history

    def get_all_audiences_growth(self, months=12):
        """Fetch growth data for all audiences in this region"""
        lists = self.get_lists()
        if not lists:
            return {"audiences": [], "total_subscribers": 0}

        audiences_data = []
        total_subscribers = 0

        for lst in lists:
            list_id = lst['id']
            history = self.get_growth_history(list_id, count=months)

            # Current subscriber count
            current_count = lst.get('member_count', 0)
            total_subscribers += current_count

            audiences_data.append({
                "id": list_id,
                "name": lst['name'],
                "current_subscribers": current_count,
                "unsubscribe_count": lst.get('unsubscribe_count', 0),
                "growth_history": history
            })

        return {
            "audiences": audiences_data,
            "total_subscribers": total_subscribers
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

    # Region code to display name mapping
    REGION_NAMES = {
        'US': 'United States',
        'EU': 'Europe',
        'APAC': 'Asia Pacific',
        'JP': 'Japan',
        'TW': 'Taiwan',
        'KR': 'Korea',
        'SG': 'Singapore',
        'AU': 'Australia',
        'UK': 'United Kingdom',
        'CA': 'Canada',
        'INDIA': 'India',
        'CN': 'China',
        'HK': 'Hong Kong',
        'DE': 'Germany',
        'FR': 'France',
        'BR': 'Brazil',
        'MX': 'Mexico',
        'DEFAULT': 'Default',
    }

    def __init__(self):
        # Dynamically detect available regions from environment variables
        self.REGIONS = self._detect_available_regions()
        self.clients = {
            region: MailchimpClient(region=region)
            for region in self.REGIONS
        }

    def _detect_available_regions(self):
        """Detect which regions have API credentials configured by scanning environment variables"""
        available_regions = []

        # Auto-detect regions from environment variables matching MAILCHIMP_API_KEY_*
        for key in os.environ:
            if key.startswith("MAILCHIMP_API_KEY_"):
                region = key.replace("MAILCHIMP_API_KEY_", "")
                server_prefix = os.getenv(f"MAILCHIMP_SERVER_PREFIX_{region}")

                # If both credentials exist, add this region
                if server_prefix:
                    available_regions.append(region)

        # Fallback to default region if no specific regions configured
        if not available_regions:
            default_key = os.getenv("MAILCHIMP_API_KEY")
            default_prefix = os.getenv("MAILCHIMP_SERVER_PREFIX")
            if default_key and default_prefix:
                available_regions.append("DEFAULT")

        logger.info(f"Detected MailChimp regions: {available_regions}")
        return available_regions

    def get_region_name(self, region_code):
        """Get display name for a region code"""
        return self.REGION_NAMES.get(region_code, region_code)

    def get_regions_with_names(self):
        """Get list of regions with their display names"""
        return [
            {"code": region, "name": self.get_region_name(region)}
            for region in self.REGIONS
        ]

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

    def get_subscriber_growth(self, region=None, audience_id=None, months=12):
        """
        Get subscriber growth data
        - region=None: aggregate across all regions
        - region=X: data for specific region
        - audience_id: filter to specific audience (only when region is specified)
        """
        if region:
            # Single region
            client = self.get_client(region)
            if not client:
                return {"error": f"Region {region} not found"}

            growth_data = client.get_all_audiences_growth(months=months)

            # If specific audience requested, filter
            if audience_id:
                audiences = growth_data.get('audiences', [])
                filtered = [a for a in audiences if a['id'] == audience_id]
                if filtered:
                    audience = filtered[0]
                    # Calculate growth metrics
                    history = audience.get('growth_history', [])
                    return {
                        "region": region,
                        "region_name": self.get_region_name(region),
                        "audience": {
                            "id": audience['id'],
                            "name": audience['name'],
                            "current_subscribers": audience['current_subscribers'],
                            "unsubscribe_count": audience['unsubscribe_count'],
                            "growth_history": history,
                            "metrics": self._calculate_growth_metrics(history, audience['current_subscribers'])
                        }
                    }
                return {"error": f"Audience {audience_id} not found"}

            # Return all audiences for this region
            return {
                "region": region,
                "region_name": self.get_region_name(region),
                "total_subscribers": growth_data['total_subscribers'],
                "audiences": growth_data['audiences']
            }
        else:
            # All regions aggregated
            all_regions_data = []
            grand_total = 0

            for reg in self.REGIONS:
                client = self.get_client(reg)
                if client:
                    growth_data = client.get_all_audiences_growth(months=months)
                    region_total = growth_data.get('total_subscribers', 0)
                    grand_total += region_total

                    # Aggregate monthly history across all audiences in this region
                    aggregated_history = self._aggregate_region_history(growth_data.get('audiences', []))

                    all_regions_data.append({
                        "region": reg,
                        "region_name": self.get_region_name(reg),
                        "total_subscribers": region_total,
                        "audience_count": len(growth_data.get('audiences', [])),
                        "growth_history": aggregated_history
                    })

            return {
                "grand_total": grand_total,
                "regions": all_regions_data
            }

    def _aggregate_region_history(self, audiences):
        """Aggregate growth history across multiple audiences"""
        if not audiences:
            return []

        # Collect all months from all audiences
        monthly_data = {}
        for audience in audiences:
            for entry in audience.get('growth_history', []):
                month = entry.get('month')
                if month not in monthly_data:
                    monthly_data[month] = {
                        'month': month,
                        'existing': 0,
                        'subscribed': 0,
                        'unsubscribed': 0,
                        'cleaned': 0
                    }
                monthly_data[month]['existing'] += entry.get('existing', 0)
                monthly_data[month]['subscribed'] += entry.get('subscribed', 0)
                monthly_data[month]['unsubscribed'] += entry.get('unsubscribed', 0)
                monthly_data[month]['cleaned'] += entry.get('cleaned', 0)

        # Sort by month descending
        sorted_history = sorted(monthly_data.values(), key=lambda x: x['month'], reverse=True)
        return sorted_history

    def _calculate_growth_metrics(self, history, current_subscribers):
        """Calculate growth rate and churn rate from history"""
        if not history or len(history) < 2:
            return {
                "growth_rate": 0,
                "churn_rate": 0,
                "net_change": 0
            }

        # Most recent month
        latest = history[0] if history else {}
        previous = history[1] if len(history) > 1 else {}

        # Monthly net change
        subscribed = latest.get('subscribed', 0)
        unsubscribed = latest.get('unsubscribed', 0)
        cleaned = latest.get('cleaned', 0)
        net_change = subscribed - unsubscribed - cleaned

        # Growth rate (month over month)
        prev_existing = previous.get('existing', 0)
        growth_rate = (net_change / prev_existing * 100) if prev_existing > 0 else 0

        # Churn rate (unsubscribes / total)
        churn_rate = (unsubscribed / current_subscribers * 100) if current_subscribers > 0 else 0

        return {
            "growth_rate": round(growth_rate, 2),
            "churn_rate": round(churn_rate, 2),
            "net_change": net_change,
            "new_subscribers": subscribed,
            "lost_subscribers": unsubscribed + cleaned
        }

# Singleton instance for multi-region service
mailchimp_service = MultiRegionMailchimpService()
