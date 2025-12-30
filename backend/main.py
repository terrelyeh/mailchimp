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
def get_dashboard_data(force_refresh: bool = False):
    """
    Get dashboard stats.
    If force_refresh=true, fetch from Mailchimp and update DB.
    Else, try to return cached data first.
    """
    if force_refresh:
        try:
            data = mailchimp_service.get_dashboard_data(days=30)
            database.upsert_campaigns(data)
            return {"source": "mailchimp", "data": data}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        # Return cache
        data = database.get_cached_campaigns(days=30)
        if not data:
            # If cache empty, fetch anyway
            # In a real app we might trigger a background task
            return get_dashboard_data(force_refresh=True)
            
        return {"source": "database", "data": data}

@app.post("/api/sync")
def trigger_sync(background_tasks: BackgroundTasks):
    """Background task to sync data"""
    def sync():
        print("Starting background sync...")
        data = mailchimp_service.get_dashboard_data(days=60)
        database.upsert_campaigns(data)
        print("Sync complete.")
        
    background_tasks.add_task(sync)
    return {"status": "Sync started"}

