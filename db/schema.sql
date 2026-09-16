-- ============================================================================
-- NATIONAL WEATHER BIG DATA ANALYTICS PLATFORM
-- Production PostgreSQL + PostGIS + TimescaleDB Schema (Phase 3 Spec)
-- ============================================================================

-- Extensions (Production TimescaleDB / PostGIS)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "postgis";
-- CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- 1. Master place list (All of India: Villages -> Towns -> Metros)
CREATE TABLE IF NOT EXISTS places_master (
    place_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL, -- village, town, city, metro, tehsil
    state VARCHAR(128) NOT NULL,
    district VARCHAR(128) NOT NULL,
    tehsil VARCHAR(128),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    population BIGINT NOT NULL DEFAULT 0,
    last_census_year INT DEFAULT 2011,
    source VARCHAR(128) DEFAULT 'Census of India / data.gov.in / GeoNames'
);

CREATE INDEX IF NOT EXISTS idx_places_name ON places_master(name);
CREATE INDEX IF NOT EXISTS idx_places_state_dist ON places_master(state, district);
CREATE INDEX IF NOT EXISTS idx_places_population ON places_master(population DESC);

-- 2. Raw ingested readings (append-only, time-series bronze layer)
CREATE TABLE IF NOT EXISTS raw_readings (
    id VARCHAR(64) PRIMARY KEY,
    place_id VARCHAR(64) REFERENCES places_master(place_id),
    source_name VARCHAR(128) NOT NULL,
    metric VARCHAR(64) NOT NULL, -- rainfall_mm, temp_c, water_level_m, wind_kmh, etc.
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(32) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ingested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    raw_payload JSONB
);

-- SELECT create_hypertable('raw_readings', 'recorded_at', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_raw_place_time ON raw_readings(place_id, recorded_at DESC);

-- 3. Cleaned/aggregated per-place-per-hour snapshot (Gold layer)
CREATE TABLE IF NOT EXISTS processed_readings (
    id VARCHAR(64) PRIMARY KEY,
    place_id VARCHAR(64) REFERENCES places_master(place_id),
    hazard_type VARCHAR(64) DEFAULT 'FLOODING',
    rainfall_mm DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    soil_saturation_pct DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    water_level_m DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    rain_probability_pct DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    wind_kmh DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    risk_score INT NOT NULL DEFAULT 0,
    risk_level VARCHAR(32) NOT NULL DEFAULT 'LOW', -- LOW, MODERATE, HIGH, SEVERE
    system_confidence VARCHAR(32) NOT NULL DEFAULT 'HIGH',
    system_confidence_pct DOUBLE PRECISION NOT NULL DEFAULT 85.0,
    consensus_summary VARCHAR(255),
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_proc_place_computed ON processed_readings(place_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_proc_risk_score ON processed_readings(risk_score DESC);

-- 4. Source metadata & trust scoring
CREATE TABLE IF NOT EXISTS sources (
    source_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    code VARCHAR(32) NOT NULL, -- SOURCE A, SOURCE B, SOURCE C, etc.
    type VARCHAR(64) NOT NULL, -- official_gov, satellite_telemetry, river_sensor, crowd
    authenticity_score DOUBLE PRECISION NOT NULL DEFAULT 90.0,
    verified BOOLEAN NOT NULL DEFAULT TRUE,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(32) DEFAULT 'ACTIVE' -- ACTIVE, DELAYED, DEGRADED
);

-- 5. Individual per-source comparison rows tied to a processed snapshot
CREATE TABLE IF NOT EXISTS source_comparison (
    id VARCHAR(64) PRIMARY KEY,
    processed_id VARCHAR(64) REFERENCES processed_readings(id),
    source_id VARCHAR(64) REFERENCES sources(source_id),
    rainfall_mm DOUBLE PRECISION,
    water_level_m DOUBLE PRECISION,
    rain_probability_pct DOUBLE PRECISION,
    risk_level VARCHAR(32) NOT NULL
);

-- 6. Crowd-sourced / user reports (for ML verification pipeline)
CREATE TABLE IF NOT EXISTS user_reports (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    user_name VARCHAR(128) DEFAULT 'Anonymous Citizen',
    user_trust_score DOUBLE PRECISION DEFAULT 80.0,
    place_id VARCHAR(64) REFERENCES places_master(place_id),
    event_type VARCHAR(64) NOT NULL, -- rainfall, thunderstorm, flooding, heatwave, fog, dust storm, strong wind
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    media_url VARCHAR(512),
    source_url VARCHAR(512),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    authenticity_score DOUBLE PRECISION DEFAULT 85.0,
    verified_badge BOOLEAN DEFAULT FALSE,
    ml_verdict VARCHAR(64) DEFAULT 'VERIFIED_GENUINE', -- VERIFIED_GENUINE, SUSPECTED_ANOMALY, FLAGGED_MISLEADING
    status VARCHAR(32) DEFAULT 'APPROVED'
);

CREATE INDEX IF NOT EXISTS idx_user_reports_place ON user_reports(place_id, submitted_at DESC);

-- 7. Event categories
CREATE TABLE IF NOT EXISTS event_types (
    event_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    icon VARCHAR(16) NOT NULL,
    description TEXT
);
