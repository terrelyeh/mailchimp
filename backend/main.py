from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os
import logging
import base64
from datetime import datetime, timedelta
from dotenv import load_dotenv
from jose import JWTError, jwt
from mailchimp_service import mailchimp_service
import database

load_dotenv()

# Gemini AI Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "models/gemini-2.0-flash")

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24

security = HTTPBearer(auto_error=False)


# Pydantic models for authentication
class LoginRequest(BaseModel):
    email: str
    password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class CreateUserRequest(BaseModel):
    email: str
    role: str = 'viewer'
    display_name: Optional[str] = None

class UpdateUserRoleRequest(BaseModel):
    role: str

class UpdateProfileRequest(BaseModel):
    display_name: Optional[str] = None


# Pydantic models for share link API
class CreateShareLinkRequest(BaseModel):
    filter_state: Dict[str, Any]
    password: Optional[str] = None
    expires_days: Optional[int] = None  # None = never expires

class VerifyPasswordRequest(BaseModel):
    password: str

# Pydantic models for excluded audiences
class ExcludedAudienceItem(BaseModel):
    audience_id: str
    audience_name: Optional[str] = None
    region: Optional[str] = None

class SetExcludedAudiencesRequest(BaseModel):
    audiences: list[ExcludedAudienceItem]

# Pydantic models for AI analysis
class AIAnalysisContext(BaseModel):
    view: str  # 'overview' or 'region-detail'
    region: Optional[str] = None
    timeRange: str
    audience: Optional[str] = None

class AIAnalysisRequest(BaseModel):
    image: str  # base64 encoded image
    context: AIAnalysisContext

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Mailchimp Dashboard API")

# CORS configuration - allow specific origins or all in development
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# JWT Helper Functions
# ============================================

def create_access_token(user_id: str, email: str, role: str) -> str:
    """Create JWT access token"""
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": expire
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> Optional[Dict]:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[Dict]:
    """Dependency to get current user from token"""
    if not credentials:
        return None

    payload = verify_token(credentials.credentials)
    if not payload:
        return None

    user = database.get_user_by_id(payload.get("sub"))
    return user


async def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    """Dependency that requires authentication"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = database.get_user_by_id(payload.get("sub"))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


async def require_admin(user: Dict = Depends(require_auth)) -> Dict:
    """Dependency that requires admin role"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ============================================
# Authentication Endpoints
# ============================================

@app.post("/api/auth/login")
def login(request: LoginRequest):
    """
    Login with email and password

    Returns JWT token on success
    """
    user = database.authenticate_user(request.email, request.password)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Create access token
    token = create_access_token(user["id"], user["email"], user["role"])

    return {
        "status": "success",
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "must_change_password": user["must_change_password"]
        }
    }


@app.get("/api/auth/me")
def get_me(user: Dict = Depends(require_auth)):
    """Get current user info"""
    return {
        "status": "success",
        "user": user
    }


@app.post("/api/auth/change-password")
def change_password(request: ChangePasswordRequest, user: Dict = Depends(require_auth)):
    """
    Change current user's password
    """
    result = database.change_password(user["id"], request.old_password, request.new_password)

    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["message"])

    # Generate new token since password changed
    updated_user = database.get_user_by_id(user["id"])
    token = create_access_token(updated_user["id"], updated_user["email"], updated_user["role"])

    return {
        "status": "success",
        "message": "Password changed successfully",
        "token": token
    }


@app.put("/api/auth/profile")
def update_profile(request: UpdateProfileRequest, user: Dict = Depends(require_auth)):
    """
    Update current user's profile (display_name)
    """
    result = database.update_user_profile(user["id"], request.display_name)

    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["message"])

    # Get updated user info
    updated_user = database.get_user_by_id(user["id"])

    return {
        "status": "success",
        "user": updated_user
    }


# ============================================
# User Management Endpoints (Admin only)
# ============================================

