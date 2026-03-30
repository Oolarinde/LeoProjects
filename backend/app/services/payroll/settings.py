from __future__ import annotations
"""Payroll settings service — one settings row per company."""

import uuid
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payroll.settings import PayrollSettings


async def get_or_create_settings(db: AsyncSession, company_id: UUID) -> PayrollSettings:
    """Get payroll settings for a company, creating defaults if none exist."""
    result = await db.execute(
        select(PayrollSettings).where(PayrollSettings.company_id == company_id)
    )
    settings = result.scalar_one_or_none()
    if settings is None:
        settings = PayrollSettings(id=uuid.uuid4(), company_id=company_id)
        db.add(settings)
        await db.flush()
    return settings


async def update_settings(
    db: AsyncSession, company_id: UUID, data: dict
) -> PayrollSettings:
    """Update payroll settings for a company."""
    settings = await get_or_create_settings(db, company_id)
    for key, value in data.items():
        if value is not None and hasattr(settings, key):
            setattr(settings, key, value)
    await db.flush()
    return settings
