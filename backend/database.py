import sqlite3
import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional

DB_PATH = Path(__file__).parent / "weather_bigdata.db"
SCHEMA_PATH = Path(__file__).parent.parent / "db" / "sqlite_schema.sql"

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn

def init_db():
    conn = get_connection()
    try:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            schema_sql = f.read()
        conn.executescript(schema_sql)
        
        # Safely migrate columns if existing db doesn't have them
        cursor = conn.cursor()
        
        # Processed readings columns
        cursor.execute("PRAGMA table_info(processed_readings)")
        proc_cols = [row["name"] for row in cursor.fetchall()]
        if "precipitation_mm" not in proc_cols:
            cursor.execute("ALTER TABLE processed_readings ADD COLUMN precipitation_mm REAL DEFAULT 0.0")
        if "temperature_c" not in proc_cols:
            cursor.execute("ALTER TABLE processed_readings ADD COLUMN temperature_c REAL DEFAULT 28.0")
        if "humidity_pct" not in proc_cols:
            cursor.execute("ALTER TABLE processed_readings ADD COLUMN humidity_pct REAL DEFAULT 70.0")
        if "air_quality_index" not in proc_cols:
            cursor.execute("ALTER TABLE processed_readings ADD COLUMN air_quality_index INTEGER DEFAULT 65")
        if "aqi_category" not in proc_cols:
            cursor.execute("ALTER TABLE processed_readings ADD COLUMN aqi_category TEXT DEFAULT 'Moderate'")

        # Source comparison columns
        cursor.execute("PRAGMA table_info(source_comparison)")
        sc_cols = [row["name"] for row in cursor.fetchall()]
        if "temperature_c" not in sc_cols:
            cursor.execute("ALTER TABLE source_comparison ADD COLUMN temperature_c REAL")
        if "humidity_pct" not in sc_cols:
            cursor.execute("ALTER TABLE source_comparison ADD COLUMN humidity_pct REAL")
        if "air_quality_index" not in sc_cols:
            cursor.execute("ALTER TABLE source_comparison ADD COLUMN air_quality_index INTEGER")

        # User reports columns
        cursor.execute("PRAGMA table_info(user_reports)")
        ur_cols = [row["name"] for row in cursor.fetchall()]
        if "temperature_c" not in ur_cols:
            cursor.execute("ALTER TABLE user_reports ADD COLUMN temperature_c REAL")
        if "humidity_pct" not in ur_cols:
            cursor.execute("ALTER TABLE user_reports ADD COLUMN humidity_pct REAL")
        if "precipitation_mm" not in ur_cols:
            cursor.execute("ALTER TABLE user_reports ADD COLUMN precipitation_mm REAL")
        if "air_quality_index" not in ur_cols:
            cursor.execute("ALTER TABLE user_reports ADD COLUMN air_quality_index INTEGER")
        if "aqi_category" not in ur_cols:
            cursor.execute("ALTER TABLE user_reports ADD COLUMN aqi_category TEXT")
        if "latitude" not in ur_cols:
            cursor.execute("ALTER TABLE user_reports ADD COLUMN latitude REAL")
        if "longitude" not in ur_cols:
            cursor.execute("ALTER TABLE user_reports ADD COLUMN longitude REAL")

        conn.commit()
    finally:
        conn.close()

# -----------------------------------------------------------------------------
# PLACES & HAZARD CATEGORY QUERIES
# -----------------------------------------------------------------------------

HAZARD_CATEGORIES = [
    "thunderstorm",
    "flooding",
    "rainfall",
    "heatwave",
    "fog",
    "dust storm",
    "strong wind"
]

