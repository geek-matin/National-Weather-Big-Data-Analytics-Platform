-- ==============================================================================
-- National Weather Big Data Analytics Platform (MoES / IMD - SIH 2026)
-- PostgreSQL + PostGIS Initialization Schema
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Ingestion Sources Definition
CREATE TABLE IF NOT EXISTS sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,          -- 'reddit', 'citizen_report', 'rss_imd', 'synthetic', 'news_ndma'
    trust_weight FLOAT DEFAULT 0.5               -- Base credibility weight
);

-- 2. Weather & Disaster Events Primary Datastore
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id INTEGER REFERENCES sources(id),
    raw_text TEXT NOT NULL,
    hashtags TEXT[],
    posted_at TIMESTAMPTZ,
    ingested_at TIMESTAMPTZ DEFAULT now(),
    city VARCHAR(100),
    state VARCHAR(100),
    latitude FLOAT,
    longitude FLOAT,
    location GEOGRAPHY(POINT, 4326),             -- PostGIS geospatial point
    category VARCHAR(30) NOT NULL,               -- rainfall | thunderstorm | flood | heatwave | fog | dust_storm | strong_wind | other
    category_confidence FLOAT DEFAULT 0.8,
    trust_score FLOAT DEFAULT 0.5,               -- Composite credibility score (0.0 to 1.0)
    is_verified BOOLEAN DEFAULT FALSE,
    is_duplicate_of UUID REFERENCES events(id),
    media_urls TEXT[],
    author_handle VARCHAR(150),
    severity VARCHAR(20) DEFAULT 'MODERATE'      -- ADVISORY | MODERATE | SEVERE | CRITICAL
);

-- Indexes for Big Data query performance
CREATE INDEX IF NOT EXISTS idx_events_location ON events USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_events_category ON events (category);
CREATE INDEX IF NOT EXISTS idx_events_posted_at ON events (posted_at);
CREATE INDEX IF NOT EXISTS idx_events_city ON events (city);
CREATE INDEX IF NOT EXISTS idx_events_trust_score ON events (trust_score);

-- 3. Crowdsourced Citizen Field Reports
CREATE TABLE IF NOT EXISTS citizen_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    reporter_name VARCHAR(150),
    contact_optional VARCHAR(150),
    photo_url TEXT,
    submitted_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Disaster Clusters & Automated Alerts
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    category VARCHAR(30) NOT NULL,
    region VARCHAR(100) NOT NULL,
    event_count INTEGER DEFAULT 1,
    severity VARCHAR(20) DEFAULT 'HIGH',
    created_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Pre-seed Ingestion Sources
INSERT INTO sources (id, name, trust_weight) VALUES
    (1, 'rss_imd', 0.95),
    (2, 'news_ndma', 0.90),
    (3, 'citizen_report', 0.70),
    (4, 'reddit', 0.60),
    (5, 'synthetic', 0.50)
ON CONFLICT (id) DO NOTHING;
