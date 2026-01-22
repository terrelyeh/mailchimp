import sqlite3
import json
import logging
import secrets
import hashlib
from datetime import datetime, timedelta
import os
from passlib.context import CryptContext

logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 使用環境變數設定資料庫路徑，預設為當前目錄
DATA_DIR = os.getenv("DATA_DIR", ".")
DB_PATH = os.path.join(DATA_DIR, "campaign_cache.db")

# 確保資料目錄存在
if DATA_DIR != ".":
    os.makedirs(DATA_DIR, exist_ok=True)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # Create table if not exists with region support
    c.execute('''
        CREATE TABLE IF NOT EXISTS campaigns (
            id TEXT,
            region TEXT,
            title TEXT,
            send_time TEXT,
            data_json TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id, region)
        )
    ''')
    # Create shared_links table for share link feature
    c.execute('''
        CREATE TABLE IF NOT EXISTS shared_links (
            token TEXT PRIMARY KEY,
            filter_state TEXT,
            password_hash TEXT,
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            access_count INTEGER DEFAULT 0
        )
    ''')
    # Create users table for authentication
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            display_name TEXT,
            role TEXT DEFAULT 'viewer',
            must_change_password INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        )
    ''')

    # Create excluded_audiences table for filtering out test audiences
    c.execute('''
        CREATE TABLE IF NOT EXISTS excluded_audiences (
            audience_id TEXT PRIMARY KEY,
            audience_name TEXT,
            region TEXT,
            excluded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Create activity_logs table for tracking user actions
    c.execute('''
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            user_id TEXT,
            user_email TEXT,
            action TEXT NOT NULL,
            details TEXT,
            ip_address TEXT
        )
    ''')

    # Migration: Add display_name column if it doesn't exist
    c.execute("PRAGMA table_info(users)")
    columns = [col[1] for col in c.fetchall()]
    if 'display_name' not in columns:
        c.execute("ALTER TABLE users ADD COLUMN display_name TEXT")

    # Migration: Add name column to shared_links if it doesn't exist
    c.execute("PRAGMA table_info(shared_links)")
    share_columns = [col[1] for col in c.fetchall()]
    if 'name' not in share_columns:
        c.execute("ALTER TABLE shared_links ADD COLUMN name TEXT")

    conn.commit()
    conn.close()

    # Initialize default admin if no users exist
    _init_default_admin()

def upsert_campaigns(campaigns_data, region='US'):
    """
    Insert or update multiple campaigns with region support.
    campaigns_data: list of dicts (merged info)
    region: one of 'US', 'EU', 'APAC', 'JP'
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    for camp in campaigns_data:
        # Extract fields
        c_id = camp.get('id')
        title = camp.get('title')
        send_time = camp.get('send_time')
        # Add region to the campaign data
        camp['region'] = region
        data_json = json.dumps(camp)

        c.execute('''
            INSERT INTO campaigns (id, region, title, send_time, data_json, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id, region) DO UPDATE SET
                title=excluded.title,
                send_time=excluded.send_time,
                data_json=excluded.data_json,
                updated_at=CURRENT_TIMESTAMP
        ''', (c_id, region, title, send_time, data_json))

    conn.commit()
    conn.close()

def get_cached_campaigns(days=30, region=None):
    """
    Retrieve campaigns from local DB
    region: 'US', 'EU', 'APAC', 'JP', or None for all regions
    days: filter campaigns from the last N days
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Calculate cutoff date
    cutoff_date = (datetime.utcnow() - timedelta(days=days)).isoformat()

    # Fetch campaigns with date and optional region filter
    if region:
        c.execute("""
            SELECT data_json FROM campaigns
            WHERE region = ? AND send_time >= ?
            ORDER BY send_time DESC
            LIMIT 1000
        """, (region, cutoff_date))
    else:
        c.execute("""
            SELECT data_json FROM campaigns
            WHERE send_time >= ?
            ORDER BY send_time DESC
            LIMIT 1000
        """, (cutoff_date,))

    rows = c.fetchall()

    results = []
    for row in rows:
        try:
            camp = json.loads(row['data_json'])
            results.append(camp)
        except Exception as e:
            logger.warning(f"Failed to parse campaign JSON: {e}")

    conn.close()
    logger.info(f"Retrieved {len(results)} campaigns from cache (region={region}, days={days})")
    return results

def clear_cache(region=None):
    """
    Clear cached campaigns
    region: specific region to clear, or None to clear all regions
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    if region:
        c.execute("DELETE FROM campaigns WHERE region = ?", (region,))
        logger.info(f"Cleared cache for region: {region}")
    else:
        c.execute("DELETE FROM campaigns")
        logger.info("Cleared all cached campaigns")

    conn.commit()
    deleted_count = c.rowcount
    conn.close()
    return deleted_count

def get_cache_stats():
    """Get statistics about cached campaigns"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Total campaigns
    c.execute("SELECT COUNT(*) FROM campaigns")
    total = c.fetchone()[0]

    # Campaigns by region
    c.execute("SELECT region, COUNT(*) as count FROM campaigns GROUP BY region ORDER BY count DESC")
    by_region = dict(c.fetchall())

    conn.close()
    return {
        "total": total,
        "by_region": by_region
    }

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
    """
    Create a new shared link

    Args:
        filter_state: dict of filter settings
        password: optional password string
        expires_days: optional expiration in days (None = never expires)
        name: optional descriptive name for the link

    Returns:
        dict with token and link info
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Generate unique token
    token = generate_token()

    # Ensure token is unique
    while True:
        c.execute("SELECT 1 FROM shared_links WHERE token = ?", (token,))
        if not c.fetchone():
            break
        token = generate_token()

    # Hash password if provided
    password_hash = hash_password(password) if password else None

    # Calculate expiration time
    expires_at = None
    if expires_days:
        expires_at = (datetime.utcnow() + timedelta(days=expires_days)).isoformat()

    # Store filter state as JSON
    filter_json = json.dumps(filter_state)

    c.execute('''
        INSERT INTO shared_links (token, filter_state, password_hash, expires_at, name)
        VALUES (?, ?, ?, ?, ?)
    ''', (token, filter_json, password_hash, expires_at, name))

    conn.commit()
    conn.close()

    logger.info(f"Created shared link: {token}, name: {name}, expires: {expires_at}, has_password: {bool(password)}")

    return {
        "token": token,
        "name": name,
        "has_password": bool(password),
        "expires_at": expires_at
    }

def get_shared_link(token):
    """
    Get shared link info (without incrementing access count)

    Returns:
        dict with link info or None if not found/expired
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute('''
        SELECT token, filter_state, password_hash, expires_at, created_at, access_count
        FROM shared_links WHERE token = ?
    ''', (token,))

    row = c.fetchone()
    conn.close()

    if not row:
        return None

    # Check expiration
    if row['expires_at']:
        expires_at = datetime.fromisoformat(row['expires_at'])
        if datetime.utcnow() > expires_at:
            logger.info(f"Shared link {token} has expired")
            return {"error": "expired", "expired_at": row['expires_at']}

    return {
        "token": row['token'],
        "has_password": bool(row['password_hash']),
        "expires_at": row['expires_at'],
        "created_at": row['created_at'],
        "access_count": row['access_count']
    }

def verify_shared_link_password(token, password):
    """
    Verify password for a shared link

    Returns:
        filter_state dict if password is correct, None otherwise
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute('''
        SELECT filter_state, password_hash, expires_at
        FROM shared_links WHERE token = ?
    ''', (token,))

    row = c.fetchone()

    if not row:
        conn.close()
        return None

    # Check expiration
    if row['expires_at']:
        expires_at = datetime.fromisoformat(row['expires_at'])
        if datetime.utcnow() > expires_at:
            conn.close()
            return {"error": "expired"}

    # Verify password
    if row['password_hash']:
        if hash_password(password) != row['password_hash']:
            conn.close()
            return {"error": "invalid_password"}

    # Increment access count
    c.execute('''
        UPDATE shared_links SET access_count = access_count + 1 WHERE token = ?
    ''', (token,))
    conn.commit()

    filter_state = json.loads(row['filter_state'])
    conn.close()

    logger.info(f"Shared link {token} accessed successfully")
    return {"filter_state": filter_state}

def access_shared_link(token):
    """
    Access a shared link without password (for links without password protection)

    Returns:
        filter_state dict if no password required, error otherwise
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute('''
        SELECT filter_state, password_hash, expires_at
        FROM shared_links WHERE token = ?
    ''', (token,))

    row = c.fetchone()

    if not row:
        conn.close()
        return None

    # Check expiration
    if row['expires_at']:
        expires_at = datetime.fromisoformat(row['expires_at'])
        if datetime.utcnow() > expires_at:
            conn.close()
            return {"error": "expired"}

    # Check if password is required
    if row['password_hash']:
        conn.close()
        return {"error": "password_required"}

    # Increment access count
    c.execute('''
        UPDATE shared_links SET access_count = access_count + 1 WHERE token = ?
    ''', (token,))
    conn.commit()

    filter_state = json.loads(row['filter_state'])
    conn.close()

    logger.info(f"Shared link {token} accessed successfully (no password)")
    return {"filter_state": filter_state}

def cleanup_expired_links():
    """Remove expired shared links"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    now = datetime.utcnow().isoformat()
    c.execute('''
        DELETE FROM shared_links
        WHERE expires_at IS NOT NULL AND expires_at < ?
    ''', (now,))

    deleted = c.rowcount
    conn.commit()
    conn.close()

    if deleted > 0:
        logger.info(f"Cleaned up {deleted} expired shared links")

    return deleted

def list_shared_links():
    """
    List all shared links for management

    Returns:
        list of shared link info dicts
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute('''
        SELECT token, filter_state, password_hash, expires_at, created_at, access_count, name
        FROM shared_links
        ORDER BY created_at DESC
    ''')

    rows = c.fetchall()
    conn.close()

    now = datetime.utcnow()
    results = []

    for row in rows:
        # Check if expired
        is_expired = False
        if row['expires_at']:
            expires_at = datetime.fromisoformat(row['expires_at'])
            is_expired = now > expires_at

        # Parse filter state to show summary
        try:
            filter_state = json.loads(row['filter_state'])
        except:
            filter_state = {}

        results.append({
            "token": row['token'],
            "name": row['name'],
            "has_password": bool(row['password_hash']),
            "expires_at": row['expires_at'],
            "is_expired": is_expired,
            "created_at": row['created_at'],
            "access_count": row['access_count'],
            "filter_summary": {
                "days": filter_state.get('days'),
                "region": filter_state.get('region'),
                "audience": filter_state.get('audience'),
                "view": filter_state.get('view')
            }
        })

    return results

def delete_shared_link(token):
    """
    Delete a shared link by token

    Returns:
        True if deleted, False if not found
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute('DELETE FROM shared_links WHERE token = ?', (token,))

    deleted = c.rowcount > 0
    conn.commit()
    conn.close()

    if deleted:
        logger.info(f"Deleted shared link: {token}")

    return deleted

# ============================================
# User Authentication Functions
# ============================================

def _init_default_admin():
    """Initialize default admin user if no users exist"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Check if any users exist
    c.execute("SELECT COUNT(*) FROM users")
    count = c.fetchone()[0]

    if count == 0:
        # Get admin credentials from environment
        admin_email = os.getenv("ADMIN_EMAIL", "engenius.ad@gmail.com")
        admin_password = os.getenv("ADMIN_INITIAL_PASSWORD", "ChangeMe123!")
        admin_name = os.getenv("ADMIN_DISPLAY_NAME", "Admin")

        # Create default admin
        user_id = secrets.token_urlsafe(16)
        password_hash = get_password_hash(admin_password)

        c.execute('''
            INSERT INTO users (id, email, password_hash, display_name, role, must_change_password)
            VALUES (?, ?, ?, ?, 'admin', 1)
        ''', (user_id, admin_email, password_hash, admin_name))

        conn.commit()
        logger.info(f"Created default admin user: {admin_email}")

    conn.close()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash (bcrypt has 72 byte limit)"""
    # Truncate to 72 bytes to match hashing
    password_bytes = plain_password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
    return pwd_context.verify(password_bytes, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password (bcrypt has 72 byte limit)"""
    # Truncate to 72 bytes to avoid bcrypt limit
    password_bytes = password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
    return pwd_context.hash(password_bytes)


def authenticate_user(email: str, password: str):
    """
    Authenticate user by email and password

    Returns:
        User dict if authentication successful, None otherwise
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute('''
        SELECT id, email, password_hash, display_name, role, must_change_password, created_at, last_login
        FROM users WHERE email = ?
    ''', (email.lower(),))

    row = c.fetchone()

    if not row:
        conn.close()
        return None

    if not verify_password(password, row['password_hash']):
        conn.close()
        return None

    # Update last login time
    c.execute('''
        UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
    ''', (row['id'],))
    conn.commit()
    conn.close()

    return {
        "id": row['id'],
        "email": row['email'],
        "display_name": row['display_name'],
        "role": row['role'],
        "must_change_password": bool(row['must_change_password']),
        "created_at": row['created_at'],
        "last_login": row['last_login']
    }


def get_user_by_id(user_id: str):
    """Get user by ID"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute('''
        SELECT id, email, display_name, role, must_change_password, created_at, last_login
        FROM users WHERE id = ?
    ''', (user_id,))

    row = c.fetchone()
    conn.close()

    if not row:
        return None

    return {
        "id": row['id'],
        "email": row['email'],
        "display_name": row['display_name'],
        "role": row['role'],
        "must_change_password": bool(row['must_change_password']),
        "created_at": row['created_at'],
        "last_login": row['last_login']
    }


def get_user_by_email(email: str):
    """Get user by email"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute('''
        SELECT id, email, role, must_change_password, created_at, last_login
        FROM users WHERE email = ?
    ''', (email.lower(),))

    row = c.fetchone()
    conn.close()

    if not row:
        return None

    return {
        "id": row['id'],
        "email": row['email'],
        "role": row['role'],
        "must_change_password": bool(row['must_change_password']),
        "created_at": row['created_at'],
        "last_login": row['last_login']
    }


def create_user(email: str, role: str = 'viewer', display_name: str = None):
    """
    Create a new user with a temporary password

    Returns:
        dict with user info and temporary password
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Check if email already exists
    c.execute("SELECT 1 FROM users WHERE email = ?", (email.lower(),))
    if c.fetchone():
        conn.close()
        return {"error": "email_exists", "message": "Email already registered"}

    # Validate role
    if role not in ['admin', 'viewer']:
        conn.close()
        return {"error": "invalid_role", "message": "Role must be 'admin' or 'viewer'"}

    # Generate user ID and temporary password
    user_id = secrets.token_urlsafe(16)
    temp_password = secrets.token_urlsafe(8)
    password_hash = get_password_hash(temp_password)

    # Use email prefix as default display name if not provided
    if not display_name:
        display_name = email.split('@')[0]

    c.execute('''
        INSERT INTO users (id, email, password_hash, display_name, role, must_change_password)
        VALUES (?, ?, ?, ?, ?, 1)
    ''', (user_id, email.lower(), password_hash, display_name, role))

    conn.commit()
    conn.close()

    logger.info(f"Created new user: {email} with role: {role}")

    return {
        "id": user_id,
        "email": email.lower(),
        "display_name": display_name,
        "role": role,
        "temp_password": temp_password,
        "must_change_password": True
    }


def update_user_role(user_id: str, new_role: str, admin_id: str):
    """
    Update a user's role

    Args:
        user_id: ID of user to update
        new_role: New role ('admin' or 'viewer')
        admin_id: ID of admin making the change

    Returns:
        dict with result
    """
    if new_role not in ['admin', 'viewer']:
        return {"error": "invalid_role", "message": "Role must be 'admin' or 'viewer'"}

    # Cannot change own role
    if user_id == admin_id:
        return {"error": "self_modification", "message": "Cannot change your own role"}

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Check if user exists
    c.execute("SELECT email FROM users WHERE id = ?", (user_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        return {"error": "not_found", "message": "User not found"}

    c.execute('''
        UPDATE users SET role = ? WHERE id = ?
    ''', (new_role, user_id))

    conn.commit()
    conn.close()

    logger.info(f"Updated user {user_id} role to {new_role}")

    return {"status": "success", "email": row[0], "new_role": new_role}


def delete_user(user_id: str, admin_id: str):
    """
    Delete a user

    Args:
        user_id: ID of user to delete
        admin_id: ID of admin making the deletion

    Returns:
        dict with result
    """
    # Cannot delete self
    if user_id == admin_id:
        return {"error": "self_deletion", "message": "Cannot delete your own account"}

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Check if this is the last admin
    c.execute("SELECT role FROM users WHERE id = ?", (user_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        return {"error": "not_found", "message": "User not found"}

    user_role = row[0]
    if user_role == 'admin':
        # Count remaining admins
        c.execute("SELECT COUNT(*) FROM users WHERE role = 'admin' AND id != ?", (user_id,))
        admin_count = c.fetchone()[0]
        if admin_count == 0:
            conn.close()
            return {"error": "last_admin", "message": "Cannot delete the last admin user"}

    c.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()

    logger.info(f"Deleted user {user_id}")

    return {"status": "success"}


def list_users():
    """
    List all users

    Returns:
        List of user dicts
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute('''
        SELECT id, email, display_name, role, must_change_password, created_at, last_login
        FROM users
        ORDER BY created_at DESC
    ''')

    rows = c.fetchall()
    conn.close()

    return [{
        "id": row['id'],
        "email": row['email'],
        "display_name": row['display_name'],
        "role": row['role'],
        "must_change_password": bool(row['must_change_password']),
        "created_at": row['created_at'],
        "last_login": row['last_login']
    } for row in rows]


def change_password(user_id: str, old_password: str, new_password: str):
    """
    Change user's password

    Returns:
        dict with result
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute("SELECT password_hash FROM users WHERE id = ?", (user_id,))
    row = c.fetchone()

    if not row:
        conn.close()
        return {"error": "not_found", "message": "User not found"}

    # Verify old password
    if not verify_password(old_password, row['password_hash']):
        conn.close()
        return {"error": "invalid_password", "message": "Current password is incorrect"}

    # Validate new password
    if len(new_password) < 8:
        conn.close()
        return {"error": "weak_password", "message": "Password must be at least 8 characters"}

    # Update password
    new_hash = get_password_hash(new_password)
    c.execute('''
        UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?
    ''', (new_hash, user_id))

    conn.commit()
    conn.close()

    logger.info(f"User {user_id} changed password")

    return {"status": "success"}


def reset_user_password(user_id: str, admin_id: str):
    """
    Reset a user's password (admin action)

    Returns:
        dict with new temporary password
    """
    if user_id == admin_id:
        return {"error": "self_reset", "message": "Cannot reset your own password this way. Use change password."}

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Check if user exists
    c.execute("SELECT email FROM users WHERE id = ?", (user_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        return {"error": "not_found", "message": "User not found"}

    # Generate new temporary password
    temp_password = secrets.token_urlsafe(8)
    password_hash = get_password_hash(temp_password)

    c.execute('''
        UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?
    ''', (password_hash, user_id))

    conn.commit()
    conn.close()

    logger.info(f"Admin {admin_id} reset password for user {user_id}")

    return {
        "status": "success",
        "email": row[0],
        "temp_password": temp_password
    }


def update_user_profile(user_id: str, display_name: str = None):
    """
    Update user's profile (display_name)

    Returns:
        dict with result
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Check if user exists
    c.execute("SELECT id FROM users WHERE id = ?", (user_id,))
    if not c.fetchone():
        conn.close()
        return {"error": "not_found", "message": "User not found"}

    if display_name is not None:
        c.execute('''
            UPDATE users SET display_name = ? WHERE id = ?
        ''', (display_name.strip(), user_id))

    conn.commit()
    conn.close()

    logger.info(f"User {user_id} updated their profile")

    return {"status": "success", "display_name": display_name}


# ============================================
# Excluded Audiences Functions
# ============================================

def get_excluded_audiences():
    """
    Get list of excluded audience IDs

    Returns:
        List of excluded audience dicts
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute('''
        SELECT audience_id, audience_name, region, excluded_at
        FROM excluded_audiences
        ORDER BY region, audience_name
    ''')

    rows = c.fetchall()
    conn.close()

    return [{
        "audience_id": row['audience_id'],
        "audience_name": row['audience_name'],
        "region": row['region'],
        "excluded_at": row['excluded_at']
    } for row in rows]


def get_excluded_audience_ids():
    """
    Get just the list of excluded audience IDs (for filtering)

    Returns:
        Set of excluded audience IDs
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute('SELECT audience_id FROM excluded_audiences')
    rows = c.fetchall()
    conn.close()

    return set(row[0] for row in rows)


def set_excluded_audiences(audiences):
    """
    Set the list of excluded audiences (replaces existing)

    Args:
        audiences: List of dicts with audience_id, audience_name, region

    Returns:
        dict with result
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Clear existing exclusions
    c.execute('DELETE FROM excluded_audiences')

    # Insert new exclusions
    for aud in audiences:
        c.execute('''
            INSERT INTO excluded_audiences (audience_id, audience_name, region)
            VALUES (?, ?, ?)
        ''', (aud['audience_id'], aud.get('audience_name', ''), aud.get('region', '')))

    conn.commit()
    conn.close()

    logger.info(f"Updated excluded audiences: {len(audiences)} audiences excluded")

    return {"status": "success", "count": len(audiences)}


def is_audience_excluded(audience_id):
    """
    Check if an audience is excluded

    Args:
        audience_id: The audience ID to check

    Returns:
        True if excluded, False otherwise
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute('SELECT 1 FROM excluded_audiences WHERE audience_id = ?', (audience_id,))
    result = c.fetchone() is not None
    conn.close()

    return result


# ============================================
# AI Settings Functions
# ============================================

DEFAULT_AI_SETTINGS = {
    "enabled": True,
    "model": "models/gemini-2.0-flash",
    "system_prompt": """你是一位「實戰派行銷策略顧問」，專注於協助中小企業（SME）透過數據改善業績。
你具備 10+ 年的 Email Marketing 分析經驗，擅長解讀行銷儀表板並提供可落地執行的建議。

你的分析風格：
- 數據驅動且具體（引用實際數字）
- 可執行且實用
- 按影響力排序優先順序
- 為行銷經理撰寫，而非技術人員""",
    "output_format": """請嚴格依照以下結構輸出分析報告：

## 1️⃣ 現況診斷 (The Reality Check)
分析目前發生了什麼事：

### ✅ 亮點 (The Good)
數據中值得肯定的 2-3 個部分，請引用具體數字。

### ⚠️ 痛點 (The Bad)
流量在哪個環節流失？（例如：開信率過低、點擊率不足、轉換瓶頸）

### 🚨 風險 (The Ugly)
是否有長期隱憂？（例如：名單品質惡化、退訂率上升、網域信譽風險）

---

## 2️⃣ 核心洞察與理由 (The "Why" & Strategy)
解釋為什麼會這樣，以及應該怎麼做：

### 🔍 深度歸因
數據不佳的根本原因是什麼？（用戶疲乏？內容價值不足？發送頻率問題？市場因素？）

### 💡 策略邏輯
建議背後的商業思考（例如：為什麼要先清洗名單而不是先改設計？）

---

## 3️⃣ 本週執行清單 (Action Items)
將建議整理成具體的 To-Do List：

### 📣 行銷/小編 (Marketing)
- [ ] (立即) 需調整的設定
- [ ] (測試) 下一檔活動的 A/B Test 項目

### 💼 業務/銷售 (Sales)
- [ ] (跟進) 如何利用這份報表跟進客戶？

### ⚙️ 技術/自動化 (Auto/Dev)
- [ ] (流程) 需要串接或自動處理的資料任務

---

## 4️⃣ 自動化建議 (Automation Tips)
若問題適合自動化解決，請提供 GAS 或 n8n 的簡要建議（觸發條件 → 執行動作的流程描述）。

---

請確保分析具體、可執行，並優先處理影響最大的問題。"""
}


def _ensure_settings_table():
    """Ensure settings table exists"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()


def get_ai_settings():
    """
    Get AI settings from database

    Returns:
        dict with AI settings
    """
    _ensure_settings_table()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute("SELECT value FROM settings WHERE key = 'ai_settings'")
    row = c.fetchone()
    conn.close()

    if row:
        try:
            return json.loads(row['value'])
        except:
            pass

    return DEFAULT_AI_SETTINGS.copy()


def update_ai_settings(settings):
    """
    Update AI settings in database

    Args:
        settings: dict with AI settings (enabled, model, system_prompt, output_format)

    Returns:
        dict with result
    """
    _ensure_settings_table()

    # Merge with defaults to ensure all keys exist
    current = get_ai_settings()
    current.update(settings)

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute('''
        INSERT INTO settings (key, value, updated_at)
        VALUES ('ai_settings', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = CURRENT_TIMESTAMP
    ''', (json.dumps(current),))

    conn.commit()
    conn.close()

    logger.info("Updated AI settings")

    return {"status": "success", "settings": current}


def reset_ai_settings():
    """
    Reset AI settings to defaults

    Returns:
        dict with default settings
    """
    _ensure_settings_table()

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute('''
        INSERT INTO settings (key, value, updated_at)
        VALUES ('ai_settings', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = CURRENT_TIMESTAMP
    ''', (json.dumps(DEFAULT_AI_SETTINGS),))

    conn.commit()
    conn.close()

    logger.info("Reset AI settings to defaults")

    return {"status": "success", "settings": DEFAULT_AI_SETTINGS}


# ============================================
# Activity Logging Functions
# ============================================

def log_activity(user_id: str = None, user_email: str = None, action: str = None, details: dict = None, ip_address: str = None):
    """
    Log a user activity

    Args:
        user_id: ID of the user performing the action
        user_email: Email of the user (for easier querying)
        action: Type of action (e.g., 'login', 'view_dashboard', 'run_ai_analysis')
        details: Additional details as a dict (will be stored as JSON)
        ip_address: IP address of the user

    Returns:
        dict with log entry ID
    """
    if not action:
        return {"error": "no_action", "message": "Action is required"}

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    details_json = json.dumps(details) if details else None

    c.execute('''
        INSERT INTO activity_logs (user_id, user_email, action, details, ip_address)
        VALUES (?, ?, ?, ?, ?)
    ''', (user_id, user_email, action, details_json, ip_address))

    log_id = c.lastrowid
    conn.commit()
    conn.close()

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
    """
    Get activity logs with optional filters

    Args:
        user_id: Filter by user ID
        action: Filter by action type
        start_date: Filter by start date (ISO format)
        end_date: Filter by end date (ISO format)
        limit: Maximum number of records to return
        offset: Number of records to skip

    Returns:
        dict with logs and total count
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Build query with filters
    where_clauses = []
    params = []

    if user_id:
        where_clauses.append("user_id = ?")
        params.append(user_id)

    if action:
        where_clauses.append("action = ?")
        params.append(action)

    if start_date:
        where_clauses.append("timestamp >= ?")
        params.append(start_date)

    if end_date:
        where_clauses.append("timestamp <= ?")
        params.append(end_date)

    where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

    # Get total count
    c.execute(f"SELECT COUNT(*) FROM activity_logs WHERE {where_sql}", params)
    total = c.fetchone()[0]

    # Get logs
    c.execute(f'''
        SELECT id, timestamp, user_id, user_email, action, details, ip_address
        FROM activity_logs
        WHERE {where_sql}
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
    ''', params + [limit, offset])

    rows = c.fetchall()
    conn.close()

    logs = []
    for row in rows:
        details = None
        if row['details']:
            try:
                details = json.loads(row['details'])
            except:
                details = row['details']

        logs.append({
            "id": row['id'],
            "timestamp": row['timestamp'],
            "user_id": row['user_id'],
            "user_email": row['user_email'],
            "action": row['action'],
            "details": details,
            "ip_address": row['ip_address']
        })

    return {
        "logs": logs,
        "total": total,
        "limit": limit,
        "offset": offset
    }


def get_activity_summary(days: int = 30):
    """
    Get summary statistics of activity logs

    Args:
        days: Number of days to look back

    Returns:
        dict with activity summary
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    cutoff_date = (datetime.utcnow() - timedelta(days=days)).isoformat()

    # Total actions
    c.execute("SELECT COUNT(*) FROM activity_logs WHERE timestamp >= ?", (cutoff_date,))
    total_actions = c.fetchone()[0]

    # Actions by type
    c.execute('''
        SELECT action, COUNT(*) as count
        FROM activity_logs
        WHERE timestamp >= ?
        GROUP BY action
        ORDER BY count DESC
    ''', (cutoff_date,))
    by_action = {row['action']: row['count'] for row in c.fetchall()}

    # Actions by user
    c.execute('''
        SELECT user_email, COUNT(*) as count
        FROM activity_logs
        WHERE timestamp >= ? AND user_email IS NOT NULL
        GROUP BY user_email
        ORDER BY count DESC
    ''', (cutoff_date,))
    by_user = {row['user_email']: row['count'] for row in c.fetchall()}

    # Recent activity (last 10)
    c.execute('''
        SELECT timestamp, user_email, action
        FROM activity_logs
        WHERE timestamp >= ?
        ORDER BY timestamp DESC
        LIMIT 10
    ''', (cutoff_date,))
    recent = [{
        "timestamp": row['timestamp'],
        "user_email": row['user_email'],
        "action": row['action']
    } for row in c.fetchall()]

    conn.close()

    return {
        "period_days": days,
        "total_actions": total_actions,
        "by_action": by_action,
        "by_user": by_user,
        "recent": recent
    }


def cleanup_old_activity_logs(days: int = 90):
    """
    Remove activity logs older than specified days

    Args:
        days: Keep logs from the last N days

    Returns:
        Number of deleted records
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    cutoff_date = (datetime.utcnow() - timedelta(days=days)).isoformat()

    c.execute("DELETE FROM activity_logs WHERE timestamp < ?", (cutoff_date,))

    deleted = c.rowcount
    conn.commit()
    conn.close()

    if deleted > 0:
        logger.info(f"Cleaned up {deleted} old activity logs (older than {days} days)")

    return deleted


# Initialize on module load or explicitly
init_db()
