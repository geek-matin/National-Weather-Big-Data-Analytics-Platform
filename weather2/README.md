# National Weather Big Data Analytics Platform
### SIH 2026 — Problem Statement ID 26069 | Ministry of Earth Sciences (MoES) | Department: IMD
**Theme**: Disaster Management | **Category**: Software | **Console Node**: IN-DEL-01

---

## 1. Executive Summary

This platform is an enterprise-grade, real-time meteorological intelligence and crisis analysis pipeline built for the **India Meteorological Department (IMD)** and disaster response authorities (NDMA/SDRF/NDRF).

It ingests real-time weather observations, warnings, and citizen reports across India from multiple disparate sources (Reddit, RSS/News, Open Data, Crowdsourced Citizen Telemetry, and Synthetic Big Data Generators), streams them through a decoupled message bus, executes a multi-stage NLP & Machine Learning pipeline, and visualizes live geospatial threat clusters on an **edgy, high-contrast tactical disaster command terminal**.

---

## 2. System Architecture & Data Flow

```
                     ┌────────────────────────────────────────────┐
                     │              INGESTION SOURCES             │
                     │  Reddit API │ RSS/News │ Citizen Form │ Synthetic Gen │
                     └───────────────────────┬────────────────────┘
                                             │  (produce)
                                             ▼
                                 ┌───────────────────────┐
                                 │   Kafka / Stream Bus: │
                                 │   raw-weather-events  │
                                 └───────────┬───────────┘
                                             │  (consume)
                                             ▼
                         ┌──────────────────────────────────────┐
                         │        ML PROCESSING ENGINE          │
                         │  1. Keyword & #IMD Hashtag Filter    │
                         │  2. Indian NER & Nominatim Geocoding │
                         │  3. Rule + ML Category Classifier    │
                         │  4. Heuristic Trust & Fake Detection │
                         │  5. MiniLM & Cosine Deduplication    │
                         └───────────────────┬──────────────────┘
                                             │ (clean, enriched record)
                                             ▼
                         ┌──────────────────────────────────────┐
                         │   PostgreSQL + PostGIS / SQLite DB   │
                         └───────────────────┬──────────────────┘
                                             │
                         ┌───────────────────┴──────────────────┐
                         ▼                                      ▼
                ┌─────────────────┐                    ┌──────────────────┐
                │   FastAPI REST  │                    │ WebSocket Stream │
                │   Endpoints     │                    │ /events/stream   │
                └────────┬────────┘                    └─────────┬────────┘
                         │                                       │
                         └───────────────┬───────────────────────┘
                                         ▼
                            ┌─────────────────────────┐
                            │ Tactical React Console  │
                            │ (Leaflet Map, Telemetry │
                            │ Feed, Recharts, Alerts) │
                            └─────────────────────────┘
```

---

## 3. Technology Stack & Key Architectural Decisions

| Layer | Technology | Architectural Rationale |
|---|---|---|
| **Streaming Bus** | Apache Kafka / Redpanda *(with native Async Queue fallback)* | Decouples high-velocity ingestion connectors from ML workers; scales horizontally during extreme disaster events. |
| **Ingestion Connectors** | Reddit (PRAW), RSS (Feedparser), Citizen Web Form, Synthetic Simulator | Combines authentic social chatter with verified government bulletins and high-throughput simulation for live demos. |
| **Geocoding & NER** | Indian Meteorological Gazetteer (150+ stations) + Nominatim OSM | Zero-latency local geocoding cache with fallback to OpenStreetMap, strictly rate-limited to avoid API penalties. |
| **Event Categorization** | Prioritized Keyword Rules + Scikit-Learn TF-IDF Logistic Regression | Provides explainable instant classification for 8 disaster categories (`rainfall`, `flood`, `thunderstorm`, `heatwave`, `fog`, `dust_storm`, `strong_wind`, `other`). |
| **Credibility & Fake Detection** | Multi-factor Heuristic Trust Scorer + Corroboration Engine | Penalizes clickbait and sensationalist rumors; cross-references geographical clusters before granting verified disaster status. |
| **Deduplication Engine** | Character/Word N-Gram Embeddings + Cosine Similarity | Identifies near-duplicate reports within the same city and time window (>82% threshold), linking duplicates to canonical records. |
| **Datastore** | PostgreSQL + PostGIS *(with dual-engine SQLite fallback)* | Native geospatial queries for regional radius alerts; dual-engine ensures 100% zero-configuration local execution. |
| **Backend REST & WebSocket** | FastAPI (Python 3.11+) | Async architecture, high throughput, auto-generated OpenAPI `/docs`, and sub-second WebSocket event streaming. |
| **Frontend UI Console** | React 18 + Vite + Tailwind CSS + Leaflet.js + Recharts | **Edgy, tactical disaster operations aesthetic**: deep obsidian theme, razor-sharp 1px borders, monospace telemetry numbers, glowing radar blips. |

---

## 4. Quick Start (Running on Localhost)

### Option A: Zero-Docker Single-Click Launch (Windows PowerShell)
The easiest way to run the full stack locally:
```powershell
./run_local.ps1
```
This script will:
1. Initialize the SQLite database and seed 30+ benchmark historical Indian weather disaster records.
2. Launch the FastAPI backend on `http://localhost:8000`.
3. Launch the React Tactical Command Console on `http://localhost:5173`.