@app.get("/api/users")
def list_users(user: Dict = Depends(require_admin)):
    """List all users (admin only)"""
    users = database.list_users()
    return {
        "status": "success",
        "count": len(users),
        "users": users
    }


@app.post("/api/users")
def create_user(request: CreateUserRequest, user: Dict = Depends(require_admin)):
    """
    Create a new user (admin only)

    Returns temporary password to share with the user
    """
    result = database.create_user(request.email, request.role, request.display_name)

    if result.get("error"):
        if result["error"] == "email_exists":
            raise HTTPException(status_code=409, detail=result["message"])
        raise HTTPException(status_code=400, detail=result["message"])

    return {
        "status": "success",
        "user": {
            "id": result["id"],
            "email": result["email"],
            "display_name": result["display_name"],
            "role": result["role"]
        },
        "temp_password": result["temp_password"],
        "message": "User created. Share the temporary password with the user."
    }


@app.put("/api/users/{user_id}/role")
def update_user_role(user_id: str, request: UpdateUserRoleRequest, admin: Dict = Depends(require_admin)):
    """Update a user's role (admin only)"""
    result = database.update_user_role(user_id, request.role, admin["id"])

    if result.get("error"):
        if result["error"] == "not_found":
            raise HTTPException(status_code=404, detail=result["message"])
        raise HTTPException(status_code=400, detail=result["message"])

    return {
        "status": "success",
        "email": result["email"],
        "new_role": result["new_role"]
    }


@app.delete("/api/users/{user_id}")
def delete_user(user_id: str, admin: Dict = Depends(require_admin)):
    """Delete a user (admin only)"""
    result = database.delete_user(user_id, admin["id"])

    if result.get("error"):
        if result["error"] == "not_found":
            raise HTTPException(status_code=404, detail=result["message"])
        raise HTTPException(status_code=400, detail=result["message"])

    return {
        "status": "success",
        "message": "User deleted"
    }


@app.post("/api/users/{user_id}/reset-password")
def reset_user_password(user_id: str, admin: Dict = Depends(require_admin)):
    """
    Reset a user's password (admin only)

    Returns new temporary password
    """
    result = database.reset_user_password(user_id, admin["id"])

    if result.get("error"):
        if result["error"] == "not_found":
            raise HTTPException(status_code=404, detail=result["message"])
        raise HTTPException(status_code=400, detail=result["message"])

    return {
        "status": "success",
        "email": result["email"],
        "temp_password": result["temp_password"],
        "message": "Password reset. Share the new temporary password with the user."
    }


# ============================================
# General Endpoints
# ============================================

@app.get("/")
def read_root():
    return {"message": "Mailchimp Dashboard API is running"}

@app.get("/health")
def health_check():
    """Health check endpoint for Zeabur and monitoring"""
    return {
        "status": "healthy",
        "service": "mailchimp-dashboard-api",
        "regions": mailchimp_service.REGIONS
    }

