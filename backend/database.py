import sqlite3
import json
import logging
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

# Initialize on module load or explicitly
init_db()
