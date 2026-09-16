"""
Comprehensive Seeder for National Weather Big Data Analytics Platform
Seeds 60+ Indian master places, pulls initial live atmospheric data from Open-Meteo,
generates 12-month historical time-series data for all Indian places, and creates
multi-category citizen reports (Thunderstorms, Flooding, Heatwaves, Fog, Dust Storms).
"""

import sys
import uuid
import random
import datetime
from pathlib import Path

# Add parent dir to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.database import init_db, get_connection, insert_user_report
from backend.etl.master_places import load_places_to_db, INDIAN_PLACES_MASTER
from backend.scheduler import sync_live_places_sync

SOURCES_METADATA = [
    {
        "source_id": "src_imd_01",
        "name": "IMD National AWS Network",
        "code": "SOURCE A",
        "type": "official_gov",
        "authenticity_score": 96.0,
        "verified": 1,
        "status": "ACTIVE"
    },
    {
        "source_id": "src_cwc_02",
        "name": "CWC / India-WRIS River Gauge",
        "code": "SOURCE B",
        "type": "river_sensor",
        "authenticity_score": 92.0,
        "verified": 1,
        "status": "ACTIVE"
    },
    {
        "source_id": "src_sat_03",
        "name": "NASA GPM / INSAT-3DR Satellite",
        "code": "SOURCE C",
        "type": "satellite_telemetry",
        "authenticity_score": 98.0,
        "verified": 1,
        "status": "ACTIVE"
    },
    {
        "source_id": "src_sdma_04",
        "name": "Open-Meteo & SDMA Ground Mesh",
        "code": "SOURCE D",
        "type": "ground_telemetry",
        "authenticity_score": 88.0,
        "verified": 1,
        "status": "ACTIVE"
    },
    {
        "source_id": "src_crowd_05",
        "name": "Citizen Telemetry & Auxiliary Mesh",
        "code": "SOURCE E",
        "type": "crowd_mesh",
        "authenticity_score": 75.0,
        "verified": 0,
        "status": "ACTIVE"
    }
]

