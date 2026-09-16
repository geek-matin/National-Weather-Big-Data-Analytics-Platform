# National Weather Big Data Analytics Platform

### Ministry of Earth Sciences (MoES) // India Meteorological Department (IMD)
Real-time, India-wide weather, flood, and disaster big-data analytics platform engineered according to **[national-weather-bigdata-platform.md](file:///c:/Users/mateen/Desktop/platform/national-weather-bigdata-platform.md)** and **[layout.txt](file:///c:/Users/mateen/Desktop/platform/layout.txt)** with an **edgy minimalist command console theme**.

---

## Key Capabilities

1. **Master "Places of India" Census Dataset (Phase 1)**:
   - Population-ranked database covering Metros (Mumbai, Delhi, Bengaluru, etc.), Tier-2/3 Cities, Towns, Tehsils, and extreme-weather Villages (Mawsynram, Cherrapunji, Chiplun, Karjat, Wayanad, Joshimath, Phalodi, Dras).
   - Standardized columns: `place_id, name, type, state, district, tehsil, latitude, longitude, population, last_census_year, source`.

2. **Multi-Source Ingestion Layer (Phase 1 & 2)**:
   - **Source A**: IMD National Weather Services (official calibrated ground stations).
   - **Source B**: Central Water Commission (CWC / India-WRIS hydrological flood gauges).
   - **Source C**: NASA GPM / ISRO INSAT-3D MOSDAC satellite precipitation radar.
   - **Source D**: Open-Meteo live ground API & SDMA sensor mesh.
   - **Source E**: Auxiliary field telemetry & citizen reports (delayed status / warning).

3. **Bronze → Silver → Gold ETL Pipeline (Phase 2)**:
   - **Bronze**: Append-only time-series raw telemetry logs.
   - **Silver**: Normalization to metric units (`mm`, `°C`, `km/h`, `m`), coordinate snapping, and deduplication.
   - **Gold**: Blended SYSTEM indicator, weighted flood risk score ($0-100$), system confidence, and consensus distribution.

4. **1-to-1 Match with `layout.txt` (Phase 7)**:
   - Exact visual layout: Risk Level (`HIGH`), Flood Risk Score (`78 / 100`), ASCII progress blocks (`████████████████░░░░`), notice warning, key indicators, source comparison table (`Source A, B, C vs SYSTEM`), source consensus breakdown (`4 / 5 HIGH RISK | Agreement: 87%`), risk timeline (`NOW, +3h, +6h, +12h, +24h`), and data sources authenticity bars.

5. **Historical Big Data Query Engine (Section 0.5 & Phase 6)**:
   - Answers: *"Where did it rain heavily last week / month / year?"*
   - Queryable across 365 days of timestamped and geotagged time-series readings with minimum rainfall sliders, state filters, and ranked leaderboards.

6. **Machine Learning & Verification Pipeline (Phase 4)**:
   - **Fake / Misleading Detection**: Evaluates sensationalism/panic keywords and cross-validates claims against physical ground station sensor readings.
   - **Auto-Categorization**: Categorizes bulletins into `rainfall, flooding, thunderstorm, heatwave, fog, dust storm, strong wind`.
   - **Authenticity Meter**: Calibrated $0-100\%$ score with verified badge assignment.

7. **Automated Ingestion Scheduler (Phase 5)**:
   - Continuous background worker executing automated hourly & daily sync cycles with countdown timer and manual on-demand trigger.

8. **Dual Database Architecture (Phase 3)**:
   - `db/schema.sql`: Production PostgreSQL + PostGIS + TimescaleDB schema.
   - `db/sqlite_schema.sql` & `backend/database.py`: Local instant-run SQLite engine.

---

## Quick Start

### 1. Requirements
- Python 3.10+ (FastAPI, Uvicorn, Requests)
- Node.js 18+ (Vite, React)

### 2. Run Database Seeder
```powershell
python -m backend.seed
```

### 3. Launch Backend (Port 8000)
```powershell
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### 4. Launch Frontend (Port 5173)
```powershell
cd frontend
npm run dev
```

Visit: **http://localhost:5173**
API Documentation: **http://localhost:8000/docs**
