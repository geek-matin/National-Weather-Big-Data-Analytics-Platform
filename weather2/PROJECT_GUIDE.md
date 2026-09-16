# National Weather Big Data Analytics Platform
### SIH 2026 — Problem Statement ID 26069 | Organization: Ministry of Earth Sciences (MoES) | Dept: IMD | Category: Software | Theme: Disaster Management

> **Instructions for the IDE agent (Gemini 3.8 Flash / Antigravity):** This document is your single source of truth for building this project. Follow it top to bottom. Do not skip the "Step-by-Step Build Plan" section — it is ordered by dependency, and each step assumes the previous ones are done. When in doubt about a design decision, prefer the choice explicitly recommended here over inventing your own, so the project stays internally consistent. Ask the user only when a step requires a credential, API key, or a genuinely ambiguous business decision — otherwise proceed with the stated defaults.

---

## 1. Problem Restated (Plain English)

Build a platform that:
1. **Collects** real-time weather-related information about India from multiple internet sources — social media (X/Twitter, Reddit, Facebook public pages/groups where feasible), public datasets, government/weather websites, public APIs, and citizen-submitted reports.
2. **Filters** specifically for posts/content tagged `#IMD` and other relevant weather hashtags (`#rainfall`, `#flood`, `#cyclone`, `#heatwave`, etc.).
3. **Extracts metadata**: date & time, city, state, GPS coordinates (if available), photos, videos, and event category.
4. **Stores** everything in a centralized, scalable database.
5. **Processes at scale** using big data tools (real-time ingestion, processing, storage, visualization).
6. **Applies ML/AI** to:
   - Detect fake/misleading reports
   - Verify source trustworthiness
   - Deduplicate entries
   - Auto-categorize events: rainfall, thunderstorms, flooding, heatwaves, fog, dust storms, strong winds.
7. **Visualizes** everything, presumably on a dashboard/map for IMD analysts and disaster management authorities.

This is fundamentally a **social-listening + crowdsourced-crisis-reporting pipeline** combined with a **real-time geospatial analytics dashboard**, similar in spirit to systems like Ushahidi, or disaster-tweet-classification research pipelines (CrisisNLP-style), but focused on India + weather + IMD.

---

## 2. Recommended Tech Stack

Choose this stack unless the user says otherwise — it is realistic to build within a hackathon timeframe (24–36 hrs) while still looking "big data" and enterprise-credible to judges.

### 2.1 Data Ingestion Layer
- **Reddit API (PRAW)** — free, reliable, no approval wait. Use as the PRIMARY live social source (subreddits like r/india, r/IndiaWeather, r/mumbai, r/delhi, etc., filtered by weather keywords/hashtag-equivalents).
- **X/Twitter API v2** — use ONLY if the team already has developer access; otherwise treat as optional/stretch goal since free tier is heavily rate-limited in 2026. Do not block the whole pipeline on this.
- **News/RSS feeds** — IMD press releases, NDMA, regional news RSS (feedparser) as a stable public-data source that never rate-limits.
- **Public datasets**: IMD open data (data.gov.in), Kaggle historical Indian weather/rainfall datasets — use for backfilling the DB and for training the ML classifier.
- **Citizen reports**: build your OWN simple web form (part of the frontend) where users can submit a text report + optional photo + auto-captured GPS — this satisfies "citizen reports" requirement without needing any external permission and is fully in your control (best ROI for a hackathon demo).
- **Mock/synthetic data generator** — write a Python script that generates realistic fake tweets/posts for demo purposes so the live demo never depends on flaky external APIs during judging.

### 2.2 Ingestion Orchestration ("Big Data" tooling — keep it real but demo-able)
- **Apache Kafka** (or **Redpanda**, a lightweight Kafka-compatible broker — easier to run in Docker for a hackathon) as the streaming message bus. All ingestion connectors publish raw events to a Kafka topic `raw-weather-events`.
- **Python consumers** (or **Apache Spark Structured Streaming** if the team wants to visibly tick the "big data" box for judges) subscribe to Kafka, run the ML pipeline, and write clean records to the database.
- If Kafka feels heavy for the timeline, an acceptable fallback is **Redis Streams** — much lighter, still "real-time," still defensible in a demo. State clearly in the README which one was used and why.

