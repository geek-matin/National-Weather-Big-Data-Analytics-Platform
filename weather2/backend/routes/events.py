import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import desc

from weather2.backend.database import get_db
from weather2.backend.models import Event, Source
from weather2.backend.schemas import EventResponse
from weather2.backend.bus import bus

logger = logging.getLogger("imd.routes.events")
router = APIRouter(prefix="/events", tags=["Weather Events"])

@router.get("", response_model=List[EventResponse])
def get_events(
    category: Optional[str] = Query(None, description="Filter by event category"),
    state: Optional[str] = Query(None, description="Filter by state"),
    city: Optional[str] = Query(None, description="Filter by city"),
    is_verified: Optional[bool] = Query(None, description="Filter verified only"),
    min_trust: Optional[float] = Query(0.0, description="Minimum trust score threshold"),
    q: Optional[str] = Query(None, description="Search query string"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Fetches paginated meteorological and disaster events with multi-criteria filtering."""
    query = db.query(Event).filter(Event.trust_score >= min_trust)

    if category and category.lower() != "all":
        query = query.filter(Event.category == category.lower())
    if state:
        query = query.filter(Event.state.ilike(f"%{state}%"))
    if city:
        query = query.filter(Event.city.ilike(f"%{city}%"))
    if is_verified is not None:
        query = query.filter(Event.is_verified == is_verified)
    if q:
        query = query.filter(Event.raw_text.ilike(f"%{q}%"))

    events = query.order_by(desc(Event.posted_at)).offset(offset).limit(limit).all()

    # Enrich with source_name
    result = []
    for ev in events:
        source_name = ev.source.name if ev.source else "unknown"
        ev_dict = {
            "id": ev.id,
            "source_id": ev.source_id,
            "source_name": source_name,
            "raw_text": ev.raw_text,
            "hashtags": ev.hashtags or [],
            "posted_at": ev.posted_at,
            "ingested_at": ev.ingested_at,
            "city": ev.city,
            "state": ev.state,
            "latitude": ev.latitude,
            "longitude": ev.longitude,
            "category": ev.category,
            "category_confidence": ev.category_confidence,
            "trust_score": ev.trust_score,
            "is_verified": ev.is_verified,
            "is_duplicate_of": ev.is_duplicate_of,
            "media_urls": ev.media_urls or [],
            "source_url": ev.source_url,
            "author_handle": ev.author_handle,
            "severity": ev.severity
        }
        result.append(EventResponse(**ev_dict))

    return result

@router.get("/{event_id}", response_model=EventResponse)
def get_event(event_id: str, db: Session = Depends(get_db)):
    """Retrieves full telemetry details for an individual event."""
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Weather event not found")
    
    source_name = ev.source.name if ev.source else "unknown"
    return EventResponse(
        id=ev.id,
        source_id=ev.source_id,
        source_name=source_name,
        raw_text=ev.raw_text,
        hashtags=ev.hashtags or [],
        posted_at=ev.posted_at,
        ingested_at=ev.ingested_at,
        city=ev.city,
        state=ev.state,
        latitude=ev.latitude,
        longitude=ev.longitude,
        category=ev.category,
        category_confidence=ev.category_confidence,
        trust_score=ev.trust_score,
        is_verified=ev.is_verified,
        is_duplicate_of=ev.is_duplicate_of,
        media_urls=ev.media_urls or [],
        source_url=ev.source_url,
        author_handle=ev.author_handle,
        severity=ev.severity
    )

@router.websocket("/stream")
async def websocket_event_stream(websocket: WebSocket):
    """
    WebSocket endpoint streaming live verified and incoming disaster events
    directly to frontend client terminals.
    """
    await websocket.accept()
    queue = bus.register_subscriber()
    logger.info("Client connected to real-time event WebSocket stream.")

    try:
        while True:
            event_data = await queue.get()
            await websocket.send_text(json.dumps(event_data))
    except WebSocketDisconnect:
        logger.info("Client disconnected from WebSocket stream.")
    except Exception as e:
        logger.warning(f"WebSocket streaming error: {e}")
    finally:
        bus.unregister_subscriber(queue)
