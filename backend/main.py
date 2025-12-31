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
            if not data:
                return get_dashboard_data(days=days, region=region, force_refresh=True)
            return {"source": "database", "region": region, "data": data}
        else:
            # Get all regions from cache
            all_data = {}
            for reg in mailchimp_service.REGIONS:
                all_data[reg] = database.get_cached_campaigns(days=days, region=reg)

            # If any region is empty, consider refetching (or use mock data)
            if not any(all_data.values()):
                # For demo purposes, return empty - frontend will use mock data
                return {"source": "database", "data": all_data}

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

