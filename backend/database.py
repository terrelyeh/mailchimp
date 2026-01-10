import sqlite3
import json
import logging
import secrets
import hashlib
from datetime import datetime, timedelta
import os

logger = logging.getLogger(__name__)

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
    conn.commit()
    conn.close()

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

def create_shared_link(filter_state, password=None, expires_days=None):
    """
    Create a new shared link

    Args:
        filter_state: dict of filter settings
        password: optional password string
        expires_days: optional expiration in days (None = never expires)

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
        INSERT INTO shared_links (token, filter_state, password_hash, expires_at)
        VALUES (?, ?, ?, ?)
    ''', (token, filter_json, password_hash, expires_at))

    conn.commit()
    conn.close()

    logger.info(f"Created shared link: {token}, expires: {expires_at}, has_password: {bool(password)}")

    return {
        "token": token,
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
        SELECT token, filter_state, password_hash, expires_at, created_at, access_count
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

# Initialize on module load or explicitly
init_db()
