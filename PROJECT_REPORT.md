# National Weather Big Data Analytics Platform

**Project Technical Report**

**Problem / System ID:** SIH-26069  
**Domain:** Weather, flood, and disaster intelligence for India  
**Presented as:** Ministry of Earth Sciences (MoES) / India Meteorological Department (IMD) command-console prototype  

**Local runtime:** FastAPI `http://localhost:8000` · React (Vite) `http://localhost:5173`  
**API documentation:** `http://localhost:8000/docs`

---

## 1. Abstract

This project is a **national-scale weather and disaster big-data analytics platform**. It ingests meteorological observations for a curated master list of Indian places, stores raw and processed time-series data, computes hazard-specific risk scores, compares multiple labelled sources, and presents results in a tactical command-console dashboard.

The implemented system is a **full-stack prototype**: Python FastAPI backend, SQLite local datastore (with a production PostgreSQL / PostGIS / TimescaleDB schema prepared), React + Tailwind CSS frontend, Leaflet geospatial map, hourly background sync, historical rainfall queries, and a **rule-based ML verification pipeline** for citizen reports (fake/misleading detection, event categorization, authenticity scoring, geospatial-textual deduplication).

**Live ground truth** is fetched from the **Open-Meteo** REST API (WMO weather codes and standard atmospheric fields). Additional sources (IMD AWS, CWC / India-WRIS, NASA GPM / INSAT, SDMA / citizen mesh) are modelled as **independent comparison channels** with calibrated authenticity weights and realistic inter-source variance. Historical archives are **seeded time-series** designed for query demonstration (last week / month / year / monsoon).

---

## 2. Introduction and Motivation

India faces concurrent, geographically diverse hazards: Western Ghats and Konkan flooding, Chota Nagpur and eastern thunderstorms, Thar heatwaves and dust storms, Indo-Gangetic winter fog, and Himalayan cloudburst / flash-flood corridors. Official data exist across **IMD**, **CWC / India-WRIS**, **ISRO MOSDAC**, **NDMA / SACHET**, and global satellite products such as **NASA GPM**. These feeds differ in latency, coverage, units, and trust.

A decision-support system therefore needs:

1. A **canonical place list** (village → tehsil → city → metro) so every reading is geotagged.
2. **Append-only raw storage** (bronze) plus cleaned aggregates (silver / gold).
3. **Cross-source comparison** and consensus, not a single number from one API.
4. **Historical query** (“where did it rain heavily last month?”), not only a live snapshot.
5. **Verification of citizen / unofficial reports** against sensors and linguistic red flags.

This report documents **what was built**, **which tools and data sources are used**, **how scoring and “ML” actually work**, and **what remains simulated versus live**.

---

## 3. Objectives

| ID | Objective | Status in this codebase |
|----|-----------|-------------------------|
| O1 | Master places dataset with census-style attributes | Implemented: **56** curated Indian locations |
| O2 | Multi-source ingestion (gov, hydro, satellite, global API, crowd) | Live: **Open-Meteo**. Others: connector modules + blended comparison layer |
| O3 | Bronze → Silver → Gold ETL with risk score 0–100 | Implemented (formula-based gold layer) |
| O4 | Dashboard matching command-console layout (risk, indicators, sources, timeline) | Implemented (`LayoutCard`) |
| O5 | Historical heavy-rainfall queries | Implemented (seeded 365-day archive, ~3-day sampling) |
| O6 | ML: fake detection, categorization, authenticity, dedup | Implemented as **interpretable heuristic models** (not trained neural nets) |
| O7 | Automated hourly sync + manual trigger | Implemented (`asyncio` worker; not Airflow) |
| O8 | Dual DB: SQLite local + Postgres production schema | SQLite used at runtime; `db/schema.sql` prepared for production |

---

## 4. Scope of the Current Implementation

**In scope**

- India-wide **pilot coverage** (metros, tier-2/3 cities, flood/heat/fog/dust/Himalayan hotspots).
- Seven hazard classes: thunderstorm, flooding, rainfall, heatwave, fog, dust storm, strong wind.
- Local developer run (Windows PowerShell, Python, Node).
- REST API + SPA dashboard + OpenAPI docs + API test script.

**Out of scope / not yet production-wired**

