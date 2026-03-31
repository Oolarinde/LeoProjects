from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def compute_diff(instance, update_data: dict) -> dict:
    """Compare current model state against incoming update dict.

    Returns {field: {old, new}} for changed fields.
    """
    changes: dict = {}
    for field, new_val in update_data.items():
        old_val = getattr(instance, field, None)
        if str(old_val) != str(new_val):
            changes[field] = {
                "old": str(old_val) if old_val is not None else None,
                "new": str(new_val) if new_val is not None else None,
            }
    return changes


def log_action(
    db: Session,
    *,
    company_id: UUID,
    table_name: str,
    record_id: UUID,
    action: str,
    changed_fields: dict | None = None,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    entry = AuditLog(
        company_id=company_id,
        table_name=table_name,
        record_id=record_id,
        action=action,
        changed_fields=changed_fields,
        user_id=user_id,
        ip_address=ip_address,
    )
    db.add(entry)
    return entry
