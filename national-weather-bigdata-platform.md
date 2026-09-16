# National Weather Big Data Analytics Platform — Build Spec

> **Purpose of this file:** This is a step-by-step engineering brief for an AI coding agent (Gemini Flash 3.8 inside Antigravity IDE) to build a real-time, India-wide weather/flood/disaster big-data analytics platform. Follow the phases **in order**. Each phase has concrete deliverables, suggested tools, and acceptance checks. Do not skip Phase 1 (data layer) — it is the foundation the whole project depends on.

---

## 0. Project Summary

Build a platform that:
1. Continuously collects weather/disaster-related data (rainfall, flooding, water levels, heatwaves, fog, dust storms, thunderstorms, strong winds) for **every place in India — from the smallest village to the biggest metro city** — using population data to build the master place list.
2. Cleans, deduplicates, verifies, and classifies this data using ML/AI (detect fake/misleading reports, categorize event type, score source authenticity).
3. Syncs with fresh data **daily at minimum**, but architected to support real-time/near-real-time ingestion.
4. Displays processed data through a dashboard whose layout matches `layout.txt` (risk score, source comparison table, source consensus, risk timeline, source authenticity list).
5. Answers historical queries like *"where did it rain heavily last week/month/year"* — meaning all data must be timestamped, geotagged, and queryable, not just shown as a live snapshot.

---

## 1. Phase 1 — Data Collection Layer (THE MOST IMPORTANT PART)

Because this is a **big data** project, get the data pipeline right before writing any UI code.

### 1.1 Master "Places of India" dataset (population-ranked)
You need one canonical table of every Indian place (village → town → city → metro) so all weather data can be geotagged consistently.

Recommended sources (in priority order):
- **Census of India 2011 Village/Town Directory** (data.gov.in / censusindia.gov.in) — most granular, includes every village down to population counts.
- **data.gov.in** — search "Village Directory", "Town Directory", "Population Census" datasets (bulk CSV/API download).
- **India WRIS (India Water Resources Information System)** — for river basins, water levels, reservoir data, tied to location.
- **GeoNames.org India dump** (`IN.zip`) — free, lat/long + population for ~100k+ Indian places, good as a supplementary/normalizing dataset.
- **SimpleMaps India Cities Database** — free tier covers major cities with population, lat/long (good for the "big cities" layer).
- **Survey of India / Bhuvan (ISRO)** — administrative boundary shapefiles (state → district → tehsil → village) for geospatial joins.

**Action for agent:** Build a `places_master` table with columns:
`place_id, name, type (village/town/city/metro), state, district, tehsil, latitude, longitude, population, last_census_year, source`

### 1.2 Real-time / near-real-time weather & disaster data sources
| Category | Source | Access type | Notes |
|---|---|---|---|
| Official weather (rain, temp, wind, humidity) | **IMD (India Meteorological Department)** — mausam.imd.gov.in, city forecast API | Public site/API (some scraping needed) | Primary authoritative gov source |
| River / flood water levels | **Central Water Commission (CWC) — India-WRIS flood forecast**, ffs.india-wris.gov.in | Public dashboard/API | Real-time river gauge data |
| Satellite rainfall estimates | **NASA GPM IMERG**, **INSAT-3D/3DR (via MOSDAC — ISRO)** | Public API/FTP | Good for remote/rural areas with no ground station |
| Global weather API (backup/cross-check) | **Open-Meteo** (free, no key), **OpenWeatherMap**, **WeatherAPI.com** | REST API | Use as "Source B/C" for cross-verification like layout.txt shows |
| Disaster alerts | **NDMA (National Disaster Management Authority)**, **SACHET (Common Alerting Protocol - India)** | Public feed | Official flood/cyclone/heatwave alerts |
| Crowd-sourced reports | Twitter/X public posts, local news RSS feeds, citizen reports via your own app | Scraping/NLP + user submissions | This is where your ML fake-detection layer (Phase 4) matters most |
| Air/dust/fog | **CPCB (Central Pollution Control Board)** AQI data, **VIIRS/MODIS dust aerosol data** | Public API | For dust storms/fog category |

**Recommendation on "which IDE/tool to use for collecting this data":**
Antigravity IDE (with Gemini) is fine for writing the ingestion code, but the actual *infrastructure* to run collection jobs should be:
- **n8n** or **Apache Airflow** — for scheduling/orchestrating daily + intraday data pulls from each source (Airflow preferred once the number of sources grows past ~10, since it gives retries, logging, DAG visibility).
- **Python** (`requests`, `httpx`, `BeautifulSoup`/`playwright` for scraping IMD pages, `pandas` for cleaning) as the ingestion language — Gemini in Antigravity should generate these scripts.
- **Kafka** or a lightweight alternative (**Redpanda**, or even **PostgreSQL LISTEN/NOTIFY** for smaller scale) if you want true streaming ingestion later; for a v1 daily-sync system, a scheduled batch pipeline (Airflow cron, every 1–6 hours) is enough and much simpler to build first.