- Full Census 2011 village directory (target in spec: 500,000+ places). The spec lists data.gov.in, GeoNames, Survey of India / Bhuvan; the **runtime list is a curated 56-place sample**.
- Direct live HTTP clients to IMD, CWC FFS, MOSDAC, or NDMA SACHET (modules exist as **simulated / jittered connectors**).
- Apache Airflow, n8n, Kafka, Docker Compose, Kubernetes.
- Trained models (XGBoost, LSTM, Prophet, sentence-transformers, Gemini LLM classifiers).
- Great Expectations, EXIF/media forensics, paid OpenWeatherMap / Mapbox.

These gaps should be stated clearly in any academic or hackathon write-up.

---

## 5. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (Vite + React 18 + Tailwind CSS + Leaflet)            │
│  Port 5173 · proxies /api → FastAPI                             │
│  Views: Hazard telemetry · Pan-India map · Historical archive   │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP / JSON
┌──────────────────────────────▼──────────────────────────────────┐
│  FastAPI (Uvicorn) · Port 8000                                  │
│  CORS enabled · OpenAPI /docs                                   │
│  Startup: background hourly ingestion worker                    │
└───┬──────────────────────┬─────────────────────┬────────────────┘
    │                      │                     │
    ▼                      ▼                     ▼
 Ingestion            ETL / Gold              ML layer
 Open-Meteo           Risk formulas          Fake detector
 live_fetcher         Source blend           Classifier
 Collectors (sim)     Consensus              Authenticity bars
                      Timeline               Deduplicator
                      Data quality bounds
    │
    ▼
 SQLite  backend/weather_bigdata.db
 Tables: places_master, raw_readings, processed_readings,
         sources, source_comparison, user_reports,
         event_types, sync_logs
```

---

## 6. Technology Stack

### 6.1 Backend

| Component | Technology | Role |
|-----------|------------|------|
| Language | Python 3.10+ (developed/run on Python 3.x including 3.14 in local env) | ETL, API, ML heuristics, scheduler |
| Web framework | **FastAPI** (~0.135) | REST API, Pydantic models, auto OpenAPI |
| ASGI server | **Uvicorn** | Serves `backend.main:app` |
| HTTP client | `urllib.request` / optional `requests` | Open-Meteo live fetch |
| Validation | **Pydantic** | Citizen report payload (`CitizenReportIn`) |
| Local database | **SQLite** + WAL + foreign keys | Instant local run |
| Production schema (prepared) | **PostgreSQL + PostGIS + TimescaleDB** (`db/schema.sql`) | Geospatial + time-series at scale |
| Concurrency | `asyncio` + `run_in_executor` | Non-blocking hourly sync |
| Testing | FastAPI `TestClient` (`backend/test_api.py`) | Hazard, search, telemetry, sync checks |

No separate `requirements.txt` is checked into the repo; runtime dependencies observed: FastAPI, Uvicorn, Pydantic, Requests (documented in README).

### 6.2 Frontend

| Component | Technology | Role |
|-----------|------------|------|
| UI library | **React 18** | SPA |
| Bundler / dev server | **Vite 5** (`npm run dev`, port 5173) | HMR, `/api` proxy to `127.0.0.1:8000` |
| Styling | **Tailwind CSS 3**, PostCSS, Autoprefixer | Tactical dark command-console theme |
| Icons | **lucide-react** | Header / cards |
| Class names | **clsx** | Conditional CSS |
| Maps | **Leaflet 1.9** | Pan-India incident radar map (OpenStreetMap tiles) |
| Media | Unsplash / Mixkit URLs in seeded reports | Gallery / lightbox demos |

Charts library **Recharts** (mentioned in the build spec) is **not** used; risk is shown as ASCII bars and layout cards.

### 6.3 Tooling and development environment

| Tool | Use |
|------|-----|
| Git / local filesystem | Source control and project tree |
| Node.js 18+ (local env: Node 25 / npm 11) | Frontend install and Vite |
| PowerShell | `run_local.ps1`: seed + backend job + frontend |
| Cursor / Antigravity (spec origin) | Spec authored for an AI coding agent; implementation is this repository |
| Browser | Dashboard at localhost:5173 |

### 6.4 What was specified but not used as runtime infrastructure

The engineering brief (`national-weather-bigdata-platform.md`) recommends **Airflow or n8n**, **Kafka / Redpanda**, **pandas**, **BeautifulSoup / Playwright** for IMD scrape, **rapidfuzz**, object storage (R2 / MinIO), and **Docker**. The **shipped prototype** uses a Python in-process scheduler and SQLite instead.

---

## 7. Data Sources

### 7.1 Live source actually called at runtime

| Source | Type | Access | Variables used |
|--------|------|--------|----------------|
| **Open-Meteo** `https://api.open-meteo.com/v1/forecast` | Global weather API, no API key | REST, batched by lat/lon (chunks of 15) | `temperature_2m`, `relative_humidity_2m`, `apparent_temperature`, `precipitation`, `rain`, `weather_code` (WMO), `wind_speed_10m`, `wind_gusts_10m`, `surface_pressure`; hourly `precipitation_probability` |

