import uuid
from datetime import datetime, timezone
import json
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, TypeDecorator
)
from sqlalchemy.orm import relationship
from weather2.backend.database import Base

class JSONEncodedList(TypeDecorator):
    """Custom SQLAlchemy type that serializes lists to JSON strings for cross-DB compatibility."""
    impl = Text

    def process_bind_param(self, value, dialect):
        if value is None:
            return "[]"
        if isinstance(value, list):
            return json.dumps(value)
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None or value == "":
            return []
        try:
            return json.loads(value)
        except Exception:
            return [value]

class Source(Base):
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    trust_weight = Column(Float, default=0.5)

    events = relationship("Event", back_populates="source")

class Event(Base):
    __tablename__ = "events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id = Column(Integer, ForeignKey("sources.id"), nullable=True)
    raw_text = Column(Text, nullable=False)
    hashtags = Column(JSONEncodedList, default=list)
    posted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    ingested_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    city = Column(String(100), index=True, nullable=True)
    state = Column(String(100), index=True, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    category = Column(String(30), index=True, nullable=False)
    category_confidence = Column(Float, default=0.85)
    trust_score = Column(Float, default=0.5, index=True)
    is_verified = Column(Boolean, default=False)
    is_duplicate_of = Column(String(36), ForeignKey("events.id"), nullable=True)
    media_urls = Column(JSONEncodedList, default=list)
    source_url = Column(Text, nullable=True)
    author_handle = Column(String(150), nullable=True)
    severity = Column(String(20), default="MODERATE")

    source = relationship("Source", back_populates="events")
    citizen_report = relationship("CitizenReport", back_populates="event", uselist=False)

class CitizenReport(Base):
    __tablename__ = "citizen_reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String(36), ForeignKey("events.id"), nullable=True)
    reporter_name = Column(String(150), nullable=True)
    contact_optional = Column(String(150), nullable=True)
    photo_url = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    event = relationship("Event", back_populates="citizen_report")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(200), nullable=False)
    category = Column(String(30), nullable=False)
    region = Column(String(100), nullable=False)
    event_count = Column(Integer, default=1)
    severity = Column(String(20), default="SEVERE")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)