### 1.3 Data Collection acceptance checklist
- [ ] `places_master` table populated with population data for all of India (target: 500,000+ villages/towns/cities)
- [ ] At least 3–5 independent live weather/water-level sources wired up (to allow the "Source A/B/C/D" comparison seen in layout.txt)
- [ ] A scheduler (Airflow/n8n/cron) runs ingestion jobs at a fixed interval (start with every 1 hour, minimum once/day)
- [ ] Raw data lands in a "bronze/raw" storage layer before any cleaning (never overwrite raw data — always append with timestamp)

---

## 2. Phase 2 — Data Processing / ETL Layer

1. **Ingest (bronze layer):** store raw API/scrape responses as-is (JSON/CSV) with `source_name`, `fetched_at`, `place_id` (if resolvable).
2. **Clean & normalize (silver layer):**
   - Standardize units (mm for rainfall, °C for temp, km/h for wind, meters for water level).
   - Resolve place names to `place_id` from `places_master` (fuzzy match place names → coordinates via geocoding, e.g. `rapidfuzz` + lat/long snapping).
   - Deduplicate entries reporting the same event from the same source within a short time window.
3. **Aggregate (gold layer):** compute the fields shown in `layout.txt`:
   - `flood_risk_score` (0–100) — weighted formula from rainfall, soil saturation, water level, rain probability, wind.
   - `system_confidence` — % of sources agreeing on risk level.
   - `source_comparison` table — same indicator across all sources + the blended "SYSTEM" value.
   - `risk_timeline` — forecast risk at NOW / +3h / +6h / +12h / +24h using a simple trend/regression model initially (upgrade to a proper time-series model later, e.g. Prophet or an LSTM).
4. **Storage recommendation:**
   - **PostgreSQL + PostGIS + TimescaleDB extension** — one database that handles geospatial queries (place lookup, "what's near me") AND time-series queries ("what happened last month") efficiently. This is the best single choice for this project's scale.
   - Object storage (S3-compatible, e.g. Cloudflare R2 / MinIO) for raw bronze-layer dumps (satellite imagery, scraped HTML, large files).

---

## 3. Phase 3 — Database Schema (starting point)

```sql
-- Master place list
places_master(place_id, name, type, state, district, tehsil, lat, lon, population, source)

-- Raw ingested readings (append-only, time-series)
raw_readings(id, place_id, source_name, metric, value, unit, recorded_at, ingested_at, raw_payload JSONB)

-- Cleaned/aggregated per-place-per-hour snapshot
processed_readings(id, place_id, rainfall_mm, soil_saturation_pct, water_level_m,
                    rain_probability_pct, wind_kmh, risk_score, risk_level,
                    system_confidence_pct, computed_at)

-- Source metadata & trust scoring
sources(source_id, name, type, authenticity_score, last_updated_at, status)

-- Individual (per-source) comparison rows tied to a processed snapshot
source_comparison(id, processed_id, source_id, rainfall_mm, water_level_m,
                   rain_probability_pct, risk_level)

-- Crowd-sourced / user reports (for ML verification pipeline)
user_reports(id, user_id, place_id, event_type, description, media_url,
             submitted_at, authenticity_score, verified_badge BOOLEAN, status)

-- Event categories
event_types(event_id, name)  -- rainfall, thunderstorm, flooding, heatwave, fog, dust storm, strong wind
```

---

## 4. Phase 4 — ML / AI Layer

This directly implements the handwritten notes' point 4:

1. **Fake/misleading report detection** — classifier (start with a simple gradient-boosted model or even a Gemini-based prompt classifier) using features: user history, report text sentiment/consistency, media metadata (EXIF/geotag match), cross-check against nearby official sensor readings.
2. **Untrusted source verification** — cross-validate any new/unofficial source's reported values against the official sources (IMD/CWC) over a trial period before assigning it a trust weight.
3. **Deduplication** — embedding-based similarity (e.g. `sentence-transformers`) on report text + geospatial/time proximity to merge duplicate reports of the same event.
4. **Auto-categorization of events** — a text/data classifier that tags each report/reading into: `rainfall, thunderstorm, flooding, heatwave, fog, dust storm, strong wind`.
5. **Authenticity meter (per report):** score 0–100 shown on every report, computed from: source trust score, cross-source agreement, and (for user reports) submitter's track record.
6. **"Verified" tag for trusted users:** track each user's historical report accuracy (compare their past reports against confirmed outcomes) and auto-grant a verified badge above a threshold accuracy — mirrors the handwritten note exactly.

