from fastapi import APIRouter

from .pnl import router as pnl_router
from .cashflow import router as cashflow_router
from .balance_sheet import router as balance_sheet_router
from .trial_balance import router as trial_balance_router
from .export import router as export_router

router = APIRouter()
router.include_router(pnl_router, prefix="/pnl", tags=["reports"])
router.include_router(cashflow_router, prefix="/cashflow", tags=["reports"])
router.include_router(balance_sheet_router, prefix="/balance-sheet", tags=["reports"])
router.include_router(trial_balance_router, prefix="/trial-balance", tags=["reports"])
router.include_router(export_router, tags=["reports-export"])
