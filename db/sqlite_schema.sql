-- ============================================================================
-- NATIONAL WEATHER BIG DATA ANALYTICS PLATFORM
-- Local SQLite Engine Schema (Phase 3 Spec)
-- ============================================================================

CREATE TABLE IF NOT EXISTS places_master (
    place_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- village, town, city, metro, tehsil
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    tehsil TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    population INTEGER NOT NULL DEFAULT 0,
    last_census_year INTEGER DEFAULT 2011,
    source TEXT DEFAULT 'Census of India / data.gov.in / GeoNames'
);

CREATE INDEX IF NOT EXISTS idx_places_name ON places_master(name);
CREATE INDEX IF NOT EXISTS idx_places_state_dist ON places_master(state, district);
CREATE INDEX IF NOT EXISTS idx_places_population ON places_master(population DESC);

CREATE TABLE IF NOT EXISTS raw_readings (
    id TEXT PRIMARY KEY,
    place_id TEXT REFERENCES places_master(place_id),
    source_name TEXT NOT NULL,
    metric TEXT NOT NULL,
    value REAL NOT NULL,
    unit TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    ingested_at TEXT DEFAULT CURRENT_TIMESTAMP,
    raw_payload TEXT
);

CREATE INDEX IF NOT EXISTS idx_raw_place_time ON raw_readings(place_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS processed_readings (
    id TEXT PRIMARY KEY,
    place_id TEXT REFERENCES places_master(place_id),
    hazard_type TEXT DEFAULT 'FLOODING',
    rainfall_mm REAL NOT NULL DEFAULT 0.0,
    precipitation_mm REAL NOT NULL DEFAULT 0.0,
    soil_saturation_pct REAL NOT NULL DEFAULT 0.0,
    water_level_m REAL NOT NULL DEFAULT 0.0,
    rain_probability_pct REAL NOT NULL DEFAULT 0.0,
    temperature_c REAL NOT NULL DEFAULT 28.0,
    humidity_pct REAL NOT NULL DEFAULT 70.0,
    air_quality_index INTEGER NOT NULL DEFAULT 65,
    aqi_category TEXT NOT NULL DEFAULT 'Moderate',
    wind_kmh REAL NOT NULL DEFAULT 0.0,
    risk_score INTEGER NOT NULL DEFAULT 0,
    risk_level TEXT NOT NULL DEFAULT 'LOW',
    system_confidence TEXT NOT NULL DEFAULT 'HIGH',
    system_confidence_pct REAL NOT NULL DEFAULT 85.0,
    consensus_summary TEXT,
    computed_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_proc_place_computed ON processed_readings(place_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_proc_risk_score ON processed_readings(risk_score DESC);

CREATE TABLE IF NOT EXISTS sources (
    source_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    type TEXT NOT NULL,
    authenticity_score REAL NOT NULL DEFAULT 90.0,
    verified INTEGER NOT NULL DEFAULT 1,
    last_updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS source_comparison (
    id TEXT PRIMARY KEY,
    processed_id TEXT REFERENCES processed_readings(id),
    source_id TEXT REFERENCES sources(source_id),
    rainfall_mm REAL,
    water_level_m REAL,
    rain_probability_pct REAL,
    temperature_c REAL,
    humidity_pct REAL,
    air_quality_index INTEGER,
    risk_level TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_reports (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name TEXT DEFAULT 'Citizen Reporter',
    user_trust_score REAL DEFAULT 80.0,
    place_id TEXT REFERENCES places_master(place_id),
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    media_url TEXT,
    source_url TEXT,
    temperature_c REAL,
    humidity_pct REAL,
    precipitation_mm REAL,
    air_quality_index INTEGER,
    aqi_category TEXT,
    latitude REAL,
    longitude REAL,
    submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    authenticity_score REAL DEFAULT 85.0,
    verified_badge INTEGER DEFAULT 0,
    ml_verdict TEXT DEFAULT 'VERIFIED_GENUINE',
    status TEXT DEFAULT 'APPROVED'
);

CREATE INDEX IF NOT EXISTS idx_user_reports_place ON user_reports(place_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS event_types (
    event_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS sync_logs (
    id TEXT PRIMARY KEY,
    sync_type TEXT NOT NULL, -- AUTOMATED_HOURLY, DAILY_BATCH, MANUAL_TRIGGER
    started_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT NOT NULL,
    sources_synced INTEGER DEFAULT 0,
    records_ingested INTEGER DEFAULT 0,
    details TEXT
);
