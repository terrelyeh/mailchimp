"""Ensure data endpoints require auth and share-link tokens are scoped."""
import os
import sys
import types
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.pop("VERCEL", None)
os.environ["JWT_SECRET"] = "test-secret"

# Stub the database module so tests never touch Supabase
fake_db = types.ModuleType("database")
fake_db.supabase = MagicMock()
fake_db.get_cached_campaigns = lambda days=30, region=None: [{"id": "c1", "region": region or "US"}]
fake_db.get_user_by_id = lambda uid: {"id": uid, "email": "u@example.com", "role": "viewer"} if uid == "u1" else None
fake_db.get_shared_link = lambda token: {"has_password": False, "expires_at": None, "access_count": 0} if token == "good" else None
fake_db.access_shared_link = lambda token: {"filter_state": {"region": "JP", "days": 30}}
fake_db.get_regions_last_activity = lambda: {}
fake_db.get_excluded_audiences = lambda: []
fake_db.log_activity = lambda **kw: None
sys.modules["database"] = fake_db

from fastapi.testclient import TestClient  # noqa: E402
import main  # noqa: E402

main.mailchimp_service.REGIONS = ["US", "JP"]
client = TestClient(main.app)

PUBLIC = {
    ("GET", "/"), ("GET", "/health"), ("GET", "/api/keep-alive"),
    ("POST", "/api/auth/login"), ("POST", "/api/auth/emergency-reset"),
    ("GET", "/api/share/{token}"), ("POST", "/api/share/{token}/verify"),
}


def _routes():
    for r in main.app.routes:
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}:
            if r.path.startswith(("/api", "/health")) or r.path == "/":
                yield m, r.path


@pytest.mark.parametrize("method,path", sorted(set(_routes()) - PUBLIC))
def test_non_public_routes_reject_anonymous(method, path):
    url = path.replace("{user_id}", "x").replace("{token}", "x").replace("{group_id}", "1")
    resp = client.request(method, url, json={})
    assert resp.status_code == 401, f"{method} {path} -> {resp.status_code}"


def test_dashboard_with_user_token():
    tok = main.create_access_token("u1", "u@example.com", "viewer")
    r = client.get("/api/dashboard?region=US", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 200


def test_share_flow_scoped_token():
    r = client.get("/api/share/good")
    assert r.status_code == 200
    share_tok = r.json()["access_token"]
    h = {"Authorization": f"Bearer {share_tok}"}
    assert client.get("/api/dashboard?region=JP", headers=h).status_code == 200
    assert client.get("/api/dashboard", headers=h).json()["region"] == "JP"
    assert client.get("/api/dashboard?region=US", headers=h).status_code == 403
    # share token must not unlock user-only endpoints
    assert client.get("/api/auth/me", headers=h).status_code == 401
    assert client.post("/api/sync", headers=h).status_code == 401


def test_emergency_reset_fails_closed_without_env(monkeypatch):
    monkeypatch.delenv("ADMIN_INITIAL_PASSWORD", raising=False)
    r = client.post("/api/auth/emergency-reset", json={"reset_secret": "ChangeMe123!"})
    assert r.status_code == 503
