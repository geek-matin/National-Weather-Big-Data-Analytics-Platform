from backend.database import SessionLocal
from ml.processor import process_raw_event

db = SessionLocal()
sample = {
    "source_name": "reddit",
    "raw_text": "Heavy waterlogging reported near Dadar TT circle in Mumbai, traffic stranded #IMD #MumbaiRains",
    "author_handle": "u/testuser"
}
event = process_raw_event(sample, db)
print(f"[TEST PASSED] Created Event ID: {event.id} | City: {event.city} | Category: {event.category} | Trust: {event.trust_score} | Verified: {event.is_verified}")
db.close()
