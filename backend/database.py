import json
import logging
import re
import secrets
import hashlib
from datetime import datetime, timedelta
import os
from passlib.context import CryptContext
from supabase import create_client


def strip_html(text):
    """Strip HTML tags from a string, returning clean text"""
    if not text:
        return ''
    return re.sub(r'<[^>]+>', '', text).strip()


logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Supabase client (REST API — no pooler needed)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) are required."
    )

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def init_db():
    """Initialize database — tables are managed by Supabase migrations.
    Only seeds default admin if no users exist."""
    _init_default_admin()


# ============================================
# Campaign Functions
# ============================================

def upsert_campaigns(campaigns_data, region='US'):
    """Insert or update multiple campaigns with region support."""
    if not campaigns_data:
        return

    rows = []
    for camp in campaigns_data:
        camp['region'] = region
        rows.append({
            'id': camp.get('id'),
            'region': region,
            'title': camp.get('title'),
            'send_time': camp.get('send_time'),
            'data_json': camp,
            'updated_at': datetime.utcnow().isoformat(),
        })

    # Supabase upsert (on_conflict uses the table's unique constraint)
    supabase.table('campaigns').upsert(rows, on_conflict='id,region').execute()


def get_cached_campaigns(days=30, region=None):
    """Retrieve campaigns from DB."""
    cutoff_date = (datetime.utcnow() - timedelta(days=days)).isoformat()

    query = supabase.table('campaigns').select('data_json')

    if region:
        query = query.eq('region', region)

    query = query.gte('send_time', cutoff_date).order('send_time', desc=True).limit(1000)
    response = query.execute()

    results = []
    for row in response.data:
        try:
            camp = row['data_json']
            if isinstance(camp, str):
                camp = json.loads(camp)
            if camp.get('segment_text'):
                camp['segment_text'] = strip_html(camp['segment_text'])
            if not camp.get('segment_label') and camp.get('segment_text'):
                camp['segment_label'] = camp['segment_text']
            results.append(camp)
        except Exception as e:
            logger.warning(f"Failed to parse campaign JSON: {e}")

    logger.info(f"Retrieved {len(results)} campaigns from cache (region={region}, days={days})")
    return results


def clear_cache(region=None):
    """Clear cached campaigns."""
    if region:
        response = supabase.table('campaigns').delete().eq('region', region).execute()
        logger.info(f"Cleared cache for region: {region}")
    else:
        response = supabase.table('campaigns').delete().neq('id', '').execute()
        logger.info("Cleared all cached campaigns")

    return len(response.data)


def get_cache_stats():
    """Get statistics about cached campaigns (via RPC)."""
    response = supabase.rpc('get_cache_stats').execute()
    return response.data or {"total": 0, "by_region": {}}


def get_regions_last_activity():
    """Get the last campaign date for each region (via RPC)."""
    response = supabase.rpc('get_regions_last_activity').execute()
    return response.data or {}


# ============================================
# Shared Links Functions
# ============================================

def generate_token(length=8):
    """Generate a random URL-safe token"""
    return secrets.token_urlsafe(length)[:length]


