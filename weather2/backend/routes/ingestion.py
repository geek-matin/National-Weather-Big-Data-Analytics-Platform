from fastapi import APIRouter
from weather2.backend.scheduler import ingestion_scheduler
from weather2.backend.schemas import IngestionStatusResponse

router = APIRouter(prefix="/ingestion", tags=["Automated Ingestion Scheduler"])

@router.get("/status", response_model=IngestionStatusResponse)
def get_scheduler_status():
    """Returns real-time status of the automated daily/interval ingestion scheduler."""
    return ingestion_scheduler.get_status()

@router.post("/sync")
async def trigger_manual_sync():
    """Triggers an immediate synchronization cycle across all connected sources."""
    results = await ingestion_scheduler.execute_sync_cycle()
    return {"message": "Automated ingestion synchronization cycle completed", "results": results}