def search_places(query: str = "", category: Optional[str] = None, limit: int = 60) -> List[Dict[str, Any]]:
    """
    Searches master places dataset by place name, district, state, OR hazard category.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        
        # Check if query itself is a hazard category
        q_clean = query.strip().lower()
        matched_cat = None
        for cat in HAZARD_CATEGORIES:
            if cat in q_clean or q_clean in cat:
                matched_cat = cat
                break

        if category or matched_cat:
            cat_to_filter = (category or matched_cat).upper()
            cursor.execute("""
                SELECT 
                    p.place_id, p.name, p.type, p.state, p.district, p.tehsil, 
                    p.latitude, p.longitude, p.population, p.last_census_year, p.source,
                    pr.hazard_type, pr.risk_score, pr.risk_level, pr.rainfall_mm, pr.computed_at
                FROM places_master p
                JOIN processed_readings pr ON p.place_id = pr.place_id
                WHERE UPPER(pr.hazard_type) = ?
                GROUP BY p.place_id
                ORDER BY pr.risk_score DESC, p.population DESC
                LIMIT ?
            """, (cat_to_filter, limit))
            rows = cursor.fetchall()
            if rows:
                return [dict(row) for row in rows]

        if query:
            q = f"%{q_clean}%"
            cursor.execute("""
                SELECT 
                    p.place_id, p.name, p.type, p.state, p.district, p.tehsil, 
                    p.latitude, p.longitude, p.population, p.last_census_year, p.source,
                    pr.hazard_type, pr.risk_score, pr.risk_level, pr.rainfall_mm
                FROM places_master p
                LEFT JOIN processed_readings pr ON p.place_id = pr.place_id
                WHERE LOWER(p.name) LIKE ? OR LOWER(p.district) LIKE ? OR LOWER(p.state) LIKE ? OR LOWER(pr.hazard_type) LIKE ?
                GROUP BY p.place_id
                ORDER BY 
                    CASE 
                        WHEN LOWER(p.name) = ? THEN 1
                        WHEN LOWER(p.name) LIKE ? THEN 2
                        ELSE 3 
                    END,
                    pr.risk_score DESC,
                    p.population DESC
                LIMIT ?
            """, (q, q, q, q, q_clean, f"{q_clean}%", limit))
        else:
            cursor.execute("""
                SELECT 
                    p.place_id, p.name, p.type, p.state, p.district, p.tehsil, 
                    p.latitude, p.longitude, p.population, p.last_census_year, p.source,
                    pr.hazard_type, pr.risk_score, pr.risk_level, pr.rainfall_mm
                FROM places_master p
                LEFT JOIN processed_readings pr ON p.place_id = pr.place_id
                GROUP BY p.place_id
                ORDER BY pr.risk_score DESC, p.population DESC
                LIMIT ?
            """, (limit,))
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

def get_hazards_summary() -> Dict[str, Any]:
    """
    Returns incident counts and status summary grouped by hazard category.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                LOWER(hazard_type) as category,
                COUNT(DISTINCT place_id) as places_count,
                MAX(risk_score) as max_risk_score,
                SUM(CASE WHEN risk_level IN ('HIGH', 'SEVERE') THEN 1 ELSE 0 END) as elevated_count
            FROM processed_readings
            GROUP BY LOWER(hazard_type)
        """)
        raw_counts = {row["category"]: dict(row) for row in cursor.fetchall()}

        summary = {}
        for cat in HAZARD_CATEGORIES:
            info = raw_counts.get(cat, {"places_count": 0, "max_risk_score": 0, "elevated_count": 0})
            summary[cat] = {
                "category": cat,
                "places_count": info["places_count"],
                "max_risk_score": info["max_risk_score"],
                "elevated_count": info["elevated_count"]
            }
        return summary
    finally:
        conn.close()

def get_places_for_hazard(category: str, limit: int = 30) -> List[Dict[str, Any]]:
    """
    Returns all places affected by a specific hazard category.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                p.place_id, p.name, p.type, p.state, p.district, p.latitude, p.longitude, p.population,
                pr.hazard_type, pr.risk_score, pr.risk_level, pr.rainfall_mm, pr.water_level_m,
                pr.wind_kmh, pr.system_confidence, pr.computed_at
            FROM places_master p
            JOIN processed_readings pr ON p.place_id = pr.place_id
            WHERE LOWER(pr.hazard_type) = ?
            GROUP BY p.place_id
            ORDER BY pr.risk_score DESC, p.population DESC
            LIMIT ?
        """, (category.lower(), limit))
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

def get_map_incidents(category: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Returns all active telemetry stations and field reports with GPS coordinates,
    hazard category, severity, temperature, humidity, precipitation, and air quality.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cat_filter = ""
        params = []
        if category and category.lower() != "all":
            cat_filter = "WHERE LOWER(pr.hazard_type) = ?"
            params.append(category.lower())

        cursor.execute(f"""
            SELECT 
                p.place_id, p.name, p.type, p.state, p.district, p.latitude, p.longitude, p.population,
                pr.id as report_id, pr.hazard_type, pr.risk_score, pr.risk_level, 
                pr.rainfall_mm, pr.precipitation_mm, pr.temperature_c, pr.humidity_pct,
                pr.air_quality_index, pr.aqi_category, pr.water_level_m, pr.wind_kmh, 
                pr.rain_probability_pct, pr.soil_saturation_pct, pr.system_confidence, pr.computed_at
            FROM places_master p
            JOIN (
                SELECT pr1.*
                FROM processed_readings pr1
                INNER JOIN (
                    SELECT place_id, MAX(computed_at) as max_computed
                    FROM processed_readings
                    GROUP BY place_id
                ) pr2 ON pr1.place_id = pr2.place_id AND pr1.computed_at = pr2.max_computed
            ) pr ON p.place_id = pr.place_id
            {cat_filter}
            ORDER BY pr.risk_score DESC
        """, params)
        stations = [dict(row) for row in cursor.fetchall()]

        rep_filter = ""
        rep_params = []
        if category and category.lower() != "all":
            rep_filter = "WHERE LOWER(ur.event_type) = ?"
            rep_params.append(category.lower())

        cursor.execute(f"""
            SELECT 
                ur.id as report_id, ur.place_id, ur.user_name, ur.event_type as hazard_type,
                ur.title, ur.description, ur.media_url, ur.source_url, ur.submitted_at as computed_at,
                ur.temperature_c, ur.humidity_pct, ur.precipitation_mm, ur.air_quality_index,
                ur.aqi_category, ur.latitude as report_lat, ur.longitude as report_lon,
                ur.authenticity_score, ur.verified_badge,
                p.name, p.state, p.district, p.latitude, p.longitude
            FROM user_reports ur
            LEFT JOIN places_master p ON ur.place_id = p.place_id
            {rep_filter}
            ORDER BY ur.submitted_at DESC
        """, rep_params)
        user_reps = [dict(row) for row in cursor.fetchall()]

        incidents = []
        for s in stations:
            haz = s["hazard_type"].lower()
            incidents.append({
                "id": s["report_id"],
                "place_id": s["place_id"],
                "name": s["name"],
                "district": s["district"],
                "state": s["state"],
                "latitude": s["latitude"],
                "longitude": s["longitude"],
                "category": haz,
                "risk_score": s["risk_score"],
                "risk_level": s["risk_level"],
                "rainfall_mm": s["rainfall_mm"],
                "precipitation_mm": s.get("precipitation_mm", 0.0),
                "temperature_c": s.get("temperature_c", 28.0),
                "humidity_pct": s.get("humidity_pct", 70.0),
                "air_quality_index": s.get("air_quality_index", 65),
                "aqi_category": s.get("aqi_category", "Moderate"),
                "water_level_m": s["water_level_m"],
                "wind_kmh": s["wind_kmh"],
                "soil_saturation_pct": s.get("soil_saturation_pct"),
                "system_confidence": s["system_confidence"],
                "last_updated_at": s["computed_at"],
                "is_citizen_report": False,
                "verified": True,
                "title": f"Active {s['hazard_type']} Telemetry Station"
            })

        for ur in user_reps:
            lat = ur["report_lat"] or ur["latitude"]
            lon = ur["report_lon"] or ur["longitude"]
            if lat and lon:
                haz = ur["hazard_type"].lower()
                incidents.append({
                    "id": ur["report_id"],
                    "place_id": ur["place_id"],
                    "name": ur["name"] or "Field Incident Location",
                    "district": ur["district"] or "Monitored Sector",
                    "state": ur["state"] or "India",
                    "latitude": lat,
                    "longitude": lon,
                    "category": haz,
                    "risk_score": int(round(ur["authenticity_score"])),
                    "risk_level": "HIGH" if ur["authenticity_score"] >= 80 else "MODERATE",
                    "rainfall_mm": ur.get("precipitation_mm"),
                    "precipitation_mm": ur.get("precipitation_mm", 0.0),
                    "temperature_c": ur.get("temperature_c", 28.0),
                    "humidity_pct": ur.get("humidity_pct", 70.0),
                    "air_quality_index": ur.get("air_quality_index", 65),
                    "aqi_category": ur.get("aqi_category", "Moderate"),
                    "water_level_m": None,
                    "wind_kmh": None,
                    "soil_saturation_pct": None,
                    "system_confidence": "HIGH" if ur["verified_badge"] else "MODERATE",
                    "last_updated_at": ur["computed_at"],
                    "is_citizen_report": True,
                    "verified": bool(ur["verified_badge"]),
                    "title": ur["title"],
                    "description": ur["description"],
                    "media_url": ur.get("media_url")
                })

        return incidents
    finally:
        conn.close()

def get_place_by_id(place_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM places_master WHERE place_id = ?", (place_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def find_nearest_place(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """
    Finds the geographically nearest monitored place to the provided GPS coordinates.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM places_master")
        places = [dict(row) for row in cursor.fetchall()]
        if not places:
            return None
            
        import math
        def distance(p):
            plat = p["latitude"]
            plon = p["longitude"]
            # Haversine approximation
            dlat = math.radians(plat - lat)
            dlon = math.radians(plon - lon)
            a = math.sin(dlat/2)**2 + math.cos(math.radians(lat)) * math.cos(math.radians(plat)) * math.sin(dlon/2)**2
            return 2 * 6371 * math.atan2(math.sqrt(a), math.sqrt(1-a))

        places.sort(key=distance)
        closest = places[0]
        closest["distance_km"] = round(distance(closest), 1)
        return closest
    finally:
        conn.close()

