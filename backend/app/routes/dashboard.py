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

router = APIRouter()

MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


# ---------------------------------------------------------------------------
# Response schemas (unchanged — frontend depends on this shape)
# ---------------------------------------------------------------------------

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
    revenue_change_pct: Optional[Decimal] = None
    expense_change_pct: Optional[Decimal] = None
    monthly_pnl: List[MonthlyPnlRow] = []
    revenue_streams: List[RevenueStreamRow] = []
    expense_budget: List[ExpenseBudgetRow] = []
    cash_position: CashPositionRow = CashPositionRow()
    trial_balance: List[TrialBalanceRow] = []
    recent_gl_entries: List[GlEntryRow] = []


# ---------------------------------------------------------------------------
# Helper: build the optional location filter clause
# ---------------------------------------------------------------------------

def _loc_filter(alias: str, location_id: Optional[UUID]) -> str:
    """Return an extra AND clause if location_id is set, else empty string."""
    if location_id is not None:
        return f" AND {alias}.location_id = :loc_id"
    return ""


def _base_params(company_id: UUID, year: int, location_id: Optional[UUID]) -> dict:
    """Return the base parameter dict for all queries."""
    params: dict = {"cid": company_id, "year": year}
    if location_id is not None:
        params["loc_id"] = location_id
    return params


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    year: int = Query(...),
    location_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cid = current_user.company_id
    params = _base_params(cid, year, location_id)
    prev_params = _base_params(cid, year - 1, location_id)
    loc_rev = _loc_filter("r", location_id)
    loc_exp = _loc_filter("e", location_id)

    # ------------------------------------------------------------------
    # 1. KPIs — totals for current year
    # ------------------------------------------------------------------
    rev_result = await db.execute(
        sa.text(f"""
            SELECT COALESCE(SUM(r.amount), 0) AS total
            FROM revenue_transactions r
            WHERE r.company_id = :cid AND r.fiscal_year = :year{loc_rev}
        """),
        params,
    )
    total_revenue = rev_result.scalar_one()

    exp_result = await db.execute(
        sa.text(f"""
            SELECT COALESCE(SUM(e.amount), 0) AS total
            FROM expense_transactions e
            WHERE e.company_id = :cid AND e.fiscal_year = :year{loc_exp}
        """),
        params,
    )
    total_expenses = exp_result.scalar_one()

    net_profit = total_revenue - total_expenses
    profit_margin = (
        (net_profit / total_revenue * 100) if total_revenue else Decimal(0)
    )

    # Staff salaries
    sal_result = await db.execute(
        sa.text(f"""
            SELECT COALESCE(SUM(e.amount), 0) AS total
            FROM expense_transactions e
            WHERE e.company_id = :cid AND e.fiscal_year = :year
              AND e.category = 'Salaries'{loc_exp}
        """),
        params,
    )
    staff_salaries = sal_result.scalar_one()

    # ------------------------------------------------------------------
    # 1b. Year-over-year change %
    # ------------------------------------------------------------------
    prev_rev_result = await db.execute(
        sa.text(f"""
            SELECT COALESCE(SUM(r.amount), 0) AS total
            FROM revenue_transactions r
            WHERE r.company_id = :cid AND r.fiscal_year = :year{loc_rev}
        """),
        prev_params,
    )
    prev_revenue = prev_rev_result.scalar_one()

    prev_exp_result = await db.execute(
        sa.text(f"""
            SELECT COALESCE(SUM(e.amount), 0) AS total
            FROM expense_transactions e
            WHERE e.company_id = :cid AND e.fiscal_year = :year{loc_exp}
        """),
        prev_params,
    )
    prev_expenses = prev_exp_result.scalar_one()

    revenue_change_pct: Optional[Decimal] = None
    if prev_revenue and prev_revenue > 0:
        revenue_change_pct = ((total_revenue - prev_revenue) / prev_revenue * 100).quantize(Decimal("0.01"))

    expense_change_pct: Optional[Decimal] = None
    if prev_expenses and prev_expenses > 0:
        expense_change_pct = ((total_expenses - prev_expenses) / prev_expenses * 100).quantize(Decimal("0.01"))

    # ------------------------------------------------------------------
    # 2. Monthly P&L — revenue and expenses per month
    # ------------------------------------------------------------------
    monthly_rev_result = await db.execute(
        sa.text(f"""
            SELECT EXTRACT(MONTH FROM r.date)::int AS month_num,
                   COALESCE(SUM(r.amount), 0) AS total
            FROM revenue_transactions r
            WHERE r.company_id = :cid AND r.fiscal_year = :year{loc_rev}
            GROUP BY month_num
            ORDER BY month_num
        """),
        params,
    )
    monthly_rev = {row.month_num: row.total for row in monthly_rev_result}

    monthly_exp_result = await db.execute(
        sa.text(f"""
            SELECT EXTRACT(MONTH FROM e.date)::int AS month_num,
                   COALESCE(SUM(e.amount), 0) AS total
            FROM expense_transactions e
            WHERE e.company_id = :cid AND e.fiscal_year = :year{loc_exp}
            GROUP BY month_num
            ORDER BY month_num
        """),
        params,
    )
    monthly_exp = {row.month_num: row.total for row in monthly_exp_result}

    monthly_pnl = [
        MonthlyPnlRow(
            month=MONTH_NAMES[i],
            revenue=monthly_rev.get(i + 1, Decimal(0)),
            expenses=monthly_exp.get(i + 1, Decimal(0)),
        )
        for i in range(12)
    ]

    # ------------------------------------------------------------------
    # 3. Revenue streams — by account name
    # ------------------------------------------------------------------
    streams_result = await db.execute(
        sa.text(f"""
            SELECT a.name, COALESCE(SUM(r.amount), 0) AS total
            FROM revenue_transactions r
            JOIN accounts a ON r.account_id = a.id
            WHERE r.company_id = :cid AND r.fiscal_year = :year{loc_rev}
            GROUP BY a.name
            ORDER BY total DESC
        """),
        params,
    )
    streams_rows = streams_result.all()
    streams_total = sum(row.total for row in streams_rows) or Decimal(1)
    revenue_streams = [
        RevenueStreamRow(
            name=row.name,
            value=(row.total / streams_total * 100).quantize(Decimal("0.01")),
        )
        for row in streams_rows
    ]

    # ------------------------------------------------------------------
    # 4. Expense budget — by category (budget column is 0 until budget table)
    # ------------------------------------------------------------------
    budget_result = await db.execute(
        sa.text(f"""
            SELECT e.category, COALESCE(SUM(e.amount), 0) AS spent
            FROM expense_transactions e
            WHERE e.company_id = :cid AND e.fiscal_year = :year{loc_exp}
            GROUP BY e.category
            ORDER BY spent DESC
        """),
        params,
    )
    expense_budget = [
        ExpenseBudgetRow(category=row.category, spent=row.spent, budget=Decimal(0))
        for row in budget_result
    ]

    # ------------------------------------------------------------------
    # 5. Cash position (simplified until opening balance table exists)
    # ------------------------------------------------------------------
    opening_balance = Decimal(0)
    cash_in = total_revenue
    cash_out = total_expenses
    net_cash_flow = cash_in - cash_out
    closing_balance = opening_balance + net_cash_flow

    cash_position = CashPositionRow(
        opening_balance=opening_balance,
        cash_in=cash_in,
        cash_out=cash_out,
        net_cash_flow=net_cash_flow,
        closing_balance=closing_balance,
    )

    # ------------------------------------------------------------------
    # 6. Trial balance (simplified: revenue = credit, expenses = debit)
    # ------------------------------------------------------------------
    trial_balance: List[TrialBalanceRow] = []

    # Revenue accounts on the credit side
    tb_rev_result = await db.execute(
        sa.text(f"""
            SELECT a.name, COALESCE(SUM(r.amount), 0) AS total
            FROM revenue_transactions r
            JOIN accounts a ON r.account_id = a.id
            WHERE r.company_id = :cid AND r.fiscal_year = :year{loc_rev}
            GROUP BY a.name
            ORDER BY a.name
        """),
        params,
    )
    for row in tb_rev_result:
        trial_balance.append(
            TrialBalanceRow(label=row.name, debit=Decimal(0), credit=row.total)
        )

    # Expense categories on the debit side
    tb_exp_result = await db.execute(
        sa.text(f"""
            SELECT e.category AS name, COALESCE(SUM(e.amount), 0) AS total
            FROM expense_transactions e
            WHERE e.company_id = :cid AND e.fiscal_year = :year{loc_exp}
            GROUP BY e.category
            ORDER BY e.category
        """),
        params,
    )
    for row in tb_exp_result:
        trial_balance.append(
            TrialBalanceRow(label=row.name, debit=row.total, credit=Decimal(0))
        )

    # Cash/Bank asset line (simplified: net cash = debit if positive)
    if net_cash_flow >= 0:
        trial_balance.insert(
            0, TrialBalanceRow(label="Cash & Bank", debit=net_cash_flow, credit=Decimal(0))
        )
    else:
        trial_balance.insert(
            0, TrialBalanceRow(label="Cash & Bank", debit=Decimal(0), credit=abs(net_cash_flow))
        )

    # ------------------------------------------------------------------
    # 7. Recent GL entries — last 10, UNION of revenue + expense
    # ------------------------------------------------------------------
    gl_result = await db.execute(
        sa.text(f"""
            (
                SELECT r.id::text, r.date, a.name AS account,
                       'Income' AS type, COALESCE(r.description, '') AS description,
                       0 AS debit, r.amount AS credit
                FROM revenue_transactions r
                JOIN accounts a ON r.account_id = a.id
                WHERE r.company_id = :cid AND r.fiscal_year = :year{loc_rev}
            )
            UNION ALL
            (
                SELECT e.id::text, e.date, e.category AS account,
                       'Expense' AS type, COALESCE(e.description, '') AS description,
                       e.amount AS debit, 0 AS credit
                FROM expense_transactions e
                WHERE e.company_id = :cid AND e.fiscal_year = :year{loc_exp}
            )
            ORDER BY date DESC, credit DESC
            LIMIT 10
        """),
        params,
    )
    recent_gl_entries = [
        GlEntryRow(
            id=row.id,
            date=str(row.date),
            account=row.account,
            type=row.type,
            description=row.description,
            debit=row.debit,
            credit=row.credit,
        )
        for row in gl_result
    ]

    # ------------------------------------------------------------------
    # Assemble response
    # ------------------------------------------------------------------
    return DashboardSummaryResponse(
        total_revenue=total_revenue,
        total_expenses=total_expenses,
        net_profit=net_profit,
        profit_margin=profit_margin.quantize(Decimal("0.01")) if total_revenue else Decimal(0),
        staff_salaries=staff_salaries,
        revenue_change_pct=revenue_change_pct,
        expense_change_pct=expense_change_pct,
        monthly_pnl=monthly_pnl,
        revenue_streams=revenue_streams,
        expense_budget=expense_budget,
        cash_position=cash_position,
        trial_balance=trial_balance,
        recent_gl_entries=recent_gl_entries,
    )
