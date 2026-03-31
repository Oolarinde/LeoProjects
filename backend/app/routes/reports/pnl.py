"""Profit & Loss report endpoint."""
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.models.user import User
from app.utils.dependencies import get_current_user
from app.utils.report_helpers import loc_filter, base_params

router = APIRouter()

MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


class PnlLineItem(BaseModel):
    code: str
    name: str
    total: Decimal = Decimal(0)
    monthly: List[Decimal] = []


class PnlResponse(BaseModel):
    revenue_lines: List[PnlLineItem] = []
    expense_lines: List[PnlLineItem] = []
    total_revenue: Decimal = Decimal(0)
    total_expenses: Decimal = Decimal(0)
    net_profit: Decimal = Decimal(0)
    profit_margin: Decimal = Decimal(0)
    month_names: List[str] = MONTH_NAMES


@router.get("/summary", response_model=PnlResponse)
async def get_pnl(
    year: int = Query(...),
    location_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cid = current_user.company_id
    params = base_params(cid, year, location_id)
    lf_rev = loc_filter("r", location_id)
    lf_exp = loc_filter("e", location_id)

    # Revenue by account with monthly breakdown
    rev_result = await db.execute(
        sa.text(f"""
            SELECT a.code, a.name,
                   EXTRACT(MONTH FROM r.date)::int AS month_num,
                   COALESCE(SUM(r.amount), 0) AS total
            FROM revenue_transactions r
            JOIN accounts a ON r.account_id = a.id
            WHERE r.company_id = :cid AND r.is_voided = false AND r.is_deposit = false AND r.fiscal_year = :year{lf_rev}
            GROUP BY a.code, a.name, month_num
            ORDER BY a.code, month_num
        """),
        params,
    )

    rev_map: dict = {}
    for row in rev_result:
        key = (row.code, row.name)
        if key not in rev_map:
            rev_map[key] = [Decimal(0)] * 12
        rev_map[key][row.month_num - 1] += Decimal(str(row.total))

    revenue_lines = [
        PnlLineItem(
            code=code,
            name=name,
            total=sum(monthly),
            monthly=monthly,
        )
        for (code, name), monthly in sorted(rev_map.items())
    ]

    # Expenses by account with monthly breakdown
    exp_result = await db.execute(
        sa.text(f"""
            SELECT a.code, a.name,
                   EXTRACT(MONTH FROM e.date)::int AS month_num,
                   COALESCE(SUM(e.amount), 0) AS total
            FROM expense_transactions e
            JOIN accounts a ON e.account_id = a.id
            WHERE e.company_id = :cid AND e.is_voided = false AND e.fiscal_year = :year{lf_exp}
            GROUP BY a.code, a.name, month_num
            ORDER BY a.code, month_num
        """),
        params,
    )

    exp_map: dict = {}
    for row in exp_result:
        key = (row.code, row.name)
        if key not in exp_map:
            exp_map[key] = [Decimal(0)] * 12
        exp_map[key][row.month_num - 1] += Decimal(str(row.total))

    expense_lines = [
        PnlLineItem(
            code=code,
            name=name,
            total=sum(monthly),
            monthly=monthly,
        )
        for (code, name), monthly in sorted(exp_map.items())
    ]

    total_revenue = sum(l.total for l in revenue_lines)
    total_expenses = sum(l.total for l in expense_lines)
    net_profit = total_revenue - total_expenses
    profit_margin = (
        (net_profit / total_revenue * 100).quantize(Decimal("0.01"))
        if total_revenue
        else Decimal(0)
    )

    return PnlResponse(
        revenue_lines=revenue_lines,
        expense_lines=expense_lines,
        total_revenue=total_revenue,
        total_expenses=total_expenses,
        net_profit=net_profit,
        profit_margin=profit_margin,
        month_names=MONTH_NAMES,
    )