def get_latest_processed_reading(place_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM processed_readings
            WHERE place_id = ?
            ORDER BY computed_at DESC
            LIMIT 1
        """, (place_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def get_source_comparisons_for_reading(processed_id: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT sc.*, s.name as source_name, s.code as source_code, s.authenticity_score, s.verified, s.status as source_status
            FROM source_comparison sc
            JOIN sources s ON sc.source_id = s.source_id
            WHERE sc.processed_id = ?
            ORDER BY s.code ASC
        """, (processed_id,))
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

def get_all_sources() -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sources ORDER BY code ASC")
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

# -----------------------------------------------------------------------------
# HISTORICAL BIG DATA QUERIES
# Answers: "where did it rain heavily last week/month/year"
# -----------------------------------------------------------------------------

def query_heavy_rainfall(
    period: str = "last_month",
    min_rainfall_mm: float = 50.0,
    state: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 60
) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        
        date_filter = ""
        if period == "last_week":
            date_filter = "AND r.recorded_at >= datetime('now', '-7 days')"
        elif period == "last_month":
            date_filter = "AND r.recorded_at >= datetime('now', '-30 days')"
        elif period == "last_year":
            date_filter = "AND r.recorded_at >= datetime('now', '-365 days')"
        elif period == "monsoon":
            date_filter = "AND strftime('%m', r.recorded_at) IN ('06', '07', '08', '09')"

        state_clause = ""
        params: List[Any] = [min_rainfall_mm]
        if state:
            state_clause = "AND LOWER(p.state) = ?"
            params.append(state.lower())
            
        params.append(limit)

        sql = f"""
            SELECT 
                p.place_id,
                p.name,
                p.type,
                p.state,
                p.district,
                p.latitude,
                p.longitude,
                p.population,
                MAX(r.value) as max_rainfall_mm,
                ROUND(AVG(r.value), 1) as avg_rainfall_mm,
                COUNT(r.id) as heavy_rain_readings_count,
                MAX(r.recorded_at) as latest_heavy_rain_time
            FROM raw_readings r
            JOIN places_master p ON r.place_id = p.place_id
            WHERE r.metric = 'rainfall_mm' 
              AND r.value >= ?
              {date_filter}
              {state_clause}
            GROUP BY p.place_id
            ORDER BY max_rainfall_mm DESC
            LIMIT ?
        """
        cursor.execute(sql, params)
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

