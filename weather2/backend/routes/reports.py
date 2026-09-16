import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from weather2.backend.database import get_db
from weather2.backend.models import CitizenReport, Source
from weather2.backend.schemas import CitizenReportCreate, CitizenReportResponse
from weather2.backend.bus import bus
from weather2.ml.processor import process_raw_event

logger = logging.getLogger("imd.routes.reports")
router = APIRouter(prefix="/report", tags=["Citizen Field Reports"])

@router.post("", response_model=CitizenReportResponse)
async def submit_citizen_report(
    report_data: CitizenReportCreate,
    db: Session = Depends(get_db)
):
    """
    Ingests citizen field report with optional GPS coordinates and photo evidence.
    Immediately dispatches into the real-time ML pipeline for categorization,
    trust evaluation, and deduplication.
    """
    # Prepare raw event payload for ML pipeline
    raw_payload = {
        "source_name": "citizen_report",
        "raw_text": report_data.raw_text,
        "author_handle": f"citizen:{report_data.reporter_name or 'anon'}",
        "city": report_data.city,
        "state": report_data.state,
        "latitude": report_data.latitude,
        "longitude": report_data.longitude,
        "media_urls": [report_data.photo_url] if report_data.photo_url else [],
        "posted_at": datetime.now(timezone.utc).isoformat()
    }

    # Process through ML pipeline
    event = process_raw_event(raw_payload, db)
    if not event:
        raise HTTPException(status_code=400, detail="Report text does not appear to contain weather-relevant information")

    # Save Citizen Report record
    citizen_report = CitizenReport(
        id=str(uuid.uuid4()),
        event_id=event.id,
        reporter_name=report_data.reporter_name or "Anonymous Citizen",
        contact_optional=report_data.contact_optional,
        photo_url=report_data.photo_url,
        submitted_at=datetime.now(timezone.utc)
    )
    db.add(citizen_report)
    db.commit()
    db.refresh(citizen_report)

    # Broadcast enriched event to WebSocket listeners
    event_dict = {
        "id": event.id,
        "source_id": event.source_id,
        "source_name": "citizen_report",
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

    return CitizenReportResponse(
        id=citizen_report.id,
        event_id=citizen_report.event_id,
        reporter_name=citizen_report.reporter_name,
        contact_optional=citizen_report.contact_optional,
        photo_url=citizen_report.photo_url,
        submitted_at=citizen_report.submitted_at
    )
