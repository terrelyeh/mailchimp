#!/usr/bin/env python3
"""
Test script to manually fetch campaigns and save to database
"""
from mailchimp_service import mailchimp_service
import database

print("=" * 60)
print("Testing MailChimp data fetch and database storage")
print("=" * 60)

# Check current cache state
print("\n1. Current cache state:")
stats = database.get_cache_stats()
print(f"   Total campaigns in cache: {stats['total']}")
print(f"   By region: {stats['by_region']}")

# Test fetching data for each region
print("\n2. Fetching campaigns from MailChimp API...")
for region in mailchimp_service.REGIONS:
    print(f"\n   Testing region: {region}")
    print(f"   {'='*50}")

    try:
        client = mailchimp_service.get_client(region)
        if not client:
            print(f"   ❌ No client found for {region}")
            continue

        # Fetch campaigns (30 days)
        print(f"   📡 Fetching campaigns for last 30 days...")
        campaigns = client.get_campaigns(days=30, count=200)

        if not campaigns:
            print(f"   ⚠️  No campaigns found for {region}")
            continue

        print(f"   ✅ Fetched {len(campaigns)} campaigns")

        # Now fetch full dashboard data (with reports)
        print(f"   📊 Fetching detailed reports...")
        dashboard_data = client.get_dashboard_data(days=30)
        print(f"   ✅ Got {len(dashboard_data)} campaigns with reports")

        # Save to database
        print(f"   💾 Saving to database...")
        database.upsert_campaigns(dashboard_data, region=region)
        print(f"   ✅ Saved successfully")

    except Exception as e:
        print(f"   ❌ Error for {region}: {e}")
        import traceback
        traceback.print_exc()

# Check final cache state
print("\n3. Final cache state:")
stats = database.get_cache_stats()
print(f"   Total campaigns in cache: {stats['total']}")
print(f"   By region: {stats['by_region']}")

print("\n" + "=" * 60)
print("Test complete!")
print("=" * 60)
