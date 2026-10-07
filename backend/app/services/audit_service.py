import json
import uuid

from sqlalchemy.orm import Session

from app.db.models import AuditLog


def log_event(
    db: Session,
    action: str,
    actor: str,
    order_id: str | None = None,
    details: dict | None = None
):

    log = AuditLog(
        id=str(uuid.uuid4()),
        order_id=order_id,
        action=action,
        actor=actor,
        details=json.dumps(details or {})
    )

    db.add(log)
    db.commit()

    return log