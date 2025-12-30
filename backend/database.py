import sqlite3
import json
from datetime import datetime
import os

DB_PATH = "campaign_cache.db"

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
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Fetch campaigns with optional region filter
    if region:
        c.execute("SELECT data_json FROM campaigns WHERE region = ? ORDER BY send_time DESC LIMIT 200", (region,))
    else:
        c.execute("SELECT data_json FROM campaigns ORDER BY send_time DESC LIMIT 200")

    rows = c.fetchall()

    results = []
    cutoff_time = datetime.utcnow().timestamp() - (days * 86400)

    for row in rows:
        camp = json.loads(row['data_json'])
        # Basic filtering
        try:
            # Parse send_time string to timestamp for comparison if needed
            # For now, just returning what we have, let frontend filter exact dates
            results.append(camp)
        except:
            pass

    conn.close()
    return results

# Initialize on module load or explicitly
init_db()
