import uuid
import re
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from sqlalchemy.orm import Session
from weather2.backend.models import Event, Source, Alert
from weather2.ml.ner_geocoder import extract_location
from weather2.ml.classifier import classifier
from weather2.ml.trust_scorer import calculate_trust_score, evaluate_verification
from weather2.ml.deduplicator import deduplicator

logger = logging.getLogger("imd.processor")

# General weather keywords for Step A filtering
WEATHER_KEYWORDS = [
    "imd", "weather", "rain", "rainfall", "flood", "flooding", "waterlogging",
    "monsoon", "cyclone", "heatwave", "heat", "temperature", "storm", "thunder",
    "thunderstorm", "lightning", "fog", "smog", "dust", "sandstorm", "wind",
    "gale", "cloudburst", "hail", "hailstorm", "ndrf", "deluge", "forecast"
]

def is_weather_relevant(text: str) -> bool:
    """Step A: High-throughput keyword/hashtag filter to discard irrelevant chatter."""
    cleaned = text.lower()
    return any(re.search(r'\b' + re.escape(kw) + r'\b', cleaned) for kw in WEATHER_KEYWORDS)

def process_raw_event(raw_data: Dict[str, Any], db: Session) -> Optional[Event]:
    """
    Executes the full 5-stage Big Data & AI processing pipeline:
    1. Filter
    2. NER + Geocoding
    3. Event Categorization
    4. Trust & Credibility Scoring
    5. Geospatial & Semantic Deduplication
    6. Database Persistence & Alert Cluster Detection
    """
    raw_text = raw_data.get("raw_text", "")
    if not raw_text or not is_weather_relevant(raw_text):
        logger.debug("Filtered out non-weather text.")
        return None

    source_name = raw_data.get("source_name", "synthetic").lower()
    source_url = raw_data.get("source_url")
    author_handle = raw_data.get("author_handle")
    media_urls = raw_data.get("media_urls", [])

    # Extract hashtags
    hashtags = re.findall(r'#(\w+)', raw_text)

    # Step B: NER + Geocoding
    city = raw_data.get("city")
    state = raw_data.get("state")
    lat = raw_data.get("latitude")
    lon = raw_data.get("longitude")

    if not (city and lat and lon):
        extracted_city, extracted_state, extracted_lat, extracted_lon = extract_location(raw_text)
        city = city or extracted_city
        state = state or extracted_state
        lat = lat or extracted_lat
        lon = lon or extracted_lon

    # Step C: Event Categorization
    category, confidence, severity = classifier.classify(raw_text)

    # Generate UUID for this event
    event_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    # Step E: Deduplication & Corroboration Count
    is_duplicate, canonical_id, corroboration_count = deduplicator.check_and_register(
        event_id=event_id,
        text=raw_text,
        city=city,
        category=category,
        timestamp=now
    )

    # Step D: Trust & Credibility Scoring
    trust_score = calculate_trust_score(
        raw_text=raw_text,
        source_name=source_name,
        media_urls=media_urls,
        corroborating_count=corroboration_count,
        author_handle=author_handle
    )
    is_verified = evaluate_verification(trust_score, corroboration_count, source_name)

    # Resolve or create Source
    source = db.query(Source).filter(Source.name == source_name).first()
    if not source:
        source = Source(name=source_name, trust_weight=0.50)
        db.add(source)
        db.flush()

    # Create Database Event Record
    event = Event(
        id=event_id,
        source_id=source.id,
        raw_text=raw_text,
        hashtags=hashtags,
        posted_at=now,
        ingested_at=now,
        city=city,
        state=state,
        latitude=lat,
        longitude=lon,
        category=category,
        category_confidence=confidence,
        trust_score=trust_score,
        is_verified=is_verified,
        is_duplicate_of=canonical_id if is_duplicate else None,
        media_urls=media_urls,
        source_url=source_url,
        author_handle=author_handle,
        severity=severity
    )

    db.add(event)

    # Disaster Alert Cluster Check (Disaster Management theme)
    # If >= 3 severe events (flood/thunderstorm/heatwave) occur in the same region, raise/update alert
    if category in ["flood", "thunderstorm", "heatwave"] and city:
        existing_alert = db.query(Alert).filter(
            Alert.region == city,
            Alert.category == category,
            Alert.is_active == True
        ).first()

        if existing_alert:
            existing_alert.event_count += 1
            if existing_alert.event_count >= 5:
                existing_alert.severity = "CRITICAL"
        elif corroboration_count >= 2:
            alert = Alert(
                title=f"IMD SEVERE WEATHER ALERT: {category.upper()} CLUSTER IN {city.upper()}",
                category=category,
                region=city,
                event_count=corroboration_count + 1,
                severity="CRITICAL" if category == "flood" else "SEVERE"
            )
            db.add(alert)

    db.commit()
    db.refresh(event)
    return event
