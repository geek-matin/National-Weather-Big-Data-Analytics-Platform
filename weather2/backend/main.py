import asyncio
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from weather2.backend.config import settings
from weather2.backend.database import Base, engine, SessionLocal
from weather2.backend.models import Source
from weather2.backend.bus import bus
from weather2.backend.routes.events import router as events_router
from weather2.backend.routes.reports import router as reports_router
from weather2.backend.routes.stats import router as stats_router
from weather2.backend.routes.admin import router as admin_router
from weather2.backend.routes.alerts import router as alerts_router
from weather2.backend.routes.ingestion import router as ingestion_router
from weather2.backend.scheduler import ingestion_scheduler
from weather2.ml.processor import process_raw_event
from weather2.ingestion.synthetic_generator import generate_synthetic_event

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("imd.main")

def seed_default_sources():
    """Initializes canonical ingestion sources in the datastore."""
    db = SessionLocal()
    try:
        default_sources = [
            ("rss_imd", 0.95),
            ("news_ndma", 0.90),
            ("citizen_report", 0.70),
            ("reddit", 0.60),
            ("synthetic", 0.50)
        ]
        for name, weight in default_sources:
            existing = db.query(Source).filter(Source.name == name).first()
            if not existing:
                db.add(Source(name=name, trust_weight=weight))
        db.commit()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing National Weather Big Data Analytics Platform...")
    Base.metadata.create_all(bind=engine)
    seed_default_sources()
    await bus.initialize()
    ingestion_scheduler.start()
    logger.info("Platform initialized successfully. Automated Ingestion Scheduler ACTIVE.")
    yield
    # Shutdown
    logger.info("Shutting down platform services...")
    ingestion_scheduler.shutdown()
    await bus.shutdown()

app = FastAPI(
    title="National Weather Big Data Analytics Platform (MoES / IMD)",
    description="SIH 2026 Problem Statement ID 26069 | Ministry of Earth Sciences & India Meteorological Department. Real-time Multi-Source Ingestion, ML Disaster Categorization, Trust Evaluation, Deduplication & Geospatial Analytics.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount media directory for citizen reports
if os.path.exists(settings.MEDIA_STORAGE_DIR):
    app.mount("/media", StaticFiles(directory=settings.MEDIA_STORAGE_DIR), name="media")

# Include Sub-Routers
app.include_router(events_router)
app.include_router(reports_router)
app.include_router(stats_router)
app.include_router(admin_router)
app.include_router(alerts_router)
app.include_router(ingestion_router)

@app.get("/health")
def health_check():
    """System health check and broker status."""
    return {
        "status": "OPERATIONAL",
        "system": "IMD Disaster Telemetry Console",
        "kafka_connected": bus.kafka_available,
        "database": "CONNECTED",
        "version": "1.0.0"
    }

@app.post("/simulate")
async def trigger_simulation_event():
    """Triggers an instantaneous synthetic event into the live pipeline for demo purposes."""
    payload = generate_synthetic_event()
    db = SessionLocal()
    try:
        event = process_raw_event(payload, db)
        if event:
            event_dict = {
                "id": event.id,
                "source_id": event.source_id,
                "source_name": payload.get("source_name", "synthetic"),
                "raw_text": event.raw_text,
                "hashtags": event.hashtags or [],
                "city": event.city,
                "state": event.state,
                "latitude": event.latitude,
                "longitude": event.longitude,
                "category": event.category,
                "category_confidence": event.category_confidence,
                "trust_score": event.trust_score,
                "is_verified": event.is_verified,
                "is_duplicate_of": event.is_duplicate_of,
                "media_urls": event.media_urls or [],
                "author_handle": event.author_handle,
                "severity": event.severity,
                "posted_at": event.posted_at.isoformat() if event.posted_at else None,
                "ingested_at": event.ingested_at.isoformat() if event.ingested_at else None,
            }
            await bus.broadcast_enriched(event_dict)
            return {"status": "success", "event": event_dict}
    finally:
        db.close()
    return {"status": "filtered_or_duplicate"}