Derived quantities in code:

- **6-hour rainfall proxy:** `precipitation × 3.5` when precipitation > 0.
- **Soil saturation proxy:** clamp of `humidity × 0.7 + precip × 3.5` to 20–98%.
- **River water level proxy:** `2.5 + rainfall_6h / 40` (metres), not a live CWC gauge.

WMO codes map into hazard families (e.g. 95/96/99 → thunderstorm; 45/48 → fog; 65/67/82 → flooding). Additional **IMD-style physical rules** override category (heat ≥ 39 °C; Rajasthan dust with dry air + gusts; dense fog from humidity + calm wind; gale from gusts ≥ 50 km/h).

On network failure, the fetcher **falls back** to default telemetry using each place’s `primary_hazard`.

### 7.2 Named official / institutional sources (architecture + UI)

These names appear in the dashboard, `sources` table, and collector modules. They implement the **Source A–E comparison** from the product layout.

| Code | Display name | Intended institution | Runtime behaviour |
|------|----------------|----------------------|-------------------|
| **SOURCE A** | IMD National AWS Network | India Meteorological Department (`mausam.imd.gov.in`) | Simulated variance around live Open-Meteo base; authenticity **96%** |
| **SOURCE B** | CWC / India-WRIS River Gauge | Central Water Commission flood forecast (`ffs.india-wris.gov.in`) | Simulated hydro-oriented jitter; authenticity **92%** |
| **SOURCE C** | NASA GPM / INSAT-3DR Satellite | NASA GPM IMERG + ISRO MOSDAC INSAT | Simulated satellite-like tighter rain variance; authenticity **98%** |
| **SOURCE D** | Open-Meteo & SDMA Ground Mesh | Open-Meteo + State DMA / SACHET-style mesh | Closest to live API; authenticity **88%** |
| **SOURCE E** | Citizen Telemetry & Auxiliary Mesh | Crowd / social / field reports | Wider jitter; authenticity **75%**; status ACTIVE vs STANDBY from risk, not hardcoded DELAYED |

Standalone collector files (`imd_collector.py`, `cwc_collector.py`, `satellite_gpm.py`, `ndma_collector.py`) generate **deterministic random jitter** around a base rainfall. The **hourly live path** is `live_fetcher.py` + `build_dynamic_sources()` in `etl/pipeline.py`.

### 7.3 Place-master / census sources (dataset provenance)

Each place row stores `source` text and `last_census_year` (typically **2011**). Documented provenance in schema and place records:

- **Census of India** population figures (sample metros/cities).
- **data.gov.in** / village–town directory (intended bulk source; not fully ingested).
- **GeoNames** (intended supplementary gazetteer).
- Local agencies mentioned on individual rows (e.g. MCGM for Mumbai).

### 7.4 Historical archive

The seeder writes rainfall time-series into `raw_readings` labelled **"IMD Station Network"**:

- Window: **365 days**, sampled every **3 days**.
- Seasonality: monsoon months **June–September** get higher rainfall.
- Extreme places (Mawsynram, Cherrapunji, Mumbai, Chiplun, Wayanad, etc.) get heavier monsoon draws.

This is **synthetic historical big data** for the query engine, not a dump of official IMD daily station files.

### 7.5 Citizen / media content

Seeded reports use **Unsplash** stills and a **Mixkit** video URL as demonstration media. User-submitted reports accept optional `media_url` / `source_url`.

---

## 8. Master Places Dataset

**Count:** 56 locations (`INDIAN_PLACES_MASTER` in `backend/etl/master_places.py`).

**Attributes:** `place_id`, `name`, `type` (metro / city / town / village / tehsil), `state`, `district`, `tehsil`, `latitude`, `longitude`, `population`, `last_census_year`, `source`, plus `primary_hazard` for fallback categorization.

