from __future__ import annotations
"""Payroll settings service — one settings row per company."""

import uuid
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.payroll.settings import PayrollSettings
from app.services.audit import log_action, compute_diff


def get_or_create_settings(db: Session, company_id: UUID) -> PayrollSettings:
    """Get payroll settings for a company, creating defaults if none exist."""
    result = db.execute(
        select(PayrollSettings).where(PayrollSettings.company_id == company_id)
    )
    settings = result.scalar_one_or_none()
    if settings is None:
        settings = PayrollSettings(id=uuid.uuid4(), company_id=company_id)
        db.add(settings)
        db.flush()
    return settings


UPDATABLE_SETTINGS_FIELDS = {
    "pay_period",
    "pension_employee_pct",
    "pension_employer_pct",
    "nhf_pct",
    "nsitf_employee_pct",
    "tax_method",
    "enable_13th_month",
    "fiscal_year_start_month",
}


def update_settings(
    db: Session,
    company_id: UUID,
    data: dict,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> PayrollSettings:
    """Update payroll settings for a company."""
    settings = get_or_create_settings(db, company_id)

    # Filter to only updatable fields for diff
    filtered = {k: v for k, v in data.items() if v is not None and k in UPDATABLE_SETTINGS_FIELDS}
    diff = compute_diff(settings, filtered)

    for key, value in data.items():
        if value is not None and key in UPDATABLE_SETTINGS_FIELDS:
            setattr(settings, key, value)

    settings.updated_by = user_id
    db.flush()

    if diff:
        log_action(
            db,
            company_id=company_id,
            table_name="payroll_settings",
            record_id=settings.id,
            action="UPDATE",
            changed_fields=diff,
            user_id=user_id,
            ip_address=ip_address,
        )
    return settings