### 2.3 Processing & ML/AI Layer
- **Language**: Python.
- **NLP libraries**: `spaCy` or `HuggingFace transformers` for entity extraction (location names, dates).
- **Location extraction & geocoding**: spaCy NER (GPE labels) + **Nominatim/OpS treetMap geocoder** (free, no key) to convert "Mumbai", "Pune" mentions into lat/lon.
- **Event categorization model**: Start with a **rule-based keyword classifier** (fast, zero training data needed, very demo-reliable) layered with a **fine-tuned lightweight transformer** (e.g., `distilbert-base-uncased` fine-tuned on a small labeled set you create from the Kaggle/IMD data) for the "smart AI" story. Categories: `rainfall, thunderstorm, flood, heatwave, fog, dust_storm, strong_wind, other`.
- **Fake/misleading detection**: combine —
  - Heuristic trust score (account age, post engagement, presence of media, keyword sensationalism, cross-source corroboration count)
  - Optional ML: a simple `sklearn` classifier (Logistic Regression / Random Forest on TF-IDF features) trained on any available fake-news/disaster-tweet-credibility dataset (e.g., CrisisMMD, PHEME — mention as data source in README even if you use a synthetic stand-in for the demo).
- **Deduplication**: sentence embeddings (`sentence-transformers`, model `all-MiniLM-L6-v2`) + cosine similarity threshold (e.g., >0.85) to cluster near-duplicate reports about the same event; keep the earliest/most-trusted as canonical.

### 2.4 Storage Layer
- **Primary datastore**: **PostgreSQL + PostGIS** extension — best choice because you need geospatial queries (lat/lon, "events near X"), relational integrity, and it's easy to demo. PostGIS gives you real geospatial querying "big data" credibility.
- **(Optional, stretch) Elasticsearch** — if the team wants full-text/hashtag search-at-scale as an extra "big data" component, add it as a secondary index fed from the same Kafka topic. Not required for MVP.
- **Object storage for media**: local `/media` folder for hackathon demo (S3-compatible **MinIO** in Docker if you want to look production-grade).

### 2.5 Backend / API Layer
- **FastAPI** (Python) — fast to build, auto-generates OpenAPI docs (great for judges), async-friendly, integrates cleanly with the Python ML stack above.
- Endpoints needed (see Section 4 for schema): `/events`, `/events/{id}`, `/events/stream` (WebSocket for live feed), `/report` (citizen submission), `/stats/summary`, `/stats/by-category`, `/stats/by-region`.

### 2.6 Frontend / Visualization Layer
- **React** (Vite) + **Tailwind CSS** for styling.
- **Leaflet.js** (or **Mapbox GL** if a free API key is available) for the live map of India showing event markers, color-coded by category, clustered with `leaflet.markercluster`.
- **Recharts** for time-series and category-breakdown charts (events over time, category distribution, region-wise counts).
- **WebSocket connection** to the FastAPI `/events/stream` endpoint for a live-updating feed panel ("Twitter-style" scrolling card list of incoming verified reports).
- A simple **citizen report submission form** (text + photo upload + auto GPS via browser Geolocation API).

### 2.7 Infrastructure
- **Docker Compose** to spin up: Kafka/Redpanda, Postgres+PostGIS, FastAPI backend, React frontend, ML worker(s) — one command to run the whole stack (`docker compose up`). This alone impresses judges a lot.
- **GitHub Actions** (optional) for a basic CI lint/test badge — nice-to-have, not essential.

### 2.8 Summary Stack Table

