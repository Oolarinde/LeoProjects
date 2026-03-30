from __future__ import annotations
"""Payroll settings routes — GET / PUT for company-level config."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.models.user import User
from app.schemas.payroll.settings import PayrollSettingsResponse, PayrollSettingsUpdate
from app.services.payroll import settings as settings_service
from app.utils.dependencies import require_permission
from app.utils.permissions import Module, AccessLevel

router = APIRouter()


@router.get("", response_model=PayrollSettingsResponse)
async def get_settings(
    current_user: User = Depends(require_permission(Module.PAYROLL, AccessLevel.READ)),
    db: AsyncSession = Depends(get_db),
):
    return await settings_service.get_or_create_settings(db, current_user.company_id)


@router.put("", response_model=PayrollSettingsResponse)
async def update_settings(
    data: PayrollSettingsUpdate,
    current_user: User = Depends(require_permission(Module.PAYROLL, AccessLevel.WRITE)),
    db: AsyncSession = Depends(get_db),
):
    return await settings_service.update_settings(
        db, current_user.company_id, data.model_dump(exclude_unset=True)
    )
