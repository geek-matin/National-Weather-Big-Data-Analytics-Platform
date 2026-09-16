from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from weather2.backend.database import get_db
from weather2.backend.models import Event
from weather2.backend.schemas import ModerateRequest, EventResponse

router = APIRouter(prefix="/admin", tags=["Human-in-the-Loop Moderation"])

@router.post("/moderate/{event_id}", response_model=EventResponse)
def moderate_event(
    event_id: str,
    payload: ModerateRequest,
    db: Session = Depends(get_db)
):
    """
    Human-in-the-Loop Moderation Override.
    Allows IMD crisis duty officers to manually verify a report or flag a rumor,
    overriding automated ML classification.
    """
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Incident record not found")

    ev.is_verified = payload.is_verified
    if payload.is_verified:
        ev.trust_score = max(ev.trust_score, 0.95)
    else:
        ev.trust_score = min(ev.trust_score, 0.20)

    db.commit()
    db.refresh(ev)

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
        author_handle=ev.author_handle,
        severity=ev.severity
    )
