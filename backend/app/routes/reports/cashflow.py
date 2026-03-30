"""Cash Flow report endpoint."""
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


class MonthlyCashRow(BaseModel):
    month: str
    cash_in: Decimal = Decimal(0)
    cash_out: Decimal = Decimal(0)
    net: Decimal = Decimal(0)
    running_balance: Decimal = Decimal(0)


class CashFlowResponse(BaseModel):
    opening_balance: Decimal = Decimal(0)
    total_cash_in: Decimal = Decimal(0)
    total_cash_out: Decimal = Decimal(0)
    net_cash_flow: Decimal = Decimal(0)
    closing_balance: Decimal = Decimal(0)
    monthly_breakdown: List[MonthlyCashRow] = []


class OpeningBalanceUpdate(BaseModel):
    amount: Decimal
    notes: str = ""


@router.get("/summary", response_model=CashFlowResponse)
async def get_cashflow(
    year: int = Query(...),
    location_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cid = current_user.company_id
    params = base_params(cid, year, location_id)
    lf_rev = loc_filter("r", location_id)
    lf_exp = loc_filter("e", location_id)

    # Opening balance from table (default 0 if not set)
    ob_result = await db.execute(
        sa.text(
            "SELECT COALESCE(amount, 0) FROM opening_balances "
            "WHERE company_id = :cid AND year = :year"
        ),
        {"cid": cid, "year": year},
    )
    opening_balance = Decimal(str(ob_result.scalar() or 0))

    # Monthly cash in (revenue)
    rev_result = await db.execute(
        sa.text(f"""
            SELECT EXTRACT(MONTH FROM r.date)::int AS month_num,
                   COALESCE(SUM(r.amount), 0) AS total
            FROM revenue_transactions r
            WHERE r.company_id = :cid AND r.fiscal_year = :year{lf_rev}
            GROUP BY month_num ORDER BY month_num
        """),
        params,
    )
    monthly_rev = {row.month_num: Decimal(str(row.total)) for row in rev_result}

    # Monthly cash out (expenses)
    exp_result = await db.execute(
        sa.text(f"""
            SELECT EXTRACT(MONTH FROM e.date)::int AS month_num,
                   COALESCE(SUM(e.amount), 0) AS total
            FROM expense_transactions e
            WHERE e.company_id = :cid AND e.fiscal_year = :year{lf_exp}
            GROUP BY month_num ORDER BY month_num
        """),
        params,
    )
    monthly_exp = {row.month_num: Decimal(str(row.total)) for row in exp_result}

    # Build monthly breakdown with running balance
    monthly_breakdown: List[MonthlyCashRow] = []
    running = opening_balance
    for i in range(12):
        m = i + 1
        cash_in = monthly_rev.get(m, Decimal(0))
        cash_out = monthly_exp.get(m, Decimal(0))
        net = cash_in - cash_out
        running += net
        monthly_breakdown.append(
            MonthlyCashRow(
                month=MONTH_NAMES[i],
                cash_in=cash_in,
                cash_out=cash_out,
                net=net,
                running_balance=running,
            )
        )

    total_cash_in = sum(r.cash_in for r in monthly_breakdown)
    total_cash_out = sum(r.cash_out for r in monthly_breakdown)
    net_cash_flow = total_cash_in - total_cash_out
    closing_balance = opening_balance + net_cash_flow

    return CashFlowResponse(
        opening_balance=opening_balance,
        total_cash_in=total_cash_in,
        total_cash_out=total_cash_out,
        net_cash_flow=net_cash_flow,
        closing_balance=closing_balance,
        monthly_breakdown=monthly_breakdown,
    )


@router.put("/opening-balance")
async def set_opening_balance(
    body: OpeningBalanceUpdate,
    year: int = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upsert the opening cash balance for a given year."""
    cid = current_user.company_id

    existing = await db.execute(
        sa.text(
            "SELECT id FROM opening_balances WHERE company_id = :cid AND year = :year"
        ),
        {"cid": cid, "year": year},
    )
    row = existing.fetchone()

    if row:
        await db.execute(
            sa.text(
                "UPDATE opening_balances SET amount = :amount, notes = :notes, "
                "updated_at = NOW() WHERE company_id = :cid AND year = :year"
            ),
            {"cid": cid, "year": year, "amount": body.amount, "notes": body.notes},
        )
    else:
        await db.execute(
            sa.text(
                "INSERT INTO opening_balances (company_id, year, amount, notes) "
                "VALUES (:cid, :year, :amount, :notes)"
            ),
            {"cid": cid, "year": year, "amount": body.amount, "notes": body.notes},
        )

    await db.commit()
    return {"year": year, "amount": body.amount}