**Stratification (examples):**

- Metros: Mumbai, Delhi, Kolkata, Chennai, Bengaluru, Hyderabad, Ahmedabad, Pune, …
- Flood / monsoon: Chiplun, Karjat, Wayanad, Patna, Guwahati, …
- Extremes: Mawsynram, Cherrapunji, Phalodi, Dras, Joshimath, …
- Heat / dust: Vidarbha, Rajasthan (Jaisalmer, Phalodi), …
- Fog: Indo-Gangetic stations including Delhi.

This is a **representative national sample**, not a complete village census.

---

## 9. Data Model and Big-Data Layering

### 9.1 Medallion-style layers

| Layer | Table / artefact | Purpose |
|-------|------------------|---------|
| **Bronze** | `raw_readings` | Append-only metric + `raw_payload` JSON (Open-Meteo current observation blob) |
| **Silver** | Normalization in Python | Units mm, °C, km/h, m; place snap via `place_id`; quality bounds |
| **Gold** | `processed_readings` + `source_comparison` | Hazard type, blended indicators, risk score/level, system confidence, consensus text |

### 9.2 Core tables (SQLite)

- `places_master` — gazetteer.
- `raw_readings` — time-series bronze.
- `processed_readings` — latest gold snapshot per place (insert/replace on sync).
- `sources` — trust metadata (authenticity, verified flag, status).
- `source_comparison` — per-source rainfall, water level, rain probability, risk level.
- `user_reports` — citizen submissions + ML verdict fields.
- `event_types` — canonical hazard taxonomy.
- `sync_logs` — ingestion job audit.

Production SQL (`db/schema.sql`) uses `TIMESTAMP WITH TIME ZONE` and `JSONB` for payloads; comments enable **uuid-ossp**, **PostGIS**, **TimescaleDB**.

### 9.3 Data quality

`backend/etl/data_quality.py` clamps physically impossible values (e.g. rainfall 0–1500 mm, temperature −45–60 °C covering Dras to Phalodi, wind up to 350 km/h). This is a **rules engine**, not Great Expectations.

---

## 10. ETL, Risk Scoring, Consensus, and Timeline

### 10.1 Pipeline flow (hourly / manual sync)

1. Load 56 places.
2. Batch-fetch Open-Meteo.
3. Classify **active hazard** from WMO + thresholds.
4. Build five source rows with independent jitter.
5. Compute **gold** blended rainfall, soil, water, wind, humidity.
6. `calculate_hazard_risk_score` → integer **0–100** and level **LOW / MODERATE / HIGH / SEVERE**.
7. Persist processed row, comparison rows, bronze raw row, update `SYNC_STATE` and `sync_logs`.

### 10.2 Hazard-specific risk formulas (gold model)

These are **weighted physical heuristics**, not a learned regressor.

| Hazard | Scoring idea |
|--------|----------------|
| Thunderstorm | Gusts (cap 40) + 6h rain (cap 35) + humidity (cap 25) |
| Flooding / rainfall | Rain 35% + soil 25% + water level 25% + wind 15% |
| Heatwave | Temperature bands (≥45 °C → 95, ≥42 → 85, …) aligned with severe Indian heat |
| Fog | Humidity + calm wind thresholds |
| Dust storm | Gust intensity × dryness |
| Strong wind | max(wind, gusts) scaled to 80 km/h |

Levels: **SEVERE ≥ 82**, **HIGH ≥ 62**, **MODERATE ≥ 38**, else **LOW**. Scores clamped 10–98.

### 10.3 Source consensus

Majority risk level across five sources; **agreement %** = share of sources on the top level; **elevated** = HIGH + SEVERE count. Confidence label HIGH / MODERATE / LOW from agreement.

### 10.4 Risk timeline (NOW, +3h, +6h, +12h, +24h)

**Rule-based scenario curves**, not Prophet/LSTM:

- Thunderstorm / dust: peak soon, decay by +12h/+24h.
- Flood / rain: crest around +6h.
- Heatwave: afternoon build then night drop.
- Fog: morning peak, afternoon clear, night return.

---

## 11. Machine Learning and AI — What Is Actually Used

The product language is “ML / AI pipeline.” The **implemented algorithms are classical, transparent, non-trained models**. No PyTorch, scikit-learn, Hugging Face, or LLM API is imported in `backend/ml/`.