def hash_password(password):
    """Hash a password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()


def create_shared_link(filter_state, password=None, expires_days=None, name=None):
    """Create a new shared link."""
    # Generate unique token
    token = generate_token()
    while True:
        check = supabase.table('shared_links').select('token').eq('token', token).execute()
        if not check.data:
            break
        token = generate_token()

    password_hash = hash_password(password) if password else None
    expires_at = None
    if expires_days:
        expires_at = (datetime.utcnow() + timedelta(days=expires_days)).isoformat()

    supabase.table('shared_links').insert({
        'token': token,
        'filter_state': filter_state,
        'password_hash': password_hash,
        'expires_at': expires_at,
        'name': name,
    }).execute()

    logger.info(f"Created shared link: {token}, name: {name}, expires: {expires_at}")

    return {
        "token": token,
        "name": name,
        "has_password": bool(password),
        "expires_at": expires_at,
    }


def get_shared_link(token):
    """Get shared link info (without incrementing access count)."""
    response = supabase.table('shared_links').select(
        'token, filter_state, password_hash, expires_at, created_at, access_count'
    ).eq('token', token).execute()

    if not response.data:
        return None

    row = response.data[0]

    # Check expiration
    if row['expires_at']:
        expires_at = datetime.fromisoformat(str(row['expires_at']).replace('Z', '+00:00').replace('+00:00', ''))
        if datetime.utcnow() > expires_at:
            logger.info(f"Shared link {token} has expired")
            return {"error": "expired", "expired_at": str(row['expires_at'])}

    return {
        "token": row['token'],
        "has_password": bool(row['password_hash']),
        "expires_at": str(row['expires_at']) if row['expires_at'] else None,
        "created_at": str(row['created_at']) if row['created_at'] else None,
        "access_count": row['access_count'],
    }


def verify_shared_link_password(token, password):
    """Verify password for a shared link."""
    response = supabase.table('shared_links').select(
        'filter_state, password_hash, expires_at'
    ).eq('token', token).execute()

    if not response.data:
        return None

    row = response.data[0]

    if row['expires_at']:
        expires_at = datetime.fromisoformat(str(row['expires_at']).replace('Z', '+00:00').replace('+00:00', ''))
        if datetime.utcnow() > expires_at:
            return {"error": "expired"}

    if row['password_hash']:
        if hash_password(password) != row['password_hash']:
            return {"error": "invalid_password"}

    # Increment access count
    supabase.table('shared_links').update(
        {'access_count': row.get('access_count', 0) + 1}
    ).eq('token', token).execute()

    filter_state = row['filter_state']
    if isinstance(filter_state, str):
        filter_state = json.loads(filter_state)

    logger.info(f"Shared link {token} accessed successfully")
    return {"filter_state": filter_state}


def access_shared_link(token):
    """Access a shared link without password."""
    response = supabase.table('shared_links').select(
        'filter_state, password_hash, expires_at, access_count'
    ).eq('token', token).execute()

    if not response.data:
        return None

    row = response.data[0]

    if row['expires_at']:
        expires_at = datetime.fromisoformat(str(row['expires_at']).replace('Z', '+00:00').replace('+00:00', ''))
        if datetime.utcnow() > expires_at:
            return {"error": "expired"}

    if row['password_hash']:
        return {"error": "password_required"}

    supabase.table('shared_links').update(
        {'access_count': row.get('access_count', 0) + 1}
    ).eq('token', token).execute()

    filter_state = row['filter_state']
    if isinstance(filter_state, str):
        filter_state = json.loads(filter_state)

    logger.info(f"Shared link {token} accessed successfully (no password)")
    return {"filter_state": filter_state}


def cleanup_expired_links():
    """Remove expired shared links."""
    now = datetime.utcnow().isoformat()
    response = supabase.table('shared_links').delete().not_.is_('expires_at', 'null').lt('expires_at', now).execute()
    deleted = len(response.data)
    if deleted > 0:
        logger.info(f"Cleaned up {deleted} expired shared links")
    return deleted


def list_shared_links():
    """List all shared links for management."""
    response = supabase.table('shared_links').select(
        'token, filter_state, password_hash, expires_at, created_at, access_count, name'
    ).order('created_at', desc=True).execute()

    now = datetime.utcnow()
    results = []

    for row in response.data:
        is_expired = False
        if row['expires_at']:
            try:
                expires_at = datetime.fromisoformat(str(row['expires_at']).replace('Z', '+00:00').replace('+00:00', ''))
                is_expired = now > expires_at
            except Exception:
                pass

        filter_state = row['filter_state']
        if isinstance(filter_state, str):
            try:
                filter_state = json.loads(filter_state)
            except Exception:
                filter_state = {}
        if not isinstance(filter_state, dict):
            filter_state = {}

        results.append({
            "token": row['token'],
            "name": row['name'],
            "has_password": bool(row['password_hash']),
            "expires_at": str(row['expires_at']) if row['expires_at'] else None,
            "is_expired": is_expired,
            "created_at": str(row['created_at']) if row['created_at'] else None,
            "access_count": row['access_count'],
            "filter_summary": {
                "days": filter_state.get('days'),
                "region": filter_state.get('region'),
                "audience": filter_state.get('audience'),
                "view": filter_state.get('view'),
            },
        })

    return results


def delete_shared_link(token):
    """Delete a shared link by token."""
    response = supabase.table('shared_links').delete().eq('token', token).execute()
    deleted = len(response.data) > 0
    if deleted:
        logger.info(f"Deleted shared link: {token}")
    return deleted


# ============================================
# User Authentication Functions
# ============================================

def _init_default_admin():
    """Initialize default admin user if no users exist."""
    response = supabase.table('users').select('id', count='exact').limit(1).execute()
    if response.count == 0:
        admin_email = os.getenv("ADMIN_EMAIL", "engenius.ad@gmail.com")
        admin_password = os.getenv("ADMIN_INITIAL_PASSWORD", "ChangeMe123!")
        admin_name = os.getenv("ADMIN_DISPLAY_NAME", "Admin")

        user_id = secrets.token_urlsafe(16)
        password_hash_val = get_password_hash(admin_password)

        supabase.table('users').insert({
            'id': user_id,
            'email': admin_email,
            'password_hash': password_hash_val,
            'display_name': admin_name,
            'role': 'admin',
            'must_change_password': True,
        }).execute()

        logger.info(f"Created default admin user: {admin_email}")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash (bcrypt has 72 byte limit)."""
    password_bytes = plain_password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
    return pwd_context.verify(password_bytes, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password (bcrypt has 72 byte limit)."""
    password_bytes = password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
    return pwd_context.hash(password_bytes)


def authenticate_user(email: str, password: str):
    """Authenticate user by email and password."""
    response = supabase.table('users').select(
        'id, email, password_hash, display_name, role, must_change_password, created_at, last_login'
    ).eq('email', email.lower()).execute()

    if not response.data:
        return None

    row = response.data[0]

    if not verify_password(password, row['password_hash']):
        return None

    # Update last login time
    supabase.table('users').update(
        {'last_login': datetime.utcnow().isoformat()}
    ).eq('id', row['id']).execute()

    return {
        "id": row['id'],
        "email": row['email'],
        "display_name": row['display_name'],
        "role": row['role'],
        "must_change_password": bool(row['must_change_password']),
        "created_at": str(row['created_at']) if row['created_at'] else None,
        "last_login": str(row['last_login']) if row['last_login'] else None,
    }


def get_user_by_id(user_id: str):
    """Get user by ID."""
    response = supabase.table('users').select(
        'id, email, display_name, role, must_change_password, created_at, last_login'
    ).eq('id', user_id).execute()

    if not response.data:
        return None

    row = response.data[0]
    return {
        "id": row['id'],
        "email": row['email'],
        "display_name": row['display_name'],
        "role": row['role'],
        "must_change_password": bool(row['must_change_password']),
        "created_at": str(row['created_at']) if row['created_at'] else None,
        "last_login": str(row['last_login']) if row['last_login'] else None,
    }


def get_user_by_email(email: str):
    """Get user by email."""
    response = supabase.table('users').select(
        'id, email, role, must_change_password, created_at, last_login'
    ).eq('email', email.lower()).execute()

    if not response.data:
        return None

    row = response.data[0]
    return {
        "id": row['id'],
        "email": row['email'],
        "role": row['role'],
        "must_change_password": bool(row['must_change_password']),
        "created_at": str(row['created_at']) if row['created_at'] else None,
        "last_login": str(row['last_login']) if row['last_login'] else None,
    }


def create_user(email: str, role: str = 'viewer', display_name: str = None):
    """Create a new user with a temporary password."""
    # Check if email already exists
    check = supabase.table('users').select('id').eq('email', email.lower()).execute()
    if check.data:
        return {"error": "email_exists", "message": "Email already registered"}

    if role not in ['admin', 'manager', 'viewer']:
        return {"error": "invalid_role", "message": "Role must be 'admin', 'manager', or 'viewer'"}

    user_id = secrets.token_urlsafe(16)
    temp_password = secrets.token_urlsafe(8)
    password_hash_val = get_password_hash(temp_password)

    if not display_name:
        display_name = email.split('@')[0]

    supabase.table('users').insert({
        'id': user_id,
        'email': email.lower(),
        'password_hash': password_hash_val,
        'display_name': display_name,
        'role': role,
        'must_change_password': True,
    }).execute()

    logger.info(f"Created new user: {email} with role: {role}")

    return {
        "id": user_id,
        "email": email.lower(),
        "display_name": display_name,
        "role": role,
        "temp_password": temp_password,
        "must_change_password": True,
    }


def update_user_role(user_id: str, new_role: str, admin_id: str):
    """Update a user's role."""
    if new_role not in ['admin', 'manager', 'viewer']:
        return {"error": "invalid_role", "message": "Role must be 'admin', 'manager', or 'viewer'"}

    if user_id == admin_id:
        return {"error": "self_modification", "message": "Cannot change your own role"}

    check = supabase.table('users').select('email').eq('id', user_id).execute()
    if not check.data:
        return {"error": "not_found", "message": "User not found"}

    supabase.table('users').update({'role': new_role}).eq('id', user_id).execute()

    logger.info(f"Updated user {user_id} role to {new_role}")
    return {"status": "success", "email": check.data[0]['email'], "new_role": new_role}


def delete_user(user_id: str, admin_id: str):
    """Delete a user."""
    if user_id == admin_id:
        return {"error": "self_deletion", "message": "Cannot delete your own account"}

    check = supabase.table('users').select('role').eq('id', user_id).execute()
    if not check.data:
        return {"error": "not_found", "message": "User not found"}

    user_role = check.data[0]['role']
    if user_role == 'admin':
        admin_check = supabase.table('users').select('id', count='exact').eq('role', 'admin').neq('id', user_id).execute()
        if admin_check.count == 0:
            return {"error": "last_admin", "message": "Cannot delete the last admin user"}

    supabase.table('users').delete().eq('id', user_id).execute()

    logger.info(f"Deleted user {user_id}")
    return {"status": "success"}


def list_users():
    """List all users."""
    response = supabase.table('users').select(
        'id, email, display_name, role, must_change_password, created_at, last_login'
    ).order('created_at', desc=True).execute()

    return [{
        "id": row['id'],
        "email": row['email'],
        "display_name": row['display_name'],
        "role": row['role'],
        "must_change_password": bool(row['must_change_password']),
        "created_at": str(row['created_at']) if row['created_at'] else None,
        "last_login": str(row['last_login']) if row['last_login'] else None,
    } for row in response.data]


def change_password(user_id: str, old_password: str, new_password: str):
    """Change user's password."""
    response = supabase.table('users').select('password_hash').eq('id', user_id).execute()

    if not response.data:
        return {"error": "not_found", "message": "User not found"}

    if not verify_password(old_password, response.data[0]['password_hash']):
        return {"error": "invalid_password", "message": "Current password is incorrect"}

    if len(new_password) < 8:
        return {"error": "weak_password", "message": "Password must be at least 8 characters"}

    new_hash = get_password_hash(new_password)
    supabase.table('users').update({
        'password_hash': new_hash,
        'must_change_password': False,
    }).eq('id', user_id).execute()

    logger.info(f"User {user_id} changed password")
    return {"status": "success"}


def reset_user_password(user_id: str, admin_id: str):
    """Reset a user's password (admin action)."""
    if user_id == admin_id:
        return {"error": "self_reset", "message": "Cannot reset your own password this way. Use change password."}

    check = supabase.table('users').select('email').eq('id', user_id).execute()
    if not check.data:
        return {"error": "not_found", "message": "User not found"}

    temp_password = secrets.token_urlsafe(8)
    password_hash_val = get_password_hash(temp_password)

    supabase.table('users').update({
        'password_hash': password_hash_val,
        'must_change_password': True,
    }).eq('id', user_id).execute()

    logger.info(f"Admin {admin_id} reset password for user {user_id}")

    return {
        "status": "success",
        "email": check.data[0]['email'],
        "temp_password": temp_password,
    }


def update_user_profile(user_id: str, display_name: str = None):
    """Update user's profile (display_name)."""
    check = supabase.table('users').select('id').eq('id', user_id).execute()
    if not check.data:
        return {"error": "not_found", "message": "User not found"}

    if display_name is not None:
        supabase.table('users').update(
            {'display_name': display_name.strip()}
        ).eq('id', user_id).execute()

    logger.info(f"User {user_id} updated their profile")
    return {"status": "success", "display_name": display_name}


# ============================================
# Excluded Audiences Functions
# ============================================

def get_excluded_audiences():
    """Get list of excluded audience dicts."""
    response = supabase.table('excluded_audiences').select(
        'audience_id, audience_name, region, excluded_at'
    ).order('region').order('audience_name').execute()

    return [{
        "audience_id": row['audience_id'],
        "audience_name": row['audience_name'],
        "region": row['region'],
        "excluded_at": str(row['excluded_at']) if row['excluded_at'] else None,
    } for row in response.data]


def get_excluded_audience_ids():
    """Get just the set of excluded audience IDs (for filtering)."""
    response = supabase.table('excluded_audiences').select('audience_id').execute()
    return set(row['audience_id'] for row in response.data)


def set_excluded_audiences(audiences):
    """Set the list of excluded audiences (replaces existing)."""
    # Delete all existing
    supabase.table('excluded_audiences').delete().neq('audience_id', '').execute()

    # Insert new ones
    if audiences:
        rows = [{
            'audience_id': aud['audience_id'],
            'audience_name': aud.get('audience_name', ''),
            'region': aud.get('region', ''),
        } for aud in audiences]
        supabase.table('excluded_audiences').insert(rows).execute()

    logger.info(f"Updated excluded audiences: {len(audiences)} audiences excluded")
    return {"status": "success", "count": len(audiences)}


def is_audience_excluded(audience_id):
    """Check if an audience is excluded."""
    response = supabase.table('excluded_audiences').select('audience_id').eq('audience_id', audience_id).limit(1).execute()
    return len(response.data) > 0


# ============================================
# Activity Logging Functions
# ============================================

def log_activity(user_id: str = None, user_email: str = None, action: str = None, details: dict = None, ip_address: str = None):
    """Log a user activity."""
    if not action:
        return {"error": "no_action", "message": "Action is required"}

    response = supabase.table('activity_logs').insert({
        'user_id': user_id,
        'user_email': user_email,
        'action': action,
        'details': details,
        'ip_address': ip_address,
    }).execute()

    log_id = response.data[0]['id'] if response.data else None
    logger.debug(f"Activity logged: {action} by {user_email or user_id}")
    return {"status": "success", "log_id": log_id}


def get_activity_logs(
    user_id: str = None,
    action: str = None,
    start_date: str = None,
    end_date: str = None,
    limit: int = 100,
    offset: int = 0
):
    """Get activity logs with optional filters."""
    # Count query
    count_query = supabase.table('activity_logs').select('id', count='exact')
    if user_id:
        count_query = count_query.eq('user_id', user_id)
    if action:
        count_query = count_query.eq('action', action)
    if start_date:
        count_query = count_query.gte('timestamp', start_date)
    if end_date:
        count_query = count_query.lte('timestamp', end_date)
    count_response = count_query.execute()
    total = count_response.count or 0

    # Data query
    query = supabase.table('activity_logs').select(
        'id, timestamp, user_id, user_email, action, details, ip_address'
    )
    if user_id:
        query = query.eq('user_id', user_id)
    if action:
        query = query.eq('action', action)
    if start_date:
        query = query.gte('timestamp', start_date)
    if end_date:
        query = query.lte('timestamp', end_date)

    query = query.order('timestamp', desc=True).range(offset, offset + limit - 1)
    response = query.execute()

    logs = []
    for row in response.data:
        details_val = row['details']
        if isinstance(details_val, str):
            try:
                details_val = json.loads(details_val)
            except Exception:
                pass

        logs.append({
            "id": row['id'],
            "timestamp": str(row['timestamp']) if row['timestamp'] else None,
            "user_id": row['user_id'],
            "user_email": row['user_email'],
            "action": row['action'],
            "details": details_val,
            "ip_address": row['ip_address'],
        })

    return {
        "logs": logs,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


def get_activity_summary(days: int = 30):
    """Get summary statistics of activity logs (via RPC)."""
    response = supabase.rpc('get_activity_summary', {'p_days': days}).execute()
    return response.data or {
        "period_days": days,
        "total_actions": 0,
        "by_action": {},
        "by_user": {},
        "recent": [],
    }


def cleanup_old_activity_logs(days: int = 90):
    """Remove activity logs older than specified days."""
    cutoff_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
    response = supabase.table('activity_logs').delete().lt('timestamp', cutoff_date).execute()
    deleted = len(response.data)
    if deleted > 0:
        logger.info(f"Cleaned up {deleted} old activity logs (older than {days} days)")
    return deleted


# ============================================
# Comparison Groups Functions
# ============================================

def search_campaigns(keyword: str, region: str = None, limit: int = 50):
    """Search campaigns by keyword (title or subject_line)."""
    query = supabase.table('campaigns').select('id, region, title, send_time, data_json')

    if region:
        query = query.eq('region', region)

    # PostgREST: search title with ILIKE
    query = query.ilike('title', f'%{keyword}%')
    query = query.order('send_time', desc=True).limit(limit)
    response = query.execute()

    results = []
    for row in response.data:
        try:
            data = row['data_json']
            if isinstance(data, str):
                data = json.loads(data)
            title = row['title'] or ''
            subject_line = data.get('subject_line', '')
            display_title = title if title.strip() else subject_line
            results.append({
                "id": row['id'],
                "region": row['region'],
                "title": display_title,
                "subject_line": subject_line,
                "send_time": str(row['send_time']) if row['send_time'] else None,
                "open_rate": data.get('open_rate'),
                "click_rate": data.get('click_rate'),
                "emails_sent": data.get('emails_sent'),
                "unique_opens": data.get('unique_opens'),
                "unique_clicks": data.get('unique_clicks'),
                "unsubscribed": data.get('unsubscribed'),
                "bounce_rate": data.get('bounce_rate'),
                "audience_name": data.get('audience_name', ''),
                "segment_text": strip_html(data.get('segment_text', '')),
                "segment_member_count": data.get('segment_member_count'),
            })
        except Exception as e:
            logger.warning(f"Failed to parse campaign JSON in search: {e}")

    return results


def create_comparison_group(name: str, description: str = None, created_by: str = None, campaign_items: list = None):
    """Create a new comparison group with campaign items."""
    response = supabase.table('comparison_groups').insert({
        'name': name,
        'description': description,
        'created_by': created_by,
    }).execute()

    group_id = response.data[0]['id']

    if campaign_items:
        rows = [{
            'group_id': group_id,
            'campaign_id': item['campaign_id'],
            'region': item['region'],
        } for item in campaign_items]
        supabase.table('comparison_items').upsert(
            rows, on_conflict='group_id,campaign_id,region'
        ).execute()

    logger.info(f"Created comparison group '{name}' with {len(campaign_items or [])} items")

    return {
        "id": group_id,
        "name": name,
        "description": description,
        "created_by": created_by,
        "item_count": len(campaign_items or []),
    }


def list_comparison_groups():
    """List all comparison groups with item counts (via RPC)."""
    response = supabase.rpc('list_comparison_groups_with_counts').execute()
    data = response.data or []

    if isinstance(data, list):
        return [{
            "id": row['id'],
            "name": row['name'],
            "description": row['description'],
            "created_by": row['created_by'],
            "created_at": str(row['created_at']) if row['created_at'] else None,
            "updated_at": str(row['updated_at']) if row['updated_at'] else None,
            "item_count": row['item_count'],
        } for row in data]
    return []


def get_comparison_group(group_id: int):
    """Get a comparison group with full campaign data (via RPC)."""
    response = supabase.rpc('get_comparison_group_full', {'p_group_id': group_id}).execute()

    if not response.data:
        return None

    group = response.data
    if isinstance(group, list):
        # RPC might return a list with one item
        return None if not group else group[0] if len(group) == 1 else group

    # Process items to add derived fields
    items = group.get('items', [])
    processed_items = []
    for row in items:
        title = row.get('title', '') or ''
        item = {
            "campaign_id": row['campaign_id'],
            "region": row['region'],
            "title": title,
            "subject_line": '',
            "send_time": str(row['send_time']) if row.get('send_time') else None,
        }
        if row.get('data_json'):
            data = row['data_json']
            if isinstance(data, str):
                data = json.loads(data)
            try:
                subject_line = data.get('subject_line', '')
                if not title.strip():
                    item["title"] = subject_line
                item.update({
                    "subject_line": subject_line,
                    "open_rate": data.get('open_rate'),
                    "click_rate": data.get('click_rate'),
                    "emails_sent": data.get('emails_sent'),
                    "unique_opens": data.get('unique_opens'),
                    "unique_clicks": data.get('unique_clicks'),
                    "unsubscribed": data.get('unsubscribed'),
                    "bounce_rate": data.get('bounce_rate'),
                    "audience_name": data.get('audience_name', ''),
                    "segment_text": strip_html(data.get('segment_text', '')),
                    "segment_member_count": data.get('segment_member_count'),
                })
            except Exception as e:
                logger.warning(f"Failed to parse campaign data: {e}")
        processed_items.append(item)

    group['items'] = processed_items
    return group


def delete_comparison_group(group_id: int):
    """Delete a comparison group and its items."""
    supabase.table('comparison_items').delete().eq('group_id', group_id).execute()
    response = supabase.table('comparison_groups').delete().eq('id', group_id).execute()

    deleted = len(response.data) > 0
    if deleted:
        logger.info(f"Deleted comparison group {group_id}")
    return deleted


# Initialize on module load
init_db()