def get_place_rainfall_history(place_id: str, days: int = 30) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                date(recorded_at) as date,
                ROUND(MAX(value), 1) as max_rainfall,
                ROUND(AVG(value), 1) as avg_rainfall,
                source_name
            FROM raw_readings
            WHERE place_id = ? AND metric = 'rainfall_mm'
            GROUP BY date(recorded_at)
            ORDER BY date DESC
            LIMIT ?
        """, (place_id, days))
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

# -----------------------------------------------------------------------------
# USER / CITIZEN REPORTS
# -----------------------------------------------------------------------------

def insert_user_report(report_data: Dict[str, Any]) -> str:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO user_reports (
                id, user_id, user_name, user_trust_score, place_id, event_type, 
                title, description, media_url, source_url, temperature_c,
                humidity_pct, precipitation_mm, air_quality_index, aqi_category,
                latitude, longitude, submitted_at, 
                authenticity_score, verified_badge, ml_verdict, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            report_data["id"],
            report_data.get("user_id", "user_anon"),
            report_data.get("user_name", "Citizen Reporter"),
            report_data.get("user_trust_score", 85.0),
            report_data.get("place_id", "in_mum_001"),
            report_data.get("event_type", "flooding"),
            report_data.get("title", ""),
            report_data.get("description", ""),
            report_data.get("media_url"),
            report_data.get("source_url"),
            report_data.get("temperature_c"),
            report_data.get("humidity_pct"),
            report_data.get("precipitation_mm"),
            report_data.get("air_quality_index"),
            report_data.get("aqi_category"),
            report_data.get("latitude"),
            report_data.get("longitude"),
            report_data.get("submitted_at"),
            report_data.get("authenticity_score", 80.0),
            1 if report_data.get("verified_badge", False) else 0,
            report_data.get("ml_verdict", "VERIFIED_GENUINE"),
            report_data.get("status", "APPROVED")
        ))
        conn.commit()
        return report_data["id"]
    finally:
        conn.close()

def get_user_reports(place_id: Optional[str] = None, category: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        if category:
            cursor.execute("""
                SELECT r.*, p.name as place_name, p.state as place_state 
                FROM user_reports r
                LEFT JOIN places_master p ON r.place_id = p.place_id
                WHERE LOWER(r.event_type) = ?
                ORDER BY r.submitted_at DESC
                LIMIT ?
            """, (category.lower(), limit))
        elif place_id:
            cursor.execute("""
                SELECT r.*, p.name as place_name, p.state as place_state 
                FROM user_reports r
                LEFT JOIN places_master p ON r.place_id = p.place_id
                WHERE r.place_id = ?
                ORDER BY r.submitted_at DESC
                LIMIT ?
            """, (place_id, limit))
        else:
            cursor.execute("""
                SELECT r.*, p.name as place_name, p.state as place_state 
                FROM user_reports r
                LEFT JOIN places_master p ON r.place_id = p.place_id
                ORDER BY r.submitted_at DESC
                LIMIT ?
            """, (limit,))
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

# -----------------------------------------------------------------------------
# SYNC LOGGING
# -----------------------------------------------------------------------------

def log_sync_start(sync_id: str, sync_type: str) -> None:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO sync_logs (id, sync_type, started_at, status)
            VALUES (?, ?, datetime('now'), 'RUNNING')
        """, (sync_id, sync_type))
        conn.commit()
    finally:
        conn.close()

def log_sync_finish(sync_id: str, status: str, sources_synced: int, records_ingested: int, details: str = "") -> None:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE sync_logs
            SET completed_at = datetime('now'),
                status = ?,
                sources_synced = ?,
                records_ingested = ?,
                details = ?
            WHERE id = ?
        """, (status, sources_synced, records_ingested, details, sync_id))
        conn.commit()
    finally:
        conn.close()

def get_latest_sync_status() -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM sync_logs
            ORDER BY started_at DESC
            LIMIT 1
        """)
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()