This is appropriate to report as **rule-based / knowledge-based AI** or **heuristic ML-style scoring**, not as deep learning.

### 11.1 Fake / misleading report detector (`fake_detector.py`)

**Type:** Pattern matching + sensor corroboration scoring.

**Inputs:** report text, user trust score (default 80), media flag, nearby rainfall and water level.

**Methods:**

1. **Sensationalism regexes** (e.g. “entire city underwater”, “tsunami coming”, “apocalypse”) — penalty up to 25 each, cap 50.
2. **Excessive ALL CAPS** (>45% of words) — +15 penalty.
3. **Excessive exclamation marks** (≥3) — +10 penalty.
4. If text claims flood/waterlog/submerge: **boost +12** if rainfall > 50 mm or water > 3.5 m; **penalty −30** if sensors are dry (<5 mm and water < 2 m).
5. Media attachment: **+8**.

**Outputs:** `authenticity_score` 5–99; verdict **VERIFIED_GENUINE** (≥75), **SUSPECTED_ANOMALY** (≥50), **FLAGGED_MISLEADING**; `verified_badge`; anomaly flags.

This is **not** a gradient-boosted or neural fake-news classifier. It is a **feature-engineered expert system**.

### 11.2 Event auto-categorization (`classifier.py`)

**Type:** Keyword lexicon + optional sensor boosts.

**Classes:** rainfall, flooding, thunderstorm, heatwave, fog, dust storm, strong wind.

**Method:** count keyword hits per class; add telemetry bonuses (e.g. water ≥ 4 m or rain ≥ 70 mm → flooding). Argmax category; confidence from score share.

Default if no matches: **rainfall** at 0.5 confidence.

### 11.3 Authenticity meter (`authenticity.py`)

**Type:** Display + threshold logic.

- 20-segment ASCII bar (`█` / `░`) matching the console layout.
- Verified if source `verified` or score ≥ 75; DELAYED sources lose verified badge.

### 11.4 Deduplication (`deduplicator.py`)

**Type:** Geospatial + lexical similarity (not embeddings).

- **Haversine** distance; default merge radius **6 km**.
- **Jaccard similarity** on whitespace tokens; default threshold **0.45**.

Spec mentioned **sentence-transformers**; that is **not implemented**.

### 11.5 Hazard classification on live weather

`determine_hazard_category` in `live_fetcher.py` is a **decision tree of physical thresholds + WMO codes** (operational meteorology rules, not a trained weather-type CNN).

### 11.6 Models explicitly *not* in the repository

| Spec idea | Implementation |
|-----------|----------------|
| Gemini / LLM report classifier | Not used |
| Gradient boosting / sklearn | Not used |
| LSTM / Prophet timeline | Not used — heuristic curves |
| sentence-transformers dedup | Not used — Jaccard + Haversine |
| EXIF geotag match | Not used |

**Honest report sentence:** *The platform uses interpretable AI: regex and lexicon NLP, sensor cross-validation, geospatial Jaccard deduplication, and physically motivated risk equations. It does not currently host trained neural networks.*

---

## 12. Application Features (User-Facing)

### 12.1 Hazard-first command console

- Category chips: All hazards, thunderstorm, flooding, heavy rain, heatwave, dense fog, dust storm, strong wind, with **live counts**.
- Selecting a category loads ranked stations and **auto-selects the highest-risk place**.
- Search matches **place names and hazard keywords** (e.g. typing “flooding”).

### 12.2 Station telemetry card (layout.txt analogue)

- Header: hazard, place, state, population, MONITORING status, open-in-map.
- Current risk: level, score / 100, ASCII bar, warning notice, confidence, consensus summary.
- Key indicators: rainfall (6h), soil saturation, water level, rain probability, wind.
- Source comparison table: Rainfall, Water Level, Rain Chance, Risk Level across Sources A/B/C vs **SYSTEM**.
- Consensus breakdown and agreement percentage.
- Timeline NOW → +24h.
- Data sources list with authenticity bars, verified badges, freshness labels.

### 12.3 Pan-India surveillance map

- Leaflet map of incidents / stations.
- Filter by hazard category.
- Select marker → jump to that place’s telemetry card.
- Pulse-style tactical styling.

### 12.4 Historical big-data archive

- Query: last week / month / year / monsoon.
- Minimum rainfall slider, optional state and category filters.
- Ranked leaderboard of heavy rainfall events.
- Per-place rainfall history endpoint.
- Media gallery + lightbox for report imagery.

