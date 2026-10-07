from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import AuditLog


router = APIRouter(
    prefix="/api/audit",
    tags=["Audit"]
)


@router.get("/{order_id}")
def get_order_audit(
    order_id: str,
    db: Session = Depends(get_db)
):

    logs = (
        db.query(AuditLog)
        .filter(AuditLog.order_id == order_id)
        .order_by(AuditLog.created_at.asc())
        .all()
    )

    return {
        "order_id": order_id,
        "events": [
            {
                "id": log.id,
                "action": log.action,
                "actor": log.actor,
                "details": log.details,
                "created_at": log.created_at
            }
            for log in logs
        ]
    }