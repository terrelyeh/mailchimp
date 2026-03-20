import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import os
import json
import logging
import re
import time
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed


def strip_html(text):
    """Strip HTML tags from a string, returning clean text"""
    if not text:
        return ''
    return re.sub(r'<[^>]+>', '', text).strip()

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

    def get_segment_info(self, list_id, segment_id):
        """Fetch segment info (name and member_count) by ID"""
        if not list_id or not segment_id:
            return None
        data = self._get(f"/lists/{list_id}/segments/{segment_id}")
        if data:
            return {
                'name': data.get('name', ''),
                'member_count': data.get('member_count', 0),
                'type': data.get('type', '')  # "static" = Tag, "saved" = Segment
            }
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

                # Extract segment information (wrapped in try/except to never break campaign loading)
                segment_opts = recipients.get('segment_opts', {}) or {}
                segment_id = segment_opts.get('saved_segment_id') or segment_opts.get('prebuilt_segment_id')
                segment_label = None
                segment_type = None
                segment_member_count = None

                try:
                    conditions = segment_opts.get('conditions') or []

                    if not hasattr(self, '_segment_cache'):
                        self._segment_cache = {}

                    # --- Case 1: Has a saved_segment_id → fetch name & type from API ---
                    if segment_id:
                        cache_key = f"{list_id}:{segment_id}"
                        if cache_key not in self._segment_cache:
                            info = self.get_segment_info(list_id, segment_id)
                            self._segment_cache[cache_key] = info or {
                                'name': f"Segment #{segment_id}", 'member_count': 0, 'type': ''
                            }
                        cached = self._segment_cache[cache_key]
                        segment_label = cached.get('name', '')
                        segment_member_count = cached.get('member_count', 0)
                        segment_type = cached.get('type', '')

                    # --- Case 2: Has conditions → parse them ---
                    elif isinstance(conditions, list) and conditions:
                        labels = []
                        for cond in conditions:
                            if not isinstance(cond, dict):
                                continue
                            ct = cond.get('condition_type', '')
                            value = cond.get('value', '')

                            if ct == 'StaticSegment':
                                tag_id = value
                                if tag_id and list_id:
                                    tk = f"{list_id}:{tag_id}"
                                    if tk not in self._segment_cache:
                                        ti = self.get_segment_info(list_id, tag_id)
                                        self._segment_cache[tk] = ti or {
                                            'name': f"Tag #{tag_id}", 'member_count': 0, 'type': 'static'
                                        }
                                    cached_tag = self._segment_cache[tk]
                                    labels.append(cached_tag.get('name', f'Tag #{tag_id}'))
                                    segment_type = 'static'
                                    if not segment_member_count:
                                        segment_member_count = cached_tag.get('member_count', 0)
                                else:
                                    labels.append(f'Tag #{tag_id}')
                                    segment_type = 'static'
                            elif ct == 'Interests':
                                labels.append('Interest Group')
                            elif ct in ('TextMerge', 'SelectMerge'):
                                field = cond.get('field', '')
                                op = cond.get('op', '')
                                labels.append(f'{field} {op} {value}' if field else 'Merge Field')
                            elif ct == 'Aim':
                                labels.append('Campaign Activity')
                            elif ct == 'CampaignSegment':
                                labels.append('Campaign Engagement')
                            elif ct in ('IPGeoIn', 'IPGeoCountryState'):
                                labels.append('Location')
                            elif ct == 'Language':
                                labels.append(f'Language: {value}' if value else 'Language')
                            elif ct == 'NewSubscribers':
                                labels.append('New Subscribers')
                            elif ct == 'VIP':
                                labels.append('VIP')
                            elif ct == 'Automation':
                                labels.append('Automation')
                            elif ct == 'EmailAddress':
                                labels.append('Email Filter')
                            elif ct == 'DateMerge':
                                labels.append('Date Condition')
                            else:
                                labels.append(ct if ct else 'Filter')

                        if not segment_type:
                            segment_type = 'saved'
                        segment_label = ' + '.join(labels[:3])
                        if len(labels) > 3:
                            segment_label += f' +{len(labels) - 3} more'

                    # --- Case 3: Has match but no conditions (Mailchimp hides advanced segment details) ---
                    elif segment_opts.get('match') and not conditions:
                        raw_text = strip_html(str(recipients.get('segment_text', '') or ''))
                        if raw_text:
                            segment_type = 'saved'
                            if 'custom advanced segment' in raw_text.lower():
                                segment_label = 'Advanced Segment'
                            elif 'subscription status' in raw_text.lower() or 'email subscription' in raw_text.lower():
                                segment_label = 'Subscribed Only'
                            else:
                                # Extract meaningful part from segment_text
                                # Remove boilerplate prefix/suffix
                                clean = raw_text
                                clean = re.sub(r'^Contacts that match (all|any) of the following conditions:\s*', '', clean)
                                clean = re.sub(r'For a total of [\d,]+ emails sent\.?\s*$', '', clean)
                                segment_label = clean.strip()[:60] if clean.strip() else 'Segment'

                except Exception as e:
                    logger.warning(f"Failed to parse segment info for campaign {c.get('id')}: {e}")
                    segment_label = None
                    segment_type = None
                    segment_member_count = None

                settings = c.get('settings') or {}
                all_campaigns.append({
                    "id": c.get('id', ''),
                    "web_id": c.get('web_id', 0),
                    "status": c.get('status', status),
                    "title": settings.get('title', '(Untitled)'),
                    "subject_line": settings.get('subject_line', ''),
                    "send_time": c.get('send_time', '') or c.get('create_time', ''),
                    "emails_sent": c.get('emails_sent', 0),
                    "archive_url": c.get('archive_url', ''),
                    "report_url": f"{self.admin_url}/reports/summary?id={c.get('web_id', 0)}",
                    "audience_id": list_id,
                    "audience_name": list_name,
                    "segment_id": segment_id,
                    "segment_text": strip_html(str(recipients.get('segment_text', '') or '')),
                    "segment_label": segment_label,
                    "segment_type": segment_type,
                    "segment_member_count": segment_member_count,
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

    def get_campaigns_all_statuses(self, days=30, count=1000):
        """Fetch campaigns of all statuses (sent, schedule, draft, paused)"""
        all_campaigns = []
        for status in ['sent', 'schedule', 'save', 'paused']:
            try:
                campaigns = self.get_campaigns(days=days, status=status, count=count)
                all_campaigns.extend(campaigns)
            except Exception as e:
                logger.warning(f"Failed to fetch {status} campaigns for {self.region}: {e}")
        # Sort by send_time/create_time descending
        all_campaigns.sort(key=lambda x: x.get('send_time', ''), reverse=True)
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

# Singleton instance for multi-region service
mailchimp_service = MultiRegionMailchimpService()
