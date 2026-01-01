from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from mailchimp_service import mailchimp_service
import database

load_dotenv()

app = FastAPI(title="Mailchimp Dashboard API")

# Allow CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Mailchimp Dashboard API is running"}

@app.get("/api/dashboard")
def get_dashboard_data(days: int = 30, region: str = None, force_refresh: bool = False):
    """
    Get dashboard stats for all regions or a specific region.
    Parameters:
    - days: 7, 30, or 90 (default: 30)
    - region: region code (e.g., 'US', 'INDIA', 'APAC', 'JP'), or None for all regions
    - force_refresh: true to fetch from Mailchimp and update DB
    """
    if force_refresh:
        try:
            if region:
                # Single region
                data = mailchimp_service.get_dashboard_data(days=days, region=region)
                database.upsert_campaigns(data, region=region)
                return {"source": "mailchimp", "region": region, "data": data}
            else:
                # All regions
                all_data = mailchimp_service.get_dashboard_data(days=days)
                for reg, campaigns in all_data.items():
                    database.upsert_campaigns(campaigns, region=reg)
                return {"source": "mailchimp", "data": all_data}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        # Return cache
        if region:
            data = database.get_cached_campaigns(days=days, region=region)
            # Auto-refresh if cache is empty
            if not data:
                print(f"Cache empty for region {region}, forcing refresh...")
                return get_dashboard_data(days=days, region=region, force_refresh=True)
            return {"source": "database", "region": region, "data": data}
        else:
            # Get all regions from cache
            all_data = {}
            for reg in mailchimp_service.REGIONS:
                all_data[reg] = database.get_cached_campaigns(days=days, region=reg)

            # Check if cache is mostly empty - if so, force refresh
            total_campaigns = sum(len(campaigns) for campaigns in all_data.values() if campaigns)
            if total_campaigns < len(mailchimp_service.REGIONS):
                # Less than 1 campaign per region on average - likely cache issue
                print(f"Cache has only {total_campaigns} campaigns across {len(mailchimp_service.REGIONS)} regions, forcing refresh...")
                return get_dashboard_data(days=days, region=region, force_refresh=True)

            return {"source": "database", "data": all_data}

@app.get("/api/regions")
def get_regions():
    """Get list of available regions dynamically detected from environment variables"""
    return {
        "regions": mailchimp_service.REGIONS
    }

@app.post("/api/sync")
def trigger_sync(background_tasks: BackgroundTasks, days: int = 30):
    """Background task to sync data for all regions"""
    def sync():
        print("Starting background sync for all regions...")
        all_data = mailchimp_service.get_dashboard_data(days=days)
        for region, campaigns in all_data.items():
            database.upsert_campaigns(campaigns, region=region)
        print("Sync complete.")

    background_tasks.add_task(sync)
    return {"status": "Sync started for all regions"}

@app.get("/api/audiences")
def get_audiences(region: str = None):
    """Get all audiences (lists) for a region or all regions"""
    if region:
        # Single region
        client = mailchimp_service.get_client(region)
        if not client:
            raise HTTPException(status_code=404, detail=f"Region {region} not found")

        lists = client.get_lists()
        return {
            "region": region,
            "audiences": lists
        }
    else:
        # All regions
        all_audiences = {}
        for reg in mailchimp_service.REGIONS:
            client = mailchimp_service.get_client(reg)
            if client:
                all_audiences[reg] = client.get_lists()

        return {
            "audiences": all_audiences
        }

@app.get("/api/cache/stats")
def get_cache_stats():
    """Get statistics about cached campaigns"""
    stats = database.get_cache_stats()
    return {
        "cache_stats": stats
    }

@app.post("/api/cache/clear")
def clear_cache(region: str = None):
    """Clear cached campaigns for a region or all regions"""
    deleted_count = database.clear_cache(region=region)
    return {
        "status": "success",
        "deleted_count": deleted_count,
        "region": region if region else "all regions"
    }

@app.get("/api/test-credentials")
def test_credentials():
    """Test MailChimp API credentials for all configured regions"""
    results = {}

    for region in mailchimp_service.REGIONS:
        client = mailchimp_service.get_client(region)

        # Test by trying to fetch campaigns
        try:
            campaigns = client.get_campaigns(days=30, count=1)

            if campaigns is None:
                results[region] = {
                    "status": "error",
                    "message": "API call failed - check credentials and server prefix"
                }
            elif len(campaigns) == 0:
                results[region] = {
                    "status": "success",
                    "message": "API credentials valid, but no campaigns found in the last 30 days"
                }
            else:
                results[region] = {
                    "status": "success",
                    "message": f"API credentials valid! Found {len(campaigns)} campaign(s)",
                    "sample_campaign": campaigns[0].get('title', 'N/A')
                }
        except Exception as e:
            results[region] = {
                "status": "error",
                "message": str(e)
            }

    return {
        "regions_tested": len(results),
        "results": results
    }


