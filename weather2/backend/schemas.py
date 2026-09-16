from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class SourceBase(BaseModel):
    name: str
    trust_weight: float = 0.5

class SourceResponse(SourceBase):
    id: int

    class Config:
        from_attributes = True

class EventBase(BaseModel):
    raw_text: str
    hashtags: List[str] = Field(default_factory=list)
    city: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    category: str
    category_confidence: float = 0.85
    trust_score: float = 0.5
    is_verified: bool = False
    media_urls: List[str] = Field(default_factory=list)
    source_url: Optional[str] = None
    author_handle: Optional[str] = None
    severity: str = "MODERATE"

class EventCreate(BaseModel):
    raw_text: str
    source_name: str = "synthetic"
    source_url: Optional[str] = None
    author_handle: Optional[str] = None
    media_urls: List[str] = Field(default_factory=list)
    city: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class EventResponse(EventBase):
    id: str
    source_id: Optional[int] = None
    source_name: Optional[str] = None
    posted_at: Optional[datetime] = None
    ingested_at: Optional[datetime] = None
    is_duplicate_of: Optional[str] = None

    class Config:
        from_attributes = True

class CitizenReportCreate(BaseModel):
    raw_text: str
    category: Optional[str] = "rainfall"
    city: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    reporter_name: Optional[str] = "Anonymous Citizen"
    contact_optional: Optional[str] = None
    photo_url: Optional[str] = None

class CitizenReportResponse(BaseModel):
    id: str
    event_id: str
    reporter_name: Optional[str]
    contact_optional: Optional[str]
    photo_url: Optional[str]
    submitted_at: datetime
    event: Optional[EventResponse] = None

    class Config:
        from_attributes = True

class AlertResponse(BaseModel):
    id: str
    title: str
    category: str
    region: str
    event_count: int
    severity: str
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True

class StatsSummary(BaseModel):
    total_events: int
    verified_events: int
    active_alerts: int
    sources_active: int
    high_threat_events: int
    cities_monitored: int

class CategoryStat(BaseModel):
    category: str
    count: int
    percentage: float
    color: str

class RegionStat(BaseModel):
    state: str
    count: int
    verified: int
    high_threat: int

class TimelinePoint(BaseModel):
    time_label: str
    event_count: int
    verified_count: int

class ModerateRequest(BaseModel):
    is_verified: bool
    moderator_notes: Optional[str] = None

class IngestionStatusResponse(BaseModel):
    scheduler_active: bool
    sync_interval_hours: int
    last_sync_time: Optional[datetime] = None
    next_sync_time: Optional[datetime] = None
    total_synced_today: int
    active_sources: List[str]
    status: str

