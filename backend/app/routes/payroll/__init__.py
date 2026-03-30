from __future__ import annotations
"""Payroll routes — aggregates all payroll sub-routers."""

from fastapi import APIRouter

from app.routes.payroll.settings import router as settings_router
from app.routes.payroll.types import router as types_router

router = APIRouter()

router.include_router(settings_router, prefix="/settings", tags=["payroll-settings"])
router.include_router(types_router, tags=["payroll-types"])
