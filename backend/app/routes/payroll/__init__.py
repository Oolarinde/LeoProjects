from __future__ import annotations
"""Payroll routes — aggregates all payroll sub-routers."""

from fastapi import APIRouter

from app.routes.payroll.settings import router as settings_router
from app.routes.payroll.types import router as types_router
from app.routes.payroll.sprint2 import router as sprint2_router
from app.routes.payroll.sprint3 import router as sprint3_router
from app.routes.payroll.payslip import router as payslip_router

router = APIRouter()

router.include_router(settings_router, prefix="/settings", tags=["payroll-settings"])
router.include_router(types_router, tags=["payroll-types"])
router.include_router(sprint2_router, tags=["payroll-sprint2"])
router.include_router(sprint3_router, tags=["payroll-sprint3"])
router.include_router(payslip_router, tags=["payroll-payslips"])
