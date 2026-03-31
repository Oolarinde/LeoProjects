"""Balance Sheet report endpoint — Option A (cumulative cash-basis)."""
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.models.user import User
from app.utils.dependencies import get_current_user
from app.utils.report_helpers import loc_filter

router = APIRouter()


class BalanceSheetResponse(BaseModel):
    # Assets
    cash_and_bank: Decimal = Decimal(0)
    accounts_receivable: Decimal = Decimal(0)
    total_assets: Decimal = Decimal(0)
    # Liabilities
    caution_deposits_payable: Decimal = Decimal(0)
    total_liabilities: Decimal = Decimal(0)
    # Equity
    retained_earnings_prior: Decimal = Decimal(0)
    current_year_profit: Decimal = Decimal(0)
    total_equity: Decimal = Decimal(0)
    # Validation
    is_balanced: bool = True
    imbalance_amount: Decimal = Decimal(0)


@router.get("/summary", response_model=BalanceSheetResponse)
async def get_balance_sheet(
    year: int = Query(...),
    location_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Option A: Cash & Bank = cumulative all-time revenue minus all-time expenses.
    No year filter on assets — shows full company position as of end of selected year.
    Location filter applies to all queries when provided.
    """
    cid = current_user.company_id
    lf_rev = loc_filter("r", location_id)
    lf_exp = loc_filter("e", location_id)
    loc_params: dict = {"cid": cid}
    if location_id:
        loc_params["loc_id"] = location_id

    async def scalar(sql: str, params: dict) -> Decimal:
        result = await db.execute(sa.text(sql), params)
        return Decimal(str(result.scalar_one() or 0))

    # ── Assets ─────────────────────────────────────────────────────────────
    # Cash & Bank: all-time revenue minus all-time expenses (Option A)
    all_rev = await scalar(
        f"SELECT COALESCE(SUM(r.amount), 0) FROM revenue_transactions r "
        f"WHERE r.company_id = :cid AND r.is_voided = false{lf_rev}",
        loc_params,
    )
    all_exp = await scalar(
        f"SELECT COALESCE(SUM(e.amount), 0) FROM expense_transactions e "
        f"WHERE e.company_id = :cid AND e.is_voided = false{lf_exp}",
        loc_params,
    )
    cash_and_bank = all_rev - all_exp

    # ── Liabilities ────────────────────────────────────────────────────────
    # Caution Deposits Payable = all-time caution fee income (account code 4030)
    caution_deposits_payable = await scalar(
        f"SELECT COALESCE(SUM(r.amount), 0) "
        f"FROM revenue_transactions r "
        f"JOIN accounts a ON r.account_id = a.id "
        f"WHERE r.company_id = :cid AND r.is_voided = false AND a.code = '4030'{lf_rev}",
        loc_params,
    )

    # ── Equity ─────────────────────────────────────────────────────────────
    # Caution deposits are refundable liabilities, not earned revenue.
    # Exclude them from net profit so the balance sheet balances:
    #   Assets = Cash (all_rev - all_exp)
    #   Liabilities = Caution Deposits
    #   Equity = (all_rev - caution - all_exp) = Assets - Liabilities  ✓

    # Prior caution deposits
    prior_caution = await scalar(
        f"SELECT COALESCE(SUM(r.amount), 0) "
        f"FROM revenue_transactions r "
        f"JOIN accounts a ON r.account_id = a.id "
        f"WHERE r.company_id = :cid AND r.is_voided = false AND r.fiscal_year < :year AND a.code = '4030'{lf_rev}",
        {**loc_params, "year": year},
    )

    # Current year caution deposits
    cur_caution = await scalar(
        f"SELECT COALESCE(SUM(r.amount), 0) "
        f"FROM revenue_transactions r "
        f"JOIN accounts a ON r.account_id = a.id "
        f"WHERE r.company_id = :cid AND r.is_voided = false AND r.fiscal_year = :year AND a.code = '4030'{lf_rev}",
        {**loc_params, "year": year},
    )

    # Retained earnings: net operating profit for all years BEFORE selected year
    prior_rev = await scalar(
        f"SELECT COALESCE(SUM(r.amount), 0) FROM revenue_transactions r "
        f"WHERE r.company_id = :cid AND r.is_voided = false AND r.fiscal_year < :year{lf_rev}",
        {**loc_params, "year": year},
    )
    prior_exp = await scalar(
        f"SELECT COALESCE(SUM(e.amount), 0) FROM expense_transactions e "
        f"WHERE e.company_id = :cid AND e.is_voided = false AND e.fiscal_year < :year{lf_exp}",
        {**loc_params, "year": year},
    )
    retained_earnings_prior = prior_rev - prior_caution - prior_exp

    # Current year net operating profit (excluding caution deposits)
    cur_rev = await scalar(
        f"SELECT COALESCE(SUM(r.amount), 0) FROM revenue_transactions r "
        f"WHERE r.company_id = :cid AND r.is_voided = false AND r.fiscal_year = :year{lf_rev}",
        {**loc_params, "year": year},
    )
    cur_exp = await scalar(
        f"SELECT COALESCE(SUM(e.amount), 0) FROM expense_transactions e "
        f"WHERE e.company_id = :cid AND e.is_voided = false AND e.fiscal_year = :year{lf_exp}",
        {**loc_params, "year": year},
    )
    current_year_profit = cur_rev - cur_caution - cur_exp

    # ── Totals & balance check ──────────────────────────────────────────────
    total_assets = cash_and_bank
    total_liabilities = caution_deposits_payable
    total_equity = retained_earnings_prior + current_year_profit
    imbalance = total_assets - (total_liabilities + total_equity)
    is_balanced = abs(imbalance) < Decimal("0.01")

    return BalanceSheetResponse(
        cash_and_bank=cash_and_bank,
        accounts_receivable=Decimal(0),
        total_assets=total_assets,
        caution_deposits_payable=caution_deposits_payable,
        total_liabilities=total_liabilities,
        retained_earnings_prior=retained_earnings_prior,
        current_year_profit=current_year_profit,
        total_equity=total_equity,
        is_balanced=is_balanced,
        imbalance_amount=imbalance,
    )