| Layer | Tool |
|---|---|
| Streaming/Message Bus | Kafka (or Redpanda / Redis Streams fallback) |
| Ingestion Sources | Reddit API (PRAW), RSS/news feeds, data.gov.in datasets, citizen report form, synthetic generator |
| Processing | Python consumers (optionally Spark Structured Streaming) |
| NLP / Geocoding | spaCy, Nominatim |
| Event Classification | Rule-based + fine-tuned DistilBERT |
| Fake-news / Trust Scoring | Heuristic score + sklearn TF-IDF classifier |
| Deduplication | sentence-transformers (MiniLM) + cosine similarity |
| Database | PostgreSQL + PostGIS |
| Optional Search Index | Elasticsearch |
| Media Storage | MinIO (S3-compatible) or local disk |
| Backend API | FastAPI (Python) |
| Frontend | React + Vite + Tailwind + Leaflet + Recharts |
| Orchestration | Docker Compose |

---

## 3. System Architecture (Data Flow)

```
                     ┌────────────────────────────────────────────┐
                     │              INGESTION SOURCES               │
                     │  Reddit API │ RSS/News │ Citizen Form │ Synthetic Gen │
                     └───────────────────────┬────────────────────┘
                                              │  (produce)
                                              ▼
                                  ┌───────────────────────┐
                                  │   Kafka topic:          │
                                  │   raw-weather-events    │
                                  └───────────┬────────────┘
                                              │  (consume)
                                              ▼
                          ┌──────────────────────────────────────┐
                          │        ML PROCESSING WORKER(S)          │
                          │  1. Keyword/hashtag filter               │
                          │  2. NER + Geocoding (location→lat/lon)   │
                          │  3. Event categorization (BERT/rules)    │
                          │  4. Fake/trust scoring                   │
                          │  5. Deduplication (embeddings)           │
                          └───────────────────┬──────────────────┘
                                              │ (clean, enriched record)
                                              ▼
                          ┌──────────────────────────────────────┐
                          │     PostgreSQL + PostGIS  (+ Elasticsearch)│
                          └───────────────────┬──────────────────┘
                                              │
                          ┌───────────────────┴──────────────────┐
                          ▼                                       ▼
                 ┌─────────────────┐                    ┌──────────────────┐
                 │   FastAPI REST    │                    │  WebSocket stream  │
                 │   + Auth (opt.)   │                    │  /events/stream     │
                 └────────┬─────────┘                    └─────────┬──────────┘
                          │                                        │
                          └───────────────┬────────────────────────┘
                                          ▼
                             ┌─────────────────────────┐
                             │  React Dashboard (Leaflet map,│
                             │  charts, live feed, citizen    │
                             │  report form)                  │
                             └─────────────────────────┘
```

---

## 4. Database Schema (PostgreSQL + PostGIS)

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,          -- e.g. 'reddit', 'citizen_report', 'rss_imd'
    trust_weight FLOAT DEFAULT 0.5        -- base trust multiplier per source type
);

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id INTEGER REFERENCES sources(id),
    raw_text TEXT NOT NULL,
    hashtags TEXT[],
    posted_at TIMESTAMPTZ,
    ingested_at TIMESTAMPTZ DEFAULT now(),
    city VARCHAR(100),
    state VARCHAR(100),
    location GEOGRAPHY(POINT, 4326),      -- PostGIS point (lon, lat)
    category VARCHAR(30),                 -- rainfall | thunderstorm | flood | heatwave | fog | dust_storm | strong_wind | other
    category_confidence FLOAT,
    trust_score FLOAT,                    -- 0.0 - 1.0
    is_verified BOOLEAN DEFAULT FALSE,
    is_duplicate_of UUID REFERENCES events(id),
    media_urls TEXT[],
    author_handle VARCHAR(150),
    embedding VECTOR(384)                 -- if pgvector extension available, else store in separate index
);

CREATE INDEX idx_events_location ON events USING GIST (location);
CREATE INDEX idx_events_category ON events (category);
CREATE INDEX idx_events_posted_at ON events (posted_at);