SAMPLE_CATEGORY_REPORTS = [
    # Thunderstorm
    {
        "id": "rep_kol_001",
        "user_id": "usr_kol_radar",
        "user_name": "Kolkata Doppler Radar Station",
        "user_trust_score": 98.0,
        "place_id": "in_kol_001",
        "event_type": "thunderstorm",
        "title": "Severe Nor'wester (Kalbaishakhi) Squall Wave",
        "description": "Peak wind gust recorded at 78 km/h. Multiple cloud-to-ground lightning discharges in Alipore & Salt Lake. Power grid trips reported in Sector V.",
        "media_url": "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1200&q=80",
        "source_url": "https://mausam.imd.gov.in",
        "temperature_c": 27.4,
        "humidity_pct": 86.0,
        "precipitation_mm": 14.8,
        "air_quality_index": 54,
        "aqi_category": "Moderate",
        "latitude": 22.5726,
        "longitude": 88.3639,
        "authenticity_score": 98.0,
        "verified_badge": 1,
        "ml_verdict": "VERIFIED_GENUINE",
        "status": "APPROVED",
        "submitted_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    },
    # Flooding
    {
        "id": "rep_mum_001",
        "user_id": "usr_civic_mum",
        "user_name": "Rohan Deshmukh (BMC Ward Telemetry)",
        "user_trust_score": 96.0,
        "place_id": "in_mum_001",
        "event_type": "flooding",
        "title": "Severe Waterlogging at Hindmata & Dadar TT Circle",
        "description": "Hindmata lower carriage submerged under 3.5 ft water. BMC stormwater pumps operational at full discharge. Traffic diverted via Dr. BA Road.",
        "media_url": "https://images.unsplash.com/photo-1519692933481-e162a57d6721?auto=format&fit=crop&w=1200&q=80",
        "source_url": "https://mausam.imd.gov.in",
        "temperature_c": 26.8,
        "humidity_pct": 92.0,
        "precipitation_mm": 28.5,
        "air_quality_index": 42,
        "aqi_category": "Good",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "authenticity_score": 96.0,
        "verified_badge": 1,
        "ml_verdict": "VERIFIED_GENUINE",
        "status": "APPROVED",
        "submitted_at": (datetime.datetime.now() - datetime.timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S")
    },
    # Heatwave
    {
        "id": "rep_pha_001",
        "user_id": "usr_thar_obs",
        "user_name": "Phalodi Thermal Observatory",
        "user_trust_score": 95.0,
        "place_id": "in_pha_001",
        "event_type": "heatwave",
        "title": "Severe Heatwave Wave: Surface Mercury at 44.8°C",
        "description": "Extreme Loo winds blowing across Thar fringe. Relative humidity dipped to 18%. District administration issued Red Alert school closures.",
        "media_url": "https://images.unsplash.com/photo-1504370805625-d32c54b16100?auto=format&fit=crop&w=1200&q=80",
        "source_url": "https://sachet.ndma.gov.in",
        "temperature_c": 44.8,
        "humidity_pct": 18.0,
        "precipitation_mm": 0.0,
        "air_quality_index": 128,
        "aqi_category": "Poor",
        "latitude": 27.1300,
        "longitude": 72.3600,
        "authenticity_score": 95.0,
        "verified_badge": 1,
        "ml_verdict": "VERIFIED_GENUINE",
        "status": "APPROVED",
        "submitted_at": (datetime.datetime.now() - datetime.timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S")
    },
    # Fog
    {
        "id": "rep_del_002",
        "user_id": "usr_del_air",
        "user_name": "Delhi Airport Met Station",
        "user_trust_score": 93.0,
        "place_id": "in_del_001",
        "event_type": "fog",
        "title": "Dense Winter Fog Wave Across IGI Airport",
        "description": "Runway visual range (RVR) dipped below 50m. CAT-III instrument landing system active. 18 flights delayed. Surface winds calm under 3 km/h.",
        "media_url": "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=1200&q=80",
        "source_url": "https://sachet.ndma.gov.in",
        "temperature_c": 11.2,
        "humidity_pct": 96.0,
        "precipitation_mm": 0.0,
        "air_quality_index": 285,
        "aqi_category": "Very Unhealthy",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "authenticity_score": 92.0,
        "verified_badge": 1,
        "ml_verdict": "VERIFIED_GENUINE",
        "status": "APPROVED",
        "submitted_at": (datetime.datetime.now() - datetime.timedelta(hours=3)).strftime("%Y-%m-%d %H:%M:%S")
    },
    # Dust Storm
    {
        "id": "rep_jai_003",
        "user_id": "usr_jais_ranger",
        "user_name": "Jaisalmer Desert Ranger Post",
        "user_trust_score": 91.0,
        "place_id": "in_jai_002",
        "event_type": "dust storm",
        "title": "High Velocity Sand & Dust Gale Moving Eastward",
        "description": "Strong gusts up to 58 km/h recorded. Highway 11 visibility reduced to under 200m. Particulate haze surging across desert sector.",
        "media_url": "https://assets.mixkit.co/videos/preview/mixkit-heavy-rain-falling-on-the-water-of-a-lake-1601-large.mp4",
        "source_url": "https://mausam.imd.gov.in",
        "temperature_c": 39.5,
        "humidity_pct": 22.0,
        "precipitation_mm": 0.0,
        "air_quality_index": 195,
        "aqi_category": "Unhealthy",
        "latitude": 26.9157,
        "longitude": 70.9083,
        "authenticity_score": 90.0,
        "verified_badge": 1,
        "ml_verdict": "VERIFIED_GENUINE",
        "status": "APPROVED",
        "submitted_at": (datetime.datetime.now() - datetime.timedelta(hours=4)).strftime("%Y-%m-%d %H:%M:%S")
    }
]

def seed_database():
    print("[*] 1. Initializing SQLite Database Schema...")
    init_db()

    conn = get_connection()
    try:
        cursor = conn.cursor()

        # 1. Load expanded Master Places (60+ locations)
        print("[*] 2. Loading 60+ Indian Master Places across all States/UTs...")
        places_count = load_places_to_db(conn)
        print(f"    Loaded {places_count} locations across India.")

        # 2. Insert Authenticated Sources
        print("[*] 3. Initializing Authenticated Weather Sources...")
        for s in SOURCES_METADATA:
            cursor.execute("""
                INSERT OR REPLACE INTO sources (
                    source_id, name, code, type, authenticity_score, verified, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                s["source_id"], s["name"], s["code"], s["type"], 
                s["authenticity_score"], s["verified"], s["status"]
            ))
        conn.commit()

        # 3. Pull initial live batch ingestion from Open-Meteo API
        print("[*] 4. Ingesting Real-Time Live Telemetry from Open-Meteo across all 60+ Indian places...")
        sync_result = sync_live_places_sync()
        print(f"    Live sync completed: {sync_result.get('records_ingested', 0)} real records ingested.")

        # 4. Generate 12 months of Historical Big Data
        print("[*] 5. Generating 12 months of historical big data time-series across India...")
        today = datetime.date.today()
        historical_records = []
        extreme_places = ["in_maw_001", "in_che_001", "in_mum_001", "in_chp_001", "in_way_001", "in_mhb_001", "in_kol_001", "in_ran_001", "in_agu_001"]

        for day_offset in range(0, 365, 3):
            rec_date = today - datetime.timedelta(days=day_offset)
            month = rec_date.month
            is_monsoon = month in [6, 7, 8, 9]

            for p in INDIAN_PLACES_MASTER:
                pid = p["place_id"]
                if is_monsoon:
                    if pid in extreme_places:
                        rain_val = round(random.uniform(75.0, 260.0), 1)
                    else:
                        rain_val = round(random.uniform(15.0, 80.0), 1)
                else:
                    if pid in ["in_maw_001", "in_che_001", "in_agu_001"]:
                        rain_val = round(random.uniform(8.0, 50.0), 1)
                    elif random.random() < 0.2:
                        rain_val = round(random.uniform(5.0, 35.0), 1)
                    else:
                        rain_val = 0.0

                if rain_val > 0.0:
                    rec_time_str = f"{rec_date.strftime('%Y-%m-%d')} 08:30:00"
                    historical_records.append((
                        f"hist_{uuid.uuid4().hex[:12]}",
                        pid,
                        "IMD Station Network",
                        "rainfall_mm",
                        rain_val,
                        "mm",
                        rec_time_str,
                        rec_time_str,
                        '{"historical": true, "source": "IMD Historical Archive"}'
                    ))

        cursor.executemany("""
            INSERT INTO raw_readings (
                id, place_id, source_name, metric, value, unit, recorded_at, ingested_at, raw_payload
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, historical_records)
        conn.commit()
        print(f"    Inserted {len(historical_records)} historical time-series records across 365 days.")

        # 5. Insert Multi-Category Citizen Reports
        print("[*] 6. Seeding verified disaster reports across hazard categories...")
        for r in SAMPLE_CATEGORY_REPORTS:
            insert_user_report(r)
        print(f"    Inserted {len(SAMPLE_CATEGORY_REPORTS)} multi-hazard citizen reports.")

        print("[OK] DATABASE OVERHAUL COMPLETE! Real-time live data ingested.")
    finally:
        conn.close()

if __name__ == "__main__":
    seed_database()