@app.get("/api/dashboard")
def get_dashboard_data(days: int = 30, region: str = None, force_refresh: bool = False):
    """
    Get dashboard stats for all regions or a specific region.
    Parameters:
    - days: 7, 30, or 90 (default: 30)
    - region: region code (e.g., 'US', 'INDIA', 'APAC', 'JP'), or None for all regions
    - force_refresh: true to fetch from Mailchimp and update DB
    """
    logger.info(f"Dashboard API called: days={days}, region={region}, force_refresh={force_refresh}")

    if force_refresh:
        logger.info("Force refresh mode - fetching from MailChimp API")
        try:
            if region:
                # Single region
                logger.info(f"Fetching data for region: {region}")
                data = mailchimp_service.get_dashboard_data(days=days, region=region)
                logger.info(f"Fetched {len(data) if data else 0} campaigns for {region}")

                database.upsert_campaigns(data, region=region)
                logger.info(f"Saved {len(data) if data else 0} campaigns to database for {region}")

                return {"source": "mailchimp", "region": region, "data": data}
            else:
                # All regions
                logger.info(f"Fetching data for all regions: {mailchimp_service.REGIONS}")
                all_data = mailchimp_service.get_dashboard_data(days=days)

                for reg, campaigns in all_data.items():
                    database.upsert_campaigns(campaigns, region=reg)
                    logger.info(f"Saved {len(campaigns)} campaigns for {reg}")

                return {"source": "mailchimp", "data": all_data}
        except Exception as e:
            logger.error(f"Error during force refresh: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=str(e))
    else:
        # Return cache
        logger.debug("Returning from cache")
        if region:
            data = database.get_cached_campaigns(days=days, region=region)

            # Auto-refresh if cache is empty
            if not data:
                logger.info(f"Cache empty for region {region}, forcing refresh")
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
                logger.info(f"Cache has only {total_campaigns} campaigns, forcing refresh")
                return get_dashboard_data(days=days, region=region, force_refresh=True)

            return {"source": "database", "data": all_data}

@app.get("/api/regions")
def get_regions():
    """Get list of available regions dynamically detected from environment variables"""
    return {
        "regions": mailchimp_service.REGIONS,
        "regions_with_names": mailchimp_service.get_regions_with_names()
    }

@app.post("/api/sync")
def trigger_sync(background_tasks: BackgroundTasks, days: int = 30):
    """Background task to sync data for all regions"""
    def sync():
        logger.info("Starting background sync for all regions")
        all_data = mailchimp_service.get_dashboard_data(days=days)
        for region, campaigns in all_data.items():
            database.upsert_campaigns(campaigns, region=region)
        logger.info("Sync complete")

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
    logger.info(f"Manual cache population triggered for {days} days")

    try:
        results = {}

        for region in mailchimp_service.REGIONS:
            logger.info(f"Processing region: {region}")

            try:
                # Fetch data
                client = mailchimp_service.get_client(region)
                if not client:
                    logger.warning(f"No client found for {region}")
                    results[region] = {
                        "status": "error",
                        "message": "No client configured"
                    }
                    continue

                data = client.get_dashboard_data(days=days)
                logger.info(f"Fetched {len(data)} campaigns for {region}")

                # Save to database
                if data:
                    database.upsert_campaigns(data, region=region)

                    results[region] = {
                        "status": "success",
                        "campaigns_fetched": len(data)
                    }
                else:
                    results[region] = {
                        "status": "success",
                        "campaigns_fetched": 0,
                        "message": "No campaigns in the specified period"
                    }

            except Exception as e:
                logger.error(f"Error processing {region}: {e}", exc_info=True)
                results[region] = {
                    "status": "error",
                    "message": str(e)
                }

        # Get final stats
        final_stats = database.get_cache_stats()
        logger.info(f"Cache population complete: {final_stats}")

        return {
            "status": "completed",
            "results": results,
            "final_cache_stats": final_stats
        }

    except Exception as e:
        logger.error(f"Cache population failed: {e}", exc_info=True)
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
        logger.debug(f"Testing region: {reg}")
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


# ============================================
# Share Link API Endpoints
# ============================================

@app.post("/api/share")
def create_share_link(request: CreateShareLinkRequest, user: Dict = Depends(require_auth)):
    """
    Create a new shared link with optional password and expiration (requires login)

    Request body:
    - filter_state: dict of filter settings (days, region, audience, etc.)
    - password: optional password string
    - expires_days: optional expiration in days (1, 7, 30, or None for never)
    """
    try:
        # Validate expires_days if provided
        if request.expires_days is not None and request.expires_days not in [1, 7, 30]:
            raise HTTPException(status_code=400, detail="expires_days must be 1, 7, 30, or null")

        result = database.create_shared_link(
            filter_state=request.filter_state,
            password=request.password,
            expires_days=request.expires_days
        )

        return {
            "status": "success",
            "token": result["token"],
            "has_password": result["has_password"],
            "expires_at": result["expires_at"]
        }
    except Exception as e:
        logger.error(f"Error creating share link: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/share/{token}")
def get_share_link(token: str):
    """
    Get shared link info and filter state (if no password required)

    Returns:
    - If no password: filter_state
    - If password required: has_password=true, need to call verify endpoint
    - If expired: error=expired
    - If not found: 404
    """
    # First get link info
    link_info = database.get_shared_link(token)

    if link_info is None:
        raise HTTPException(status_code=404, detail="Share link not found")

    if link_info.get("error") == "expired":
        return {
            "status": "error",
            "error": "expired",
            "message": "This share link has expired",
            "expired_at": link_info.get("expired_at")
        }

    # If password is required, don't return filter state yet
    if link_info.get("has_password"):
        return {
            "status": "password_required",
            "has_password": True,
            "expires_at": link_info.get("expires_at")
        }

    # No password required, try to access
    result = database.access_shared_link(token)

    if result is None:
        raise HTTPException(status_code=404, detail="Share link not found")

    if result.get("error"):
        return {
            "status": "error",
            "error": result["error"]
        }

    return {
        "status": "success",
        "filter_state": result["filter_state"],
        "expires_at": link_info.get("expires_at"),
        "access_count": link_info.get("access_count", 0) + 1
    }


@app.post("/api/share/{token}/verify")
def verify_share_link_password(token: str, request: VerifyPasswordRequest):
    """
    Verify password for a password-protected shared link

    Request body:
    - password: the password to verify
    """
    result = database.verify_shared_link_password(token, request.password)

    if result is None:
        raise HTTPException(status_code=404, detail="Share link not found")

    if result.get("error") == "expired":
        return {
            "status": "error",
            "error": "expired",
            "message": "This share link has expired"
        }

    if result.get("error") == "invalid_password":
        return {
            "status": "error",
            "error": "invalid_password",
            "message": "Incorrect password"
        }

    return {
        "status": "success",
        "filter_state": result["filter_state"]
    }


@app.delete("/api/share/cleanup")
def cleanup_expired_share_links(user: Dict = Depends(require_admin)):
    """Clean up expired shared links (admin only)"""
    deleted = database.cleanup_expired_links()
    return {
        "status": "success",
        "deleted_count": deleted
    }


@app.get("/api/share")
def list_share_links(user: Dict = Depends(require_admin)):
    """
    List all shared links for management (admin only)

    Returns list of share links with metadata
    """
    links = database.list_shared_links()
    return {
        "status": "success",
        "count": len(links),
        "links": links
    }


@app.delete("/api/share/{token}")
def delete_share_link(token: str, user: Dict = Depends(require_admin)):
    """
    Delete a specific shared link (admin only)

    Returns success or 404 if not found
    """
    deleted = database.delete_shared_link(token)

    if not deleted:
        raise HTTPException(status_code=404, detail="Share link not found")

    return {
        "status": "success",
        "message": f"Share link {token} deleted"
    }


# ============================================
# Excluded Audiences API Endpoints
# ============================================

@app.get("/api/settings/excluded-audiences")
def get_excluded_audiences(user: Dict = Depends(require_auth)):
    """
    Get list of excluded audiences

    Returns list of excluded audience IDs with metadata
    """
    excluded = database.get_excluded_audiences()
    return {
        "status": "success",
        "excluded_audiences": excluded
    }


@app.put("/api/settings/excluded-audiences")
def set_excluded_audiences(request: SetExcludedAudiencesRequest, user: Dict = Depends(require_admin)):
    """
    Set the list of excluded audiences (admin only)

    Replaces the entire exclusion list
    """
    audiences = [aud.dict() for aud in request.audiences]
    result = database.set_excluded_audiences(audiences)

    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["message"])

    return {
        "status": "success",
        "count": result["count"],
        "message": f"{result['count']} audiences excluded"
    }