CREATE TABLE citizen_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id),
    reporter_name VARCHAR(150),
    contact_optional VARCHAR(150),
    photo_url TEXT,
    submitted_at TIMESTAMPTZ DEFAULT now()
);
```

> If `pgvector` isn't easily installable in the hackathon environment, drop the `embedding` column and instead keep embeddings in-memory / in a lightweight FAISS index for deduplication only — don't block on this.

---

## 5. Step-by-Step Build Plan (Follow in Order)

### Phase 0 — Setup (30–45 min)
1. Initialize a monorepo: `/backend`, `/frontend`, `/ml`, `/ingestion`, `/infra` (docker-compose.yml).
2. Write `docker-compose.yml` with services: `postgres` (postgis image), `redpanda` (or `kafka`), `backend`, `frontend`, `ml-worker`. Get `docker compose up` working with empty stub services first — verify networking before writing logic.
3. Create `.env.example` with placeholders for `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `DATABASE_URL`, `KAFKA_BROKER`. Never hardcode secrets.

### Phase 1 — Database (30 min)
4. Write the SQL schema from Section 4 as a migration (use `alembic` if time allows, else a plain `init.sql` mounted into the postgres container).
5. Seed the `sources` table with rows for `reddit`, `rss_imd`, `citizen_report`, `synthetic`.

### Phase 2 — Ingestion Connectors (1.5–2 hrs)
6. Build `ingestion/reddit_connector.py` using PRAW: poll target subreddits every N seconds for new posts containing weather keywords (`rain`, `flood`, `cyclone`, `heatwave`, `fog`, `storm`, `#IMD`, etc.); publish raw JSON to Kafka topic `raw-weather-events`.
7. Build `ingestion/rss_connector.py` using `feedparser` against IMD/NDMA/news RSS feeds; publish similarly.
8. Build `ingestion/synthetic_generator.py`: generates realistic sample posts (varying cities, categories, some intentionally "fake"/duplicate) at a configurable rate — THIS is what you run live during judging so the demo never depends on external API uptime. Keep real connectors running in the background as a bonus but don't rely on them for the live demo.
9. Build the citizen-report ingestion path: FastAPI endpoint `POST /report` writes directly into `citizen_reports` + publishes an event onto the same Kafka topic so it flows through the same ML pipeline as everything else.

### Phase 3 — ML Processing Worker (2–3 hrs — the core "AI" of the project)
10. `ml/consumer.py`: Kafka consumer loop that reads `raw-weather-events`.
11. Step A — **Filter**: discard posts with no weather-relevant keyword/hashtag match (regex/keyword list first; this alone is fast and effective).
12. Step B — **NER + Geocode**: run spaCy NER to pull `GPE` entities (place names); geocode the first valid Indian place via Nominatim (cache results locally to avoid rate limits — Nominatim allows ~1 req/sec, so add a local dict cache and a rate limiter).
13. Step C — **Categorize**: run keyword-rule classifier first; if ambiguous, fall back to the fine-tuned DistilBERT model. Store both the label and confidence.
14. Step D — **Trust/Fake scoring**: compute a composite score from: source trust_weight, presence of media, keyword sensationalism penalty, and (if using the sklearn classifier) its fake-probability output. Store as `trust_score` 0–1; mark `is_verified = TRUE` if trust_score > 0.7 AND at least 2 corroborating reports exist for the same city+category+time window.
15. Step E — **Deduplicate**: embed the `raw_text` with MiniLM, compare against embeddings of recent events (last 6–24 hrs, same city) via cosine similarity; if similarity > 0.85, mark as duplicate and link `is_duplicate_of`.
16. Write the enriched record into `events` (Postgres). Also index into Elasticsearch here if using it.

### Phase 4 — Backend API (1.5 hrs)
17. FastAPI app with SQLAlchemy models mirroring the schema.
18. `GET /events` — paginated, filterable by category, state, date range, min trust_score.
19. `GET /events/{id}` — full detail.
20. `WS /events/stream` — push new verified events to connected clients as they're inserted (use Postgres `LISTEN/NOTIFY` or simply have the ML worker also push to a small pub-sub the API subscribes to).
21. `POST /report` — citizen submission (see step 9).
22. `GET /stats/summary`, `GET /stats/by-category`, `GET /stats/by-region` — aggregate queries for dashboard charts.
23. Auto-generate and sanity-check the `/docs` Swagger UI — show this to judges as evidence of a clean API.

