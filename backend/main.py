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

@app.get("/api/diagnose")
def diagnose_api(days: int = 60, region: str = None):
    """
    診斷 MailChimp API 連線狀況
    測試是否能正常抓取資料、是否有 rate limit 等問題
    """
    import time
    from datetime import datetime, timedelta

    regions_to_test = [region] if region else mailchimp_service.REGIONS
    results = {}

    for reg in regions_to_test:
        print(f"\n=== Testing region: {reg} ===")
        client = mailchimp_service.get_client(reg)
        region_result = {
            "region": reg,
            "tests": []
        }

        # Test 1: Basic API connection
        try:
            start_time = time.time()
            test_result = client._get("/")
            elapsed = time.time() - start_time

            region_result["tests"].append({
                "test": "Basic API Connection",
                "status": "success",
                "message": f"連線成功 (耗時: {elapsed:.2f}s)",
                "response_time": f"{elapsed:.2f}s"
            })
        except Exception as e:
            region_result["tests"].append({
                "test": "Basic API Connection",
                "status": "error",
                "message": f"連線失敗: {str(e)}"
            })
            results[reg] = region_result
            continue

        # Test 2: Fetch first batch of campaigns (count=10)
        try:
            start_time = time.time()
            first_batch = client._get("/campaigns", params={
                "status": "sent",
                "count": 10,
                "offset": 0,
                "sort_field": "send_time",
                "sort_dir": "DESC"
            })
            elapsed = time.time() - start_time

            total_items = first_batch.get('total_items', 0) if first_batch else 0
            campaigns_returned = len(first_batch.get('campaigns', [])) if first_batch else 0

            region_result["tests"].append({
                "test": "Fetch First 10 Campaigns",
                "status": "success",
                "message": f"成功抓取 {campaigns_returned} 個 campaigns (總共有 {total_items} 個)",
                "total_campaigns": total_items,
                "campaigns_in_batch": campaigns_returned,
                "response_time": f"{elapsed:.2f}s"
            })

            # Test 3: Check if we can fetch more (test pagination)
            if total_items > 10:
                try:
                    start_time = time.time()
                    second_batch = client._get("/campaigns", params={
                        "status": "sent",
                        "count": 10,
                        "offset": 10,
                        "sort_field": "send_time",
                        "sort_dir": "DESC"
                    })
                    elapsed = time.time() - start_time

                    second_batch_count = len(second_batch.get('campaigns', [])) if second_batch else 0

                    region_result["tests"].append({
                        "test": "Test Pagination (offset=10)",
                        "status": "success",
                        "message": f"分頁功能正常，成功抓取第二批 {second_batch_count} 個 campaigns",
                        "campaigns_in_batch": second_batch_count,
                        "response_time": f"{elapsed:.2f}s"
                    })
                except Exception as e:
                    region_result["tests"].append({
                        "test": "Test Pagination",
                        "status": "error",
                        "message": f"分頁測試失敗: {str(e)}"
                    })

            # Test 4: Test with date filter
            since_send_time = (datetime.utcnow() - timedelta(days=days)).isoformat()

            try:
                start_time = time.time()
                filtered_batch = client._get("/campaigns", params={
                    "status": "sent",
                    "since_send_time": since_send_time,
                    "count": 100,
                    "offset": 0,
                    "sort_field": "send_time",
                    "sort_dir": "DESC"
                })
                elapsed = time.time() - start_time

                filtered_total = filtered_batch.get('total_items', 0) if filtered_batch else 0
                filtered_count = len(filtered_batch.get('campaigns', [])) if filtered_batch else 0

                region_result["tests"].append({
                    "test": f"Fetch Last {days} Days",
                    "status": "success",
                    "message": f"過去 {days} 天有 {filtered_total} 個 campaigns，本次抓取 {filtered_count} 個",
                    "total_in_period": filtered_total,
                    "campaigns_fetched": filtered_count,
                    "response_time": f"{elapsed:.2f}s"
                })
            except Exception as e:
                region_result["tests"].append({
                    "test": f"Fetch Last {days} Days",
                    "status": "error",
                    "message": f"日期篩選測試失敗: {str(e)}"
                })

        except Exception as e:
            region_result["tests"].append({
                "test": "Fetch Campaigns",
                "status": "error",
                "message": f"抓取 campaigns 失敗: {str(e)}"
            })

        results[reg] = region_result

    return {
        "diagnosis_time": datetime.utcnow().isoformat(),
        "regions_tested": len(results),
        "results": results
    }


