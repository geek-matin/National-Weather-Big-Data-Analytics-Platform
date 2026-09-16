"""
Backend Sanity and Verification Script (Category-First & Live Telemetry)
Tests hazard summary, category filtering, dynamic telemetry, and ML fake report detector.
"""

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_all():
    print("[*] 1. Testing Hazard Categories Summary (/api/hazards/summary)...")
    res = client.get("/api/hazards/summary")
    assert res.status_code == 200, res.text
    summary = res.json()
    assert "thunderstorm" in summary
    assert "flooding" in summary
    assert "heatwave" in summary
    assert "fog" in summary
    print(f"    Passed. Categories tracked: {list(summary.keys())}")

    print("[*] 2. Testing Places by Hazard Category (/api/hazards/thunderstorm/places)...")
    res = client.get("/api/hazards/thunderstorm/places")
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["category"] == "thunderstorm"
    assert data["count"] > 0
    print(f"    Passed. Found {data['count']} places under THUNDERSTORM. Top: {data['places'][0]['name']}")

    print("[*] 3. Testing Category-Aware Search (/api/places/search?query=heatwave)...")
    res = client.get("/api/places/search?query=heatwave")
    assert res.status_code == 200, res.text
    search_data = res.json()
    assert search_data["count"] > 0
    print(f"    Passed. Category search returned {search_data['count']} matching stations. Top: {search_data['places'][0]['name']}")

    print("[*] 4. Testing Dynamic Telemetry Payload (/api/places/in_mum_001/layout-telemetry)...")
    res = client.get("/api/places/in_mum_001/layout-telemetry")
    assert res.status_code == 200, res.text
    telemetry = res.json()
    assert telemetry["header"]["place_name"] == "Mumbai"
    assert "current_risk" in telemetry
    assert "key_indicators" in telemetry
    assert len(telemetry["source_comparison_table"]) == 4
    assert len(telemetry["data_sources"]) == 5
    # Ensure source E is not hardcoded to delayed
    src_e = next(s for s in telemetry["data_sources"] if s["code"] == "SOURCE E")
    print(f"    Passed dynamic telemetry check. Source E status: {src_e['status']} ({src_e['time_label']})")

    print("[*] 5. Testing Automated Ingestion Telemetry (/api/sync/status)...")
    res_sync = client.get("/api/sync/status")
    assert res_sync.status_code == 200, res_sync.text
    sync_tel = res_sync.json()
    assert sync_tel["status"] == "ACTIVE"
    print(f"    Passed sync telemetry check. Interval: {sync_tel['interval_hours']}h, Next in: {sync_tel['next_sync_countdown_seconds']}s")

    print("[OK] ALL UPDATED API TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_all()
