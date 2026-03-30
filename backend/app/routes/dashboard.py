from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.models.user import User
from app.utils.dependencies import get_current_user

router = APIRouter()


class MonthlyPnlRow(BaseModel):
    month: str
    revenue: Decimal = Decimal(0)
    expenses: Decimal = Decimal(0)


class RevenueStreamRow(BaseModel):
    name: str
    value: Decimal = Decimal(0)


class ExpenseBudgetRow(BaseModel):
    category: str
    spent: Decimal = Decimal(0)
    budget: Decimal = Decimal(0)


class CashPositionRow(BaseModel):
    opening_balance: Decimal = Decimal(0)
    cash_in: Decimal = Decimal(0)
    cash_out: Decimal = Decimal(0)
    net_cash_flow: Decimal = Decimal(0)
    closing_balance: Decimal = Decimal(0)


class TrialBalanceRow(BaseModel):
    label: str
    debit: Decimal = Decimal(0)
    credit: Decimal = Decimal(0)


class GlEntryRow(BaseModel):
    id: str
    date: str
    account: str
    type: str
    description: str
    debit: Decimal = Decimal(0)
    credit: Decimal = Decimal(0)


class DashboardSummaryResponse(BaseModel):
    total_revenue: Decimal = Decimal(0)
    total_expenses: Decimal = Decimal(0)
    net_profit: Decimal = Decimal(0)
    profit_margin: Decimal = Decimal(0)
    staff_salaries: Decimal = Decimal(0)
    revenue_change_pct: Decimal | None = None
    expense_change_pct: Decimal | None = None
    monthly_pnl: list[MonthlyPnlRow] = []
    revenue_streams: list[RevenueStreamRow] = []
    expense_budget: list[ExpenseBudgetRow] = []
    cash_position: CashPositionRow = CashPositionRow()
    trial_balance: list[TrialBalanceRow] = []
    recent_gl_entries: list[GlEntryRow] = []


@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    year: int = Query(...),
    location_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Stub: returns empty/zero data. Will be filled when revenue/expense CRUD exists.
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return DashboardSummaryResponse(
        monthly_pnl=[MonthlyPnlRow(month=m) for m in months],
    )
