import requests
import os
import json
from datetime import datetime, timedelta

class MailchimpClient:
    def __init__(self, region='US'):
        """
        Initialize Mailchimp client for a specific region.
        region: 'US', 'EU', 'APAC', or 'JP'
        """
        self.region = region

        # Try to get region-specific credentials first, fall back to default
        api_key = os.getenv(f"MAILCHIMP_API_KEY_{region}") or os.getenv("MAILCHIMP_API_KEY")
        server_prefix = os.getenv(f"MAILCHIMP_SERVER_PREFIX_{region}") or os.getenv("MAILCHIMP_SERVER_PREFIX")

        if not api_key or not server_prefix:
            # Using placeholder for now if env vars are missing to avoid crash on startup
            print(f"Warning: Mailchimp API credentials not found for region {region}")
            self.base_url = "https://us1.api.mailchimp.com/3.0"
            self.headers = {}
        else:
            self.base_url = f"https://{server_prefix}.api.mailchimp.com/3.0"
            self.headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }

    def _get(self, endpoint, params=None):
        url = f"{self.base_url}{endpoint}"
        try:
            response = requests.get(url, headers=self.headers, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Mailchimp API Error: {e}")
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

    def get_campaigns(self, days=30, status="sent", count=1000):
        """Fetch sent campaigns from the last N days with pagination support"""
        since_send_time = (datetime.utcnow() - timedelta(days=days)).isoformat()

        all_campaigns = []
        offset = 0
        batch_size = 100  # MailChimp API limit per request

        while True:
            params = {
                "status": status,
                "since_send_time": since_send_time,
                "count": min(batch_size, count - len(all_campaigns)),
                "offset": offset,
                "sort_field": "send_time",
                "sort_dir": "DESC"
            }

            print(f"Fetching campaigns for region {self.region}: offset={offset}, count={params['count']}")
            data = self._get("/campaigns", params=params)

            if not data or 'campaigns' not in data:
                print(f"No more campaigns found for region {self.region}")
                break

            campaigns_batch = data.get('campaigns', [])
            if not campaigns_batch:
                break

            for c in campaigns_batch:
                # Extract audience/list information
                recipients = c.get('recipients', {})
                list_id = recipients.get('list_id', '')
                list_name = recipients.get('list_name', 'Unknown Audience')

                all_campaigns.append({
                    "id": c['id'],
                    "web_id": c['web_id'],
                    "title": c['settings']['title'],
                    "subject_line": c['settings']['subject_line'],
                    "send_time": c['send_time'],
                    "emails_sent": c['emails_sent'],
                    "archive_url": c['archive_url'],
                    "audience_id": list_id,
                    "audience_name": list_name
                })

            print(f"Fetched {len(campaigns_batch)} campaigns for region {self.region} (total so far: {len(all_campaigns)})")

            # Check if we've reached the total or our limit
            total_items = data.get('total_items', 0)
            if len(all_campaigns) >= total_items or len(all_campaigns) >= count:
                break

            offset += batch_size

        print(f"Total campaigns fetched for region {self.region}: {len(all_campaigns)}")
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
        }

    def get_dashboard_data(self, days=30):
        """Aggregate data for dashboard"""
        campaigns = self.get_campaigns(days=days)
        
        # In a real scenario, we might want to fetch reports asynchronously or from cache
        # For simplicity, we loop (be careful with rate limits)
        
        results = []
        for camp in campaigns:
            # Check cache here (TODO)
            report = self.get_campaign_report(camp['id'])
            if report:
                # Merge dictionaries
                results.append({**camp, **report})
            else:
                results.append(camp) # Just basic info if report fails
                
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

        print(f"Detected MailChimp regions: {available_regions}")
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
