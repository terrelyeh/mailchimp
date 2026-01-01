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
    print(f"\n{'='*60}")
    print(f"Dashboard API called: days={days}, region={region}, force_refresh={force_refresh}")
    print(f"Available regions: {mailchimp_service.REGIONS}")

    if force_refresh:
        print("🔄 Force refresh mode - fetching from MailChimp API...")
        try:
            if region:
                # Single region
                print(f"📡 Fetching data for region: {region}")
                data = mailchimp_service.get_dashboard_data(days=days, region=region)
                print(f"✅ Fetched {len(data) if data else 0} campaigns for {region}")

                print(f"💾 Saving to database...")
                database.upsert_campaigns(data, region=region)
                print(f"✅ Saved {len(data) if data else 0} campaigns to database for {region}")

                return {"source": "mailchimp", "region": region, "data": data}
            else:
                # All regions
                print(f"📡 Fetching data for all regions: {mailchimp_service.REGIONS}")
                all_data = mailchimp_service.get_dashboard_data(days=days)
                print(f"✅ Fetched data from MailChimp API")

                for reg, campaigns in all_data.items():
                    print(f"💾 Saving {len(campaigns)} campaigns for region {reg}...")
                    database.upsert_campaigns(campaigns, region=reg)
                    print(f"✅ Saved {len(campaigns)} campaigns for {reg}")

                # Verify what was saved
                final_stats = database.get_cache_stats()
                print(f"📊 Final cache stats: {final_stats}")

                return {"source": "mailchimp", "data": all_data}
        except Exception as e:
            print(f"❌ ERROR during force refresh: {e}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))
    else:
        # Return cache
        print("📂 Returning from cache...")
        if region:
            data = database.get_cached_campaigns(days=days, region=region)
            print(f"📊 Cache returned {len(data) if data else 0} campaigns for {region}")

            # Auto-refresh if cache is empty
            if not data:
                print(f"⚠️  Cache empty for region {region}, forcing refresh...")
                return get_dashboard_data(days=days, region=region, force_refresh=True)
            return {"source": "database", "region": region, "data": data}
        else:
            # Get all regions from cache
            all_data = {}
            for reg in mailchimp_service.REGIONS:
                all_data[reg] = database.get_cached_campaigns(days=days, region=reg)
                print(f"📊 Cache for {reg}: {len(all_data[reg]) if all_data[reg] else 0} campaigns")

            # Check if cache is mostly empty - if so, force refresh
            total_campaigns = sum(len(campaigns) for campaigns in all_data.values() if campaigns)
            print(f"📊 Total campaigns in cache: {total_campaigns} (regions: {len(mailchimp_service.REGIONS)})")

            if total_campaigns < len(mailchimp_service.REGIONS):
                # Less than 1 campaign per region on average - likely cache issue
                print(f"⚠️  Cache has only {total_campaigns} campaigns across {len(mailchimp_service.REGIONS)} regions, forcing refresh...")
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

@app.get("/api/cache/health")
def check_cache_health():
    """
    檢查快取健康狀況並提供診斷資訊
    """
    import time

    # 1. 檢查快取統計
    cache_stats = database.get_cache_stats()

    # 2. 檢查已設定的區域
    configured_regions = mailchimp_service.REGIONS

    # 3. 檢查每個區域的快取狀況
    region_details = {}
    for region in configured_regions:
        cached_campaigns = database.get_cached_campaigns(days=90, region=region)
        region_details[region] = {
            "cached_count": len(cached_campaigns) if cached_campaigns else 0,
            "has_data": bool(cached_campaigns)
        }

    # 4. 檢查資料庫檔案
    import os
    db_exists = os.path.exists(database.DB_PATH)
    db_size = os.path.getsize(database.DB_PATH) if db_exists else 0

    # 5. 判斷健康狀況
    total_campaigns = cache_stats.get('total', 0)
    is_healthy = total_campaigns >= len(configured_regions)

    issues = []
    if not db_exists:
        issues.append("Database file does not exist")
    elif db_size == 0:
        issues.append("Database file is empty")
    elif total_campaigns == 0:
        issues.append("No campaigns in cache")
    elif total_campaigns < len(configured_regions):
        issues.append(f"Cache has only {total_campaigns} campaigns for {len(configured_regions)} regions")

    # 6. 建議
    recommendations = []
    if not is_healthy:
        recommendations.append("Run force refresh to populate cache")
        recommendations.append("Check MailChimp API credentials for all regions")

    return {
        "healthy": is_healthy,
        "cache_stats": cache_stats,
        "configured_regions": configured_regions,
        "region_details": region_details,
        "database": {
            "path": database.DB_PATH,
            "exists": db_exists,
            "size_bytes": db_size
        },
        "issues": issues,
        "recommendations": recommendations,
        "timestamp": time.time()
    }

@app.post("/api/cache/populate")
def populate_cache(days: int = 30):
    """
    手動填充快取
    強制從 MailChimp API 抓取所有區域的資料並儲存到資料庫
    """
    print(f"\n{'='*60}")
    print(f"Manual cache population triggered for {days} days")
    print(f"{'='*60}\n")

    try:
        results = {}

        for region in mailchimp_service.REGIONS:
            print(f"\n📡 Processing region: {region}")
            print(f"{'='*50}")

            try:
                # Fetch data
                client = mailchimp_service.get_client(region)
                if not client:
                    print(f"❌ No client found for {region}")
                    results[region] = {
                        "status": "error",
                        "message": "No client configured"
                    }
                    continue

                data = client.get_dashboard_data(days=days)
                print(f"✅ Fetched {len(data)} campaigns for {region}")

                # Save to database
                if data:
                    database.upsert_campaigns(data, region=region)
                    print(f"💾 Saved {len(data)} campaigns for {region}")

                    results[region] = {
                        "status": "success",
                        "campaigns_fetched": len(data)
                    }
                else:
                    print(f"⚠️  No campaigns found for {region}")
                    results[region] = {
                        "status": "success",
                        "campaigns_fetched": 0,
                        "message": "No campaigns in the specified period"
                    }

            except Exception as e:
                print(f"❌ Error processing {region}: {e}")
                import traceback
                traceback.print_exc()
                results[region] = {
                    "status": "error",
                    "message": str(e)
                }

        # Get final stats
        final_stats = database.get_cache_stats()
        print(f"\n📊 Final cache stats: {final_stats}")

        return {
            "status": "completed",
            "results": results,
            "final_cache_stats": final_stats
        }

    except Exception as e:
        print(f"❌ Cache population failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

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