# ============================================
# AI Dashboard Analysis API Endpoints
# ============================================

@app.post("/api/ai/analyze-dashboard")
async def analyze_dashboard(request: AIAnalysisRequest, user: Dict = Depends(require_admin)):
    """
    Analyze dashboard screenshot using Gemini AI (admin only)

    Accepts a base64 encoded image and context, returns AI-generated insights
    """
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI analysis is not configured. Please set GEMINI_API_KEY environment variable."
        )

    try:
        import google.generativeai as genai

        # Configure Gemini
        genai.configure(api_key=GEMINI_API_KEY)

        # Decode base64 image
        image_data = request.image
        if image_data.startswith('data:'):
            # Remove data URL prefix (e.g., "data:image/jpeg;base64,")
            image_data = image_data.split(',', 1)[1]

        image_bytes = base64.b64decode(image_data)

        # Get AI settings from database
        ai_settings = database.get_ai_settings()

        # Check if AI is enabled
        if not ai_settings.get("enabled", True):
            raise HTTPException(status_code=503, detail="AI analysis is disabled")

        # Get model from settings (fallback to env var)
        model_name = ai_settings.get("model") or GEMINI_MODEL
        model = genai.GenerativeModel(model_name)

        # Build context string
        context = request.context
        view_type = "Overview Dashboard" if context.view == "overview" else f"Region Detail ({context.region})"
        audience_info = context.audience if context.audience else "All Audiences"

        # Get prompts from settings
        system_prompt = ai_settings.get("system_prompt", "")
        output_format = ai_settings.get("output_format", "")

        # Build user prompt with context
        user_prompt = f"""請分析這張 EDM 行銷儀表板截圖，並以繁體中文提供完整的策略分析報告。

**目前檢視的內容：**
- 儀表板類型：{view_type}
- 時間區間：{context.timeRange}
- 受眾篩選：{audience_info}

{output_format}"""

        # Create image part for Gemini
        image_part = {
            "mime_type": "image/png",
            "data": image_bytes
        }

        # Generate response
        response = model.generate_content(
            [system_prompt, image_part, user_prompt],
            generation_config={
                "temperature": 0.7,
                "top_p": 0.95,
                "max_output_tokens": 8192,
            }
        )

        # Parse the response
        analysis_text = response.text

        logger.info(f"AI analysis completed for user {user.get('email')}")

        return {
            "status": "success",
            "analysis": analysis_text,
            "model": model_name,
            "timestamp": datetime.utcnow().isoformat()
        }

    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Google Generative AI library is not installed"
        )
    except Exception as e:
        logger.error(f"AI analysis error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"AI analysis failed: {str(e)}"
        )