### 12.5 Citizen reporting

- Modal to submit title, description, event type, optional media.
- Backend runs classifier + fake detector, stores `ml_verdict` and authenticity.
- Toast: processed and verified by ML engine.

### 12.6 Ingestion control

- Header shows last sync, countdown, records ingested.
- **SYNC SOURCES** POSTs `/api/sync/trigger` for on-demand India-wide Open-Meteo refresh.
- Background worker every **3600 seconds**.

### 12.7 Theming

Edgy minimalist **tactical command console**: dark navy/black, cyan accents, monospace labels, live pulse indicators.

---

## 13. Backend API Catalogue

Base URL: `http://localhost:8000` (frontend uses relative `/api` via Vite proxy).

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/hazards/summary` | Counts / status per hazard |
| GET | `/api/hazards/{category}/places` | Places currently under a hazard |
| GET | `/api/map/incidents` | Map markers + last-updated |
| GET | `/api/places/search` | Name or category search |
| GET | `/api/places/{place_id}` | Gazetteer record |
| GET | `/api/places/{place_id}/layout-telemetry` | Full dashboard payload |
| GET | `/api/history/query` | Heavy rainfall leaderboard |
| GET | `/api/places/{place_id}/history` | Place time-series |
| POST | `/api/reports` | Citizen report + ML scoring |
| GET | `/api/reports` | List reports |
| GET | `/api/sync/status` | Scheduler telemetry |
| POST | `/api/sync/trigger` | Manual multi-source sync |
| GET | `/docs` | Swagger UI |

---

## 14. Scheduler and Sync Strategy

| Requirement in spec | Implementation |
|---------------------|----------------|
| Daily minimum sync | Exceeded: **hourly** (`sync_interval_seconds = 3600`) |
| Airflow DAG / n8n | Replaced by FastAPI **startup asyncio loop** (tick every 10 s, decrement countdown) |
| Manual refresh | `/api/sync/trigger` |
| Audit | `sync_logs` SUCCESS/FAILED |

---

## 15. Frontend Module Map

| File | Responsibility |
|------|----------------|
| `App.jsx` | View routing, polling (8 s), category/place state, sync, toasts |
| `TacticalHeader.jsx` | Branding, view tabs, sync countdown, report button |
| `CategoryBar.jsx` | Hazard chips |
| `PlaceSearch.jsx` | Combined place/category search |
| `LayoutCard.jsx` | Risk / indicators / sources / timeline |
| `TacticalRadarMap.jsx` | Leaflet India map |
| `HistoricalQuery.jsx` | Archive filters and tables |
| `MediaGallery.jsx` / `MediaLightbox.jsx` | Evidence media |
| `CitizenReportModal.jsx` | Report form |
| `index.css` | Tailwind layers, tactical palette |

---

## 16. Testing

`backend/test_api.py` (run against in-process TestClient):

1. Hazard summary contains thunderstorm, flooding, heatwave, fog.
2. Category places for thunderstorm returns count > 0.
3. Search `query=heatwave` returns stations.
4. Mumbai `layout-telemetry` has header, risk, indicators, 4 comparison rows, 5 data sources; Source E not statically DELAYED.
5. Sync status is ACTIVE with interval hours.

Frontend has no dedicated Jest/Vitest suite in-repo; verification described in `walkthrough.md`.

---

## 17. How to Run (for the report appendix)

**Requirements:** Python 3.10+, Node.js 18+.

```powershell
python -m backend.seed
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
cd frontend
npm run dev
```

Or `.\run_local.ps1` (re-seeds then starts both).

- UI: http://localhost:5173  
- API docs: http://localhost:8000/docs  

---

## 18. Limitations (required for an honest report)

1. **Place coverage** is 56 sites, not all Indian villages.
2. **Only Open-Meteo is live**; IMD/CWC/GPM/NDMA are **emulated comparison channels** for multi-source UX and consensus maths.
3. **Water level and soil saturation** are derived proxies, not CWC gauges or soil probes.
4. **Historical rainfall** is generated with seasonal random draws.
5. **ML is heuristic**; no labelled training set, no model metrics (precision/recall of a neural classifier).
6. **Production DB** (Timescale/PostGIS) is schema-only; runtime is SQLite.
7. **Source freshness labels** in telemetry are largely **role-based strings** (e.g. “Updated 2 min ago”), not exact NTP timestamps per agency API.
8. No authentication, rate limiting, or multi-user identity for verified-reporter reputation over time (trust score is a field, not a learned reputation model).

---

## 19. Future Work

1. Connect real IMD AWS / nowcast, CWC FFS, MOSDAC, SACHET CAP feeds.
2. Load Census / GeoNames gazetteer to district–village scale.
3. Train a report classifier on labelled NDMA/IMD bulletins; evaluate F1.
4. Replace timeline heuristics with a time-series model (Prophet or LSTM) once history is real.
5. Embeddings for near-duplicate reports.
6. Docker Compose: Postgres+Timescale, FastAPI, Vite/Nginx, optional Airflow.
7. Great Expectations on bronze payloads; alerting when a source authenticity collapses.
8. Auth (OAuth / government SSO) and audit logs for operational use.

---

## 20. Conclusion

The National Weather Big Data Analytics Platform is a **working end-to-end prototype** of a multi-hazard Indian weather intelligence console. It demonstrates:

- a **places-first** geotagged data model,
- **live Open-Meteo ingestion** with WMO-based hazard typing,
- a **bronze/silver/gold** SQLite pipeline,
- **multi-source comparison and consensus** (five labelled channels),
- **historical query** over a year-scale archive,
- **citizen report verification** using explicit NLP and sensor-check rules,
- and a **tactical React dashboard** (Leaflet map, category navigation, sync control).

For evaluation, it should be judged as an **integrated systems and data-engineering project with interpretable AI**, with a clear path to replace simulated agency feeds and heuristic models with operational APIs and trained models.

---

## 21. Repository Map (for examiners)

```
platform/
  README.md
  national-weather-bigdata-platform.md   # original engineering spec
  walkthrough.md
  run_local.ps1
  db/schema.sql                          # PostgreSQL / PostGIS / Timescale
  db/sqlite_schema.sql
  backend/main.py                        # FastAPI
  backend/database.py
  backend/seed.py
  backend/scheduler.py
  backend/ingestion/                     # live_fetcher + source connectors
  backend/etl/                           # places, pipeline, data_quality
  backend/ml/                            # detector, classifier, authenticity, dedup
  frontend/src/                          # React command console
