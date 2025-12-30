import requests
import os
import json
from datetime import datetime, timedelta

class MailchimpClient:
    def __init__(self):
        self.api_key = os.getenv("MAILCHIMP_API_KEY")
        self.server_prefix = os.getenv("MAILCHIMP_SERVER_PREFIX")
        
        if not self.api_key or not self.server_prefix:
            # Using placeholder for now if env vars are missing to avoid crash on startup
            print("Warning: Mailchimp API credentials not found in env")
            self.base_url = "https://us1.api.mailchimp.com/3.0"
            self.headers = {}
        else:
            self.base_url = f"https://{self.server_prefix}.api.mailchimp.com/3.0"
            self.headers = {
                "Authorization": f"Bearer {self.api_key}",
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

    def get_campaigns(self, days=30, status="sent", count=100):
        """Fetch sent campaigns from the last N days"""
        since_send_time = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        params = {
            "status": status,
            "since_send_time": since_send_time,
            "count": count,
            "sort_field": "send_time",
            "sort_dir": "DESC"
        }
        
        data = self._get("/campaigns", params=params)
        if not data:
            return []
            
        campaigns = []
        for c in data.get('campaigns', []):
            campaigns.append({
                "id": c['id'],
                "web_id": c['web_id'],
                "title": c['settings']['title'],
                "subject_line": c['settings']['subject_line'],
                "send_time": c['send_time'],
                "emails_sent": c['emails_sent'],
                "archive_url": c['archive_url']
            })
        return campaigns

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

# Singleton instance
mailchimp_service = MailchimpClient()
