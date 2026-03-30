"""Analysis endpoint — aggregated data for 6 charts."""
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


# ── Response schemas ─────────────────────────────────────────────────────────

class MonthlyRevExpRow(BaseModel):
    month: str
    revenue: Decimal = Decimal(0)
    expenses: Decimal = Decimal(0)
    net: Decimal = Decimal(0)


class CategoryAmount(BaseModel):
    name: str
    amount: Decimal = Decimal(0)


class MonthlyCompareRow(BaseModel):
    month: str
    current_year: Decimal = Decimal(0)
    prior_year: Decimal = Decimal(0)


class BudgetUtilRow(BaseModel):
    category: str
    spent: Decimal = Decimal(0)
    budget: Decimal = Decimal(0)
    pct: Decimal = Decimal(0)


class AnalysisResponse(BaseModel):
    # Chart 1: Revenue vs Expense by month (area/bar)
    monthly_rev_exp: List[MonthlyRevExpRow] = []
    # Chart 2: Expense by category (pie)
    expense_by_category: List[CategoryAmount] = []
    # Chart 3: Revenue by source (horizontal bar)
    revenue_by_source: List[CategoryAmount] = []
    # Chart 4: Year-over-year revenue comparison
    yoy_revenue: List[MonthlyCompareRow] = []
    # Chart 5: Monthly cash flow (net = revenue - expenses)
    monthly_cashflow: List[MonthlyRevExpRow] = []
    # Chart 6: Budget utilization by category
    budget_utilization: List[BudgetUtilRow] = []
    # KPIs
    total_revenue: Decimal = Decimal(0)
    total_expenses: Decimal = Decimal(0)
    net_profit: Decimal = Decimal(0)
    avg_monthly_revenue: Decimal = Decimal(0)
    avg_monthly_expense: Decimal = Decimal(0)
    top_expense_category: str = ""
    top_revenue_source: str = ""


MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