```

---

## 22. References and Official Portals (cited by the system)

1. India Meteorological Department — https://mausam.imd.gov.in  
2. Central Water Commission / India-WRIS flood forecast — https://ffs.india-wris.gov.in  
3. ISRO MOSDAC (INSAT precipitation) — https://www.mosdac.gov.in  
4. NDMA SACHET — https://sachet.ndma.gov.in  
5. Open-Meteo API documentation — https://open-meteo.com  
6. NASA Global Precipitation Measurement (GPM) / IMERG (conceptual Source C)  
7. Census of India 2011 Village/Town Directory; data.gov.in (gazetteer intent)  
8. WMO weather interpretation codes (used via Open-Meteo `weather_code`)  
9. Leaflet / OpenStreetMap — geospatial basemap  
10. FastAPI, Uvicorn, React, Vite, Tailwind CSS — implementation stack  

Internal design sources: `national-weather-bigdata-platform.md`, `layout.txt`, `README.md`.

---

## 23. One-Page Summary Table (copy into slides)

| Topic | Answer |
|-------|--------|
| Project name | National Weather Big Data Analytics Platform |
| Problem ID | SIH-26069 |
| Frontend | React 18, Vite 5, Tailwind CSS, Leaflet, lucide-react |
| Backend | Python FastAPI, Uvicorn, Pydantic, asyncio scheduler |
| Database | SQLite locally; PostgreSQL+PostGIS+Timescale schema prepared |
| Live data | Open-Meteo forecast/current API (batched) |
| Other sources | IMD, CWC, NASA GPM/INSAT, SDMA, citizen mesh (modelled A–E) |
| Places | 56 census-tagged Indian locations |
| Hazards | 7 categories (storm, flood, rain, heat, fog, dust, wind) |
| ETL | Bronze raw JSON → gold risk + 5-way comparison |
| Risk model | Weighted physical formulas, 0–100, 4 levels |
| “ML” | Regex sensationalism, lexicon classifier, Jaccard+Haversine dedup, authenticity bars |
| History | ~1 year synthetic rainfall every 3 days |
| Sync | Hourly + manual |
| Ports | 5173 UI, 8000 API |