@app.get("/api/ai/status")
def get_ai_status(user: Dict = Depends(require_auth)):
    """
    Check if AI analysis is available
    """
    ai_settings = database.get_ai_settings()
    return {
        "status": "success",
        "ai_enabled": bool(GEMINI_API_KEY) and ai_settings.get("enabled", True),
        "model": ai_settings.get("model", GEMINI_MODEL) if GEMINI_API_KEY else None
    }


@app.get("/api/ai/settings")
def get_ai_settings(user: Dict = Depends(require_admin)):
    """
    Get AI settings (admin only)
    """
    settings = database.get_ai_settings()
    return {
        "status": "success",
        "settings": settings,
        "api_key_configured": bool(GEMINI_API_KEY)
    }


@app.put("/api/ai/settings")
def update_ai_settings(
    settings: Dict[str, Any],
    user: Dict = Depends(require_admin)
):
    """
    Update AI settings (admin only)
    """
    # Validate settings
    allowed_keys = {"enabled", "model", "system_prompt", "output_format"}
    filtered_settings = {k: v for k, v in settings.items() if k in allowed_keys}

    if not filtered_settings:
        raise HTTPException(status_code=400, detail="No valid settings provided")

    result = database.update_ai_settings(filtered_settings)
    return result


@app.post("/api/ai/settings/reset")
def reset_ai_settings(user: Dict = Depends(require_admin)):
    """
    Reset AI settings to defaults (admin only)
    """
    result = database.reset_ai_settings()
    return result