---

## 5. Phase 5 — Real-Time Sync Strategy

- **Minimum requirement (stated by user): full daily sync.** Implement this first as an Airflow DAG / n8n workflow that runs every 24h and refreshes `places_master` (weekly is enough for this, since population doesn't change daily) and pulls fresh readings for all monitored places.
- **Better target: hourly ingestion** for weather metrics (rainfall, wind, water level) since these change fast — most official APIs (IMD, CWC) update on 1–3 hour cycles anyway, so polling faster than that gains nothing.
- **True real-time layer (optional, phase-2 upgrade):** for crowd-sourced/user reports and social feeds, use a streaming ingestion (Kafka/Redpanda topic → consumer writes to `user_reports`) so new citizen reports appear within seconds, while official sensor data stays on the hourly/daily batch cycle.
- Track `last_synced_at` per source on the dashboard so users can see freshness (matches the "Updated 2 min ago" pattern in layout.txt).

---

## 6. Phase 6 — Backend API Layer

- Framework: **FastAPI** (Python) — pairs naturally with the Python ETL/ML code already being written, auto-generates OpenAPI docs.
- Key endpoints:
  - `GET /places/search?query=` — search any village/town/city
  - `GET /places/{place_id}/risk` — current risk card (matches layout.txt "CURRENT RISK")
  - `GET /places/{place_id}/sources` — source comparison table + authenticity list
  - `GET /places/{place_id}/timeline` — risk timeline (NOW/+3h/+6h/+12h/+24h)
  - `GET /places/{place_id}/history?from=&to=` — historical query support (e.g. "where did it rain heavily last month")
  - `POST /reports` — citizen/user submitted report (feeds ML pipeline)

---

## 7. Phase 7 — Frontend Dashboard (match `layout.txt`)

Build the UI to mirror the attached layout exactly:
1. Header: hazard type + location + status (MONITORING) + "Open in Map" + last-updated timestamp.
2. Current Risk card: risk label (HIGH/SEVERE/MODERATE), numeric score /100, progress bar, confidence %, "X of Y sources indicate elevated risk."
3. Key Indicators grid: rainfall, soil saturation, water level, rain probability, wind.
4. Source Comparison table: one row per indicator, one column per source + blended SYSTEM value.
5. Source Consensus block: X/Y sources → risk level breakdown + agreement %.
6. Risk Timeline: horizontal NOW/+3h/+6h/+12h/+24h risk-level strip.
7. Data Sources list: each source's name, last-updated time, verified badge, authenticity bar.

Suggested stack: **React + Tailwind CSS**, charts via **Recharts**, maps via **Leaflet/Mapbox** ("Open in Map" button), calling the FastAPI backend above.

---

## 8. Phase 8 — Testing, Monitoring & Deployment

- Add data-quality checks (e.g. **Great Expectations**) on the ETL pipeline: reject impossible values (negative rainfall, water level spikes with no upstream cause, etc.).
- Set up logging/alerting (source down, ingestion failure, authenticity score of a source dropping suddenly).
- Deploy: containerize with Docker; Postgres/TimescaleDB + FastAPI backend + Airflow scheduler + React frontend, each as its own service (docker-compose for dev, Kubernetes optional at scale).

---

## 9. Suggested Build Order for the Agent (Gemini Flash 3.8 in Antigravity)

1. Scaffold repo structure: `/ingestion`, `/etl`, `/ml`, `/api`, `/frontend`, `/db`.
2. Build `places_master` loader script (Census/data.gov.in/GeoNames import → Postgres).
3. Build one working ingestion script per data source (start with Open-Meteo since it needs no API key, then add IMD/CWC).
4. Set up PostgreSQL + PostGIS + TimescaleDB locally (Docker) and create schema from Section 3.
5. Write the ETL job that cleans raw readings into `processed_readings` + `source_comparison`, computing `risk_score`.
6. Wire up Airflow/n8n to run steps 3–5 on a schedule (start daily, move to hourly).
7. Build FastAPI endpoints (Section 6) on top of the processed tables.
8. Build the React dashboard matching `layout.txt`.
9. Add the ML layer (Section 4) once real report data starts flowing in — fake detection, categorization, authenticity meter, verified badges.
10. Add historical query support and monitoring/alerting last.

---

## 10. Open Questions to Resolve Early
- Which specific city/region to pilot first before scaling to all of India (recommended: start with Mumbai, since your prototype layout already references it).
- Budget/availability for paid APIs (OpenWeatherMap paid tier, Mapbox) vs fully free stack (Open-Meteo, Leaflet+OpenStreetMap).
- Where the app will be hosted (affects choice between self-hosted Airflow/Kafka vs managed cloud equivalents).