### Phase 5 — Frontend Dashboard (2–3 hrs)
24. Scaffold with Vite + React + Tailwind.
25. **Map view**: Leaflet map of India, markers color-coded by category, clustered, popup on click showing text/photo/trust badge/timestamp. Fetch initial data from `/events`, then subscribe to `/events/stream` WebSocket to add live markers.
26. **Live feed panel**: scrolling card list of incoming events (like a live ticker), with a "Verified"/"Unverified" badge from `trust_score`.
27. **Stats panel**: Recharts bar chart (events by category), line chart (events over time), simple India state heatmap or ranked list (events by state).
28. **Citizen report form**: text box, photo upload, "Use my location" button (Geolocation API), submit → `POST /report`.
29. Polish: loading states, empty states, responsive layout, IMD-style color palette (blues/greys/orange alerts) for visual credibility.

### Phase 6 — Integration Test + Demo Prep (1 hr)
30. Run `docker compose up`, run the synthetic generator at a lively pace, confirm the full pipeline: generator → Kafka → ML worker → Postgres → API → WebSocket → dashboard map/feed update live.
31. Pre-load some historical/backfilled data (from Kaggle/data.gov.in) so the dashboard doesn't look empty at the start of the demo.
32. Prepare a 2–3 minute demo script: (a) show live map + feed updating in real time, (b) submit a citizen report live and show it appear, (c) show a duplicate/fake-flagged example being caught, (d) show the stats dashboard, (e) briefly show the architecture diagram and mention Kafka/PostGIS/BERT/embeddings by name — judges reward hearing the "big data + AI" keywords tied to something they can see working.

### Phase 7 — Stretch Goals (only if time remains)
33. Add Elasticsearch full-text search bar on the dashboard.
34. Add an admin moderation view where a human can override the ML's fake/verified flag (human-in-the-loop — a strong "responsible AI" talking point for judges).
35. Add SMS/WhatsApp citizen reporting stub (Twilio sandbox) as a "future scope" slide even if not fully wired up.
36. Add a simple alerting rule: if >5 verified flood reports appear in the same district within 1 hour, trigger a highlighted "Active Alert" banner — this directly ties back to "Disaster Management" theme and is a great demo moment.

---

## 6. Key Design Decisions & Rationale (for the README / judges)

- **Why Kafka/Redpanda instead of just polling a DB?** Demonstrates genuine real-time, decoupled, horizontally-scalable ingestion — directly matches the problem statement's ask for "large-scale real-time data ingestion."
- **Why PostGIS?** Weather events are inherently geospatial; PostGIS enables efficient "events within X km of Y" queries needed for regional disaster alerts.
- **Why a synthetic generator alongside real connectors?** Live external APIs are unreliable/rate-limited during a judged demo; the synthetic generator guarantees a smooth live demonstration while the real connectors (Reddit, RSS) prove the ingestion logic genuinely works end-to-end.
- **Why layer rule-based + ML classification instead of ML-only?** Rule-based gives instant, explainable, zero-training-data coverage (important given hackathon time constraints); the fine-tuned transformer adds nuance and is the "AI" differentiator for judges. Combining both is also good practice for reliability.
- **Why human-in-the-loop moderation (stretch goal)?** IMD is a government body; fully-automated fake-news labeling without human review is a real-world liability. Showing an override capability signals responsible design.

---

## 7. What the IDE Agent Should Do First

1. Scaffold the monorepo folder structure exactly as in Phase 0.
2. Write `docker-compose.yml` and confirm all containers boot (even as stubs) before writing any business logic.
3. Implement Phases 1 → 6 in order — do not jump ahead to frontend polish before the ingestion→ML→DB pipeline actually produces rows in Postgres end-to-end with the synthetic generator.
4. At every phase, write a minimal smoke test (e.g., "insert one fake Kafka message, confirm one row appears in `events` with a non-null category") before moving to the next phase.
5. Keep all secrets in `.env`, never commit them, and provide `.env.example`.
6. Produce a `README.md` at the end summarizing architecture (reuse Section 3's diagram), setup instructions (`docker compose up`), and the demo script from step 32.
