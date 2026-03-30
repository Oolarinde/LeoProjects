"""SQLAlchemy ORM event listeners for automatic audit logging.

Call `register_audit_listeners()` once at app startup.
Listens for after_flush events and writes AuditLog entries for any
INSERT, UPDATE, or DELETE on tracked tables.
"""
from __future__ import annotations

import logging
from sqlalchemy import event, inspect
from sqlalchemy.orm import Session

from app.utils.audit_context import get_audit_context

logger = logging.getLogger(__name__)

# Tables to audit — all data tables except audit_log and login_sessions themselves
AUDITED_TABLES = {
    "companies", "users", "groups", "locations", "units",
    "accounts", "employees", "reference_data",
    "payroll_settings", "allowance_types", "deduction_types",
    "tax_brackets", "leave_policies",
    "revenue_transactions", "expense_transactions",
    "budget_lines", "payroll_records",
}


def _should_audit(instance) -> bool:
    return getattr(instance, "__tablename__", None) in AUDITED_TABLES


def _get_changes(instance) -> dict:
    """Get changed fields for an UPDATE."""
    insp = inspect(instance)
    changes = {}
    for attr in insp.attrs:
        hist = attr.history
        if hist.has_changes():
            old = hist.deleted[0] if hist.deleted else None
            new = hist.added[0] if hist.added else None
            changes[attr.key] = {
                "old": str(old) if old is not None else None,
                "new": str(new) if new is not None else None,
            }
    # Filter out noisy fields
    changes.pop("updated_at", None)
    changes.pop("updated_by", None)
    return changes


def _on_after_flush(session: Session, flush_context) -> None:
    """After flush, record audit entries for all changed objects."""
    from app.models.audit_log import AuditLog

    company_id, user_id, ip_address = get_audit_context()

    entries = []

    for instance in session.new:
        if not _should_audit(instance):
            continue
        cid = getattr(instance, "company_id", None) or company_id
        if cid is None:
            continue
        entries.append(AuditLog(
            company_id=cid,
            table_name=instance.__tablename__,
            record_id=instance.id,
            action="INSERT",
            user_id=user_id,
            ip_address=ip_address,
        ))

    for instance in session.dirty:
        if not _should_audit(instance):
            continue
        changes = _get_changes(instance)
        if not changes:
            continue
        cid = getattr(instance, "company_id", None) or company_id
        if cid is None:
            continue
        entries.append(AuditLog(
            company_id=cid,
            table_name=instance.__tablename__,
            record_id=instance.id,
            action="UPDATE",
            changed_fields=changes,
            user_id=user_id,
            ip_address=ip_address,
        ))

    for instance in session.deleted:
        if not _should_audit(instance):
            continue
        cid = getattr(instance, "company_id", None) or company_id
        if cid is None:
            continue
        entries.append(AuditLog(
            company_id=cid,
            table_name=instance.__tablename__,
            record_id=instance.id,
            action="DELETE",
            user_id=user_id,
            ip_address=ip_address,
        ))

    for entry in entries:
        session.add(entry)


def register_audit_listeners() -> None:
    """Register the after_flush listener on all Sessions."""
    event.listen(Session, "after_flush", _on_after_flush)
    logger.info("Audit listeners registered for %d tables", len(AUDITED_TABLES))