@router.get("/summary", response_model=AnalysisResponse)
async def get_analysis(
    year: int = Query(...),
    location_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cid = current_user.company_id
    params = base_params(cid, year, location_id)
    prev_params = base_params(cid, year - 1, location_id)
    lf_rev = loc_filter("r", location_id)
    lf_exp = loc_filter("e", location_id)

    # ── Monthly revenue & expenses ───────────────────────────────────────
    rev_monthly = await db.execute(sa.text(f"""
        SELECT EXTRACT(MONTH FROM r.date)::int AS m, COALESCE(SUM(r.amount), 0) AS total
        FROM revenue_transactions r
        WHERE r.company_id = :cid AND r.fiscal_year = :year{lf_rev}
        GROUP BY m ORDER BY m
    """), params)
    rev_map = {row.m: Decimal(str(row.total)) for row in rev_monthly}

    exp_monthly = await db.execute(sa.text(f"""
        SELECT EXTRACT(MONTH FROM e.date)::int AS m, COALESCE(SUM(e.amount), 0) AS total
        FROM expense_transactions e
        WHERE e.company_id = :cid AND e.fiscal_year = :year{lf_exp}
        GROUP BY m ORDER BY m
    """), params)
    exp_map = {row.m: Decimal(str(row.total)) for row in exp_monthly}

    monthly_rev_exp = []
    monthly_cashflow = []
    for i in range(12):
        m = i + 1
        rv = rev_map.get(m, Decimal(0))
        ex = exp_map.get(m, Decimal(0))
        monthly_rev_exp.append(MonthlyRevExpRow(month=MONTH_NAMES[i], revenue=rv, expenses=ex, net=rv - ex))
        monthly_cashflow.append(MonthlyRevExpRow(month=MONTH_NAMES[i], revenue=rv, expenses=ex, net=rv - ex))

    total_revenue = sum(r.revenue for r in monthly_rev_exp)
    total_expenses = sum(r.expenses for r in monthly_rev_exp)

    # ── Expense by category (pie) ────────────────────────────────────────
    exp_cat = await db.execute(sa.text(f"""
        SELECT a.name, COALESCE(SUM(e.amount), 0) AS total
        FROM expense_transactions e
        JOIN accounts a ON e.account_id = a.id
        WHERE e.company_id = :cid AND e.fiscal_year = :year{lf_exp}
        GROUP BY a.name ORDER BY total DESC
    """), params)
    expense_by_category = [CategoryAmount(name=r.name, amount=Decimal(str(r.total))) for r in exp_cat]

    # ── Revenue by source (horizontal bar) ───────────────────────────────
    rev_src = await db.execute(sa.text(f"""
        SELECT a.name, COALESCE(SUM(r.amount), 0) AS total
        FROM revenue_transactions r
        JOIN accounts a ON r.account_id = a.id
        WHERE r.company_id = :cid AND r.fiscal_year = :year{lf_rev}
        GROUP BY a.name ORDER BY total DESC
    """), params)
    revenue_by_source = [CategoryAmount(name=r.name, amount=Decimal(str(r.total))) for r in rev_src]

    # ── Year-over-year revenue comparison ────────────────────────────────
    prev_rev = await db.execute(sa.text(f"""
        SELECT EXTRACT(MONTH FROM r.date)::int AS m, COALESCE(SUM(r.amount), 0) AS total
        FROM revenue_transactions r
        WHERE r.company_id = :cid AND r.fiscal_year = :year{lf_rev}
        GROUP BY m ORDER BY m
    """), prev_params)
    prev_map = {row.m: Decimal(str(row.total)) for row in prev_rev}

    yoy_revenue = [
        MonthlyCompareRow(
            month=MONTH_NAMES[i],
            current_year=rev_map.get(i + 1, Decimal(0)),
            prior_year=prev_map.get(i + 1, Decimal(0)),
        )
        for i in range(12)
    ]

    # ── Budget utilization ───────────────────────────────────────────────
    budget_util = await db.execute(sa.text(f"""
        SELECT
            COALESCE(s.name, b.category) AS category,
            COALESCE(s.spent, 0) AS spent,
            COALESCE(b.budget, 0) AS budget
        FROM (
            SELECT a.name, SUM(e.amount) AS spent
            FROM expense_transactions e
            JOIN accounts a ON e.account_id = a.id
            WHERE e.company_id = :cid AND e.fiscal_year = :year{lf_exp}
            GROUP BY a.name
        ) s
        FULL OUTER JOIN (
            SELECT bl.category, SUM(bl.amount) AS budget
            FROM budget_lines bl
            WHERE bl.company_id = :cid AND bl.year = :year AND bl.line_type = 'EXPENSE'
            GROUP BY bl.category
        ) b ON s.name = b.category
        WHERE COALESCE(s.spent, 0) > 0 OR COALESCE(b.budget, 0) > 0
        ORDER BY COALESCE(s.spent, 0) DESC
    """), params)
    budget_utilization = []
    for r in budget_util:
        spent = Decimal(str(r.spent))
        budget = Decimal(str(r.budget))
        pct = (spent / budget * 100).quantize(Decimal("0.1")) if budget > 0 else Decimal(0)
        budget_utilization.append(BudgetUtilRow(category=r.category, spent=spent, budget=budget, pct=pct))

    # ── KPIs ─────────────────────────────────────────────────────────────
    months_with_data = len([r for r in monthly_rev_exp if r.revenue > 0 or r.expenses > 0]) or 1
    net_profit = total_revenue - total_expenses
    avg_monthly_revenue = (total_revenue / months_with_data).quantize(Decimal("0.01"))
    avg_monthly_expense = (total_expenses / months_with_data).quantize(Decimal("0.01"))
    top_expense = expense_by_category[0].name if expense_by_category else ""
    top_revenue = revenue_by_source[0].name if revenue_by_source else ""

    return AnalysisResponse(
        monthly_rev_exp=monthly_rev_exp,
        expense_by_category=expense_by_category,
        revenue_by_source=revenue_by_source,
        yoy_revenue=yoy_revenue,
        monthly_cashflow=monthly_cashflow,
        budget_utilization=budget_utilization,
        total_revenue=total_revenue,
        total_expenses=total_expenses,
        net_profit=net_profit,
        avg_monthly_revenue=avg_monthly_revenue,
        avg_monthly_expense=avg_monthly_expense,
        top_expense_category=top_expense,
        top_revenue_source=top_revenue,
    )
