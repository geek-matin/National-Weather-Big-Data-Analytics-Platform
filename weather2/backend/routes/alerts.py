from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from weather2.backend.database import get_db
from weather2.backend.models import Alert
from weather2.backend.schemas import AlertResponse

router = APIRouter(prefix="/alerts", tags=["Disaster Cluster Alerts"])

@router.get("", response_model=List[AlertResponse])
def get_active_alerts(db: Session = Depends(get_db)):
    """Fetches active meteorological disaster warnings and cluster triggers."""
    alerts = (
        db.query(Alert)
        .filter(Alert.is_active == True)
        .order_by(desc(Alert.created_at))
        .limit(10)
        .all()
    )
    return alerts

@router.post("/{alert_id}/dismiss")
def dismiss_alert(alert_id: str, db: Session = Depends(get_db)):
    """Deactivates a resolved disaster alert."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_active = False
    db.commit()
    return {"status": "dismissed", "alert_id": alert_id}
