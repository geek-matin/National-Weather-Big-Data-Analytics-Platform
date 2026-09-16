import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from weather2.backend.database import SessionLocal
from weather2.backend.bus import bus
from weather2.ml.processor import process_raw_event
from weather2.ingestion.rss_connector import rss_connector
from weather2.ingestion.reddit_connector import reddit_connector
from weather2.ingestion.synthetic_generator import generate_synthetic_event

logger = logging.getLogger("imd.scheduler")

class DailyIngestionScheduler:
    """
    Automated Daily Ingestion & Synchronization Engine for National Weather Analytics.
    Runs periodic recurring ingestion cycles across all sources (IMD RSS, News, Reddit, Ground Telemetry).
    """

    def __init__(self, interval_hours: int = 6):
        self.interval_hours = interval_hours
        self.scheduler = AsyncIOScheduler()
        self.is_active = False
        self.last_sync_time: Optional[datetime] = None
        self.next_sync_time: Optional[datetime] = None
        self.total_synced_today: int = 0
        self.last_run_results: Dict[str, Any] = {}

    def start(self):
        """Starts the automated background ingestion schedule."""
        if not self.is_active:
            # Run every N hours (default 6 hours = 4 cycles per day)
            self.scheduler.add_job(
                self.execute_sync_cycle,
                trigger=IntervalTrigger(hours=self.interval_hours),
                id="daily_weather_ingestion",
                name="Daily IMD Multi-Source Ingestion",
                replace_existing=True
            )
            self.scheduler.start()
            self.is_active = True
            now = datetime.now(timezone.utc)
            self.next_sync_time = now + timedelta(hours=self.interval_hours)
            logger.info(f"Automated Ingestion Scheduler started. Next sync in {self.interval_hours} hours.")

    async def execute_sync_cycle(self) -> Dict[str, Any]:
        """Executes a complete synchronization cycle across all connected sources."""
        now = datetime.now(timezone.utc)
        self.last_sync_time = now
        self.next_sync_time = now + timedelta(hours=self.interval_hours)
        logger.info(f"[AUTO-SYNC] Initiating Automated Weather Ingestion Cycle at {now.isoformat()}...")

        all_raw_events: List[Dict[str, Any]] = []

        # 1. Fetch RSS feeds (IMD bulletins, NDMA)
        try:
            rss_items = rss_connector.fetch_feeds()
            all_raw_events.extend(rss_items)
            logger.info(f"[AUTO-SYNC] Pulled {len(rss_items)} RSS bulletins.")
        except Exception as e:
            logger.warning(f"Failed to fetch RSS feeds during auto-sync: {e}")

        # 2. Fetch Reddit weather reports
        try:
            reddit_items = reddit_connector.fetch_weather_posts(limit_per_sub=3)
            all_raw_events.extend(reddit_items)
            logger.info(f"[AUTO-SYNC] Pulled {len(reddit_items)} Reddit community reports.")
        except Exception as e:
            logger.warning(f"Failed to fetch Reddit items during auto-sync: {e}")

        # 3. Generate 3 fresh real-time synthetic telemetry events
        try:
            for _ in range(3):
                all_raw_events.append(generate_synthetic_event())
        except Exception as e:
            logger.warning(f"Failed to generate synthetic telemetry during auto-sync: {e}")

        # Process through ML Pipeline and Database
        db = SessionLocal()
        ingested_count = 0
        newly_created_events = []

        try:
            for raw in all_raw_events:
                event = process_raw_event(raw, db)
                if event:
                    ingested_count += 1
                    event_dict = {
                        "id": event.id,
                        "source_id": event.source_id,
                        "source_name": raw.get("source_name", "unknown"),
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
                        "source_url": event.source_url,
                        "author_handle": event.author_handle,
                        "severity": event.severity,
                        "posted_at": event.posted_at.isoformat() if event.posted_at else None,
                        "ingested_at": event.ingested_at.isoformat() if event.ingested_at else None,
                    }
                    newly_created_events.append(event_dict)
                    # Broadcast immediately to active WebSocket terminals
                    await bus.broadcast_enriched(event_dict)

            self.total_synced_today += ingested_count
            logger.info(f"[AUTO-SYNC COMPLETE] Successfully ingested & enriched {ingested_count} disaster events.")
        finally:
            db.close()

        self.last_run_results = {
            "timestamp": now.isoformat(),
            "items_processed": len(all_raw_events),
            "events_persisted": ingested_count,
            "status": "SUCCESS"
        }
        return self.last_run_results

    def get_status(self) -> Dict[str, Any]:
        """Returns scheduler telemetry status."""
        return {
            "scheduler_active": self.is_active,
            "sync_interval_hours": self.interval_hours,
            "last_sync_time": self.last_sync_time,
            "next_sync_time": self.next_sync_time,
            "total_synced_today": self.total_synced_today,
            "active_sources": ["rss_imd", "news_ndma", "reddit", "citizen_report", "synthetic"],
            "status": "OPERATIONAL" if self.is_active else "IDLE"
        }

    def shutdown(self):
        """Stops the background scheduler."""
        if self.is_active:
            self.scheduler.shutdown()
            self.is_active = False

ingestion_scheduler = DailyIngestionScheduler(interval_hours=6)