### Option B: Manual Execution
1. **Backend & Seed Setup**:
   ```bash
   python seed_data.py
   python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
   ```
2. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. Open your browser at `http://localhost:5173`.
4. API Documentation available at `http://localhost:8000/docs`.

### Option C: Full Enterprise Docker Compose
If Docker Desktop is running:
```bash
docker compose up --build
```
This launches PostGIS, Redpanda, FastAPI Backend, ML Worker, and React Frontend in isolated containers.

---

## 5. Hackathon 3-Minute Judge Presentation Script

Use this sequence to wow judges during the SIH evaluation:

1. **The Tactical Command Terminal (0:00 - 0:45)**:
   - Point out the **edgy tactical design**: *"Unlike generic AI landing pages, this is a purpose-built IMD Crisis Operations Terminal."*
   - Show the **Leaflet map** showing color-coded radar signals across India (red for critical floods in Mumbai/Chennai, orange for Delhi heatwaves, blue for cyclonic winds in Odisha).
   - Point out the live **IST/UTC clock**, system status beacon, and the **Active Crisis Alert Banner** triggered by multi-report disaster clusters.

2. **Real-time Live Ingestion & WebSocket Streaming (0:45 - 1:30)**:
   - Click the **`[ ⚡ SIMULATE INGESTION ]`** button in the header.
   - Watch the new incident card immediately slide into the **Live Feed Panel** over WebSocket without page refresh, accompanied by its radar blip popping onto the map.
   - Show how the ML pipeline auto-calculated the **Trust Score** (e.g. 88%) and tagged the category (`FLOOD`).

3. **Fake News Detection & Deduplication (1:30 - 2:05)**:
   - Scroll down the live feed and highlight an **UNVERIFIED RUMOR** post: explain how the sensationalism filter penalized shouting and clickbait keywords, flagging it as unverified (18% trust).
   - Point to a **`[ NEAR-DUPLICATE CLUSTER ]`** badge: explain how the cosine similarity deduplication engine linked the post to the earlier canonical incident.

4. **Crowdsourced Citizen Telemetry (2:05 - 2:35)**:
   - Click **`[ + CITIZEN REPORT ]`**.
   - Click **`[ LOCK GPS NOW ]`** to capture browser coordinates via the Geolocation API.
   - Enter a quick report: *"Severe waterlogging at Connaught Place outer circle, traffic blocked #IMD"*.
   - Click **TRANSMIT REPORT**: show how it immediately processes through the ML worker and appears live on the map.

5. **Human-in-the-Loop Operator Moderation (2:35 - 3:00)**:
   - Click **`[ MODERATION ]`** in the header.
   - Explain: *"IMD is a government authority; autonomous AI without oversight is a liability. Our duty officer can audit flagged reports and 1-click override their verification state."*
   - Show the **Recharts analytics HUD** at the bottom (Category Breakdown, Incident Frequency over time, and Regional Severity Matrix).

---

## 6. Directory Structure

```
weather2/
├── backend/                  # FastAPI Application
│   ├── bus.py                # Hybrid Kafka / Async In-Memory Streaming Bus
│   ├── config.py             # Settings & Environment Variables
│   ├── database.py           # Dual-Engine SQLAlchemy (PostGIS / SQLite)
│   ├── models.py             # Datastore ORM Models (Sources, Events, CitizenReports, Alerts)
│   ├── schemas.py            # Pydantic Serialization Schemas
│   └── routes/               # API Endpoints (events, reports, stats, admin, alerts)
├── ml/                       # Stream Processing & AI/NLP Layer
│   ├── classifier.py         # Rule-based + TF-IDF Disaster Classifier
│   ├── deduplicator.py       # Semantic Cosine Similarity Deduplication
│   ├── ner_geocoder.py       # Indian Gazetteer (150+ stations) + Nominatim Cache
│   ├── processor.py          # 5-Stage Orchestration Pipeline
│   ├── trust_scorer.py       # Heuristic Credibility & Rumor Detection
│   └── worker.py             # Kafka / Queue Stream Consumer Loop
├── ingestion/                # Multi-Source Connectors
│   ├── reddit_connector.py   # PRAW Subreddit Monitor + Mock Mode
│   ├── rss_connector.py      # Feedparser IMD/NDMA RSS Ingestor
│   └── synthetic_generator.py# Realistic Indian Weather Simulator
├── infra/                    # Deployment Infrastructure
│   ├── init.sql              # PostGIS Schema & Spatial Indexes
│   ├── Dockerfile.backend    # Backend Container
│   ├── Dockerfile.worker     # ML Worker Container
│   └── Dockerfile.frontend   # React Production Nginx Container
├── frontend/                 # React Tactical Dashboard
│   ├── src/
│   │   ├── components/       # Header, Map, Feed, Charts, Modals
│   │   ├── index.css         # Edgy Tactical Styling & Animations
│   │   └── App.jsx           # Master Operations Console
├── docker-compose.yml        # Multi-Container Deployment Orchestration
├── seed_data.py              # Historical Dataset Populator
├── run_local.ps1             # One-Click Localhost Windows Launcher
└── requirements.txt          # Python Dependencies
```

---

## 7. License & Attribution

Built for the **Smart India Hackathon (SIH 2026)**.
Problem Statement: 26069 | Ministry of Earth Sciences (MoES) / India Meteorological Department (IMD).
