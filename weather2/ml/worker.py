import asyncio
import logging
from weather2.backend.bus import bus
from weather2.backend.database import SessionLocal
from weather2.ml.processor import process_raw_event

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("imd.ml_worker")

async def run_worker_loop():
    """Continuously processes raw events from the message bus."""
    logger.info("Initializing ML Stream Processing Engine...")
    await bus.initialize()
    logger.info("ML Worker listening for streaming events on raw-weather-events...")

    while True:
        try:
            raw_event = await bus.get_raw_event()
            db = SessionLocal()
            try:
                event = process_raw_event(raw_event, db)
                if event:
                    # Convert event to dict for WebSocket broadcast
                    event_dict = {
                        "id": event.id,
                        "source_id": event.source_id,
                        "source_name": raw_event.get("source_name", "synthetic"),
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
                    logger.info(f"[ENRICHED] {event.category.upper()} | {event.city} | Trust: {event.trust_score:.2f} | Verified: {event.is_verified}")
            except Exception as e:
                logger.error(f"Error processing event: {e}", exc_info=True)
                db.rollback()
            finally:
                db.close()
        except asyncio.CancelledError:
            logger.info("ML Worker shutting down...")
            break
        except Exception as e:
            logger.error(f"Unexpected worker error: {e}")
            await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(run_worker_loop())
