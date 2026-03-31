"""Trial Balance report endpoint."""
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
import sqlalchemy as sa
from sqlalchemy.orm import Session

from database import get_db
from app.models.user import User
from app.utils.dependencies import get_current_user
from app.utils.report_helpers import loc_filter, base_params

router = APIRouter()


class TrialBalanceLine(BaseModel):
    code: str
    name: str
    account_type: str
    debit: Decimal = Decimal(0)
    credit: Decimal = Decimal(0)


class TrialBalanceResponse(BaseModel):
    lines: List[TrialBalanceLine] = []
    total_debit: Decimal = Decimal(0)
    total_credit: Decimal = Decimal(0)
    is_balanced: bool = True
    difference: Decimal = Decimal(0)


@router.get("/summary", response_model=TrialBalanceResponse)
def get_trial_balance(
    year: int = Query(...),
    location_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cid = current_user.company_id
    params = base_params(cid, year, location_id)
    lf_rev = loc_filter("r", location_id)
    lf_exp = loc_filter("e", location_id)

    # Revenue accounts — normal balance Credit
    rev_result = db.execute(
        sa.text(f"""
            SELECT a.code, a.name, a.type AS account_type,
                   0::numeric AS debit,
                   COALESCE(SUM(r.amount), 0) AS credit
            FROM revenue_transactions r
            JOIN accounts a ON r.account_id = a.id
            WHERE r.company_id = :cid AND r.is_voided = false AND r.fiscal_year = :year{lf_rev}
            GROUP BY a.code, a.name, a.type
            ORDER BY a.code
        """),
        params,
    )

    # Expense accounts — normal balance Debit
    exp_result = db.execute(
        sa.text(f"""
            SELECT a.code, a.name, a.type AS account_type,
                   COALESCE(SUM(e.amount), 0) AS debit,
                   0::numeric AS credit
            FROM expense_transactions e
            JOIN accounts a ON e.account_id = a.id
            WHERE e.company_id = :cid AND e.is_voided = false AND e.fiscal_year = :year{lf_exp}
            GROUP BY a.code, a.name, a.type
            ORDER BY a.code
        """),
        params,
    )

    lines: List[TrialBalanceLine] = []
    for row in rev_result:
        lines.append(
            TrialBalanceLine(
                code=row.code,
                name=row.name,
                account_type=row.account_type,
                debit=Decimal(str(row.debit)),
                credit=Decimal(str(row.credit)),
            )
        )
    for row in exp_result:
        lines.append(
            TrialBalanceLine(
                code=row.code,
                name=row.name,
                account_type=row.account_type,
                debit=Decimal(str(row.debit)),
                credit=Decimal(str(row.credit)),
            )
        )

    # Add Cash & Bank asset line to balance the trial balance.
    # In single-entry cash-basis: net cash = total revenue - total expenses (debit side).
    total_credit_raw = sum(l.credit for l in lines)
    total_debit_raw = sum(l.debit for l in lines)
    net_cash = total_credit_raw - total_debit_raw
    if net_cash >= 0:
        lines.insert(
            0,
            TrialBalanceLine(
                code="1010",
                name="Cash & Bank",
                account_type="Asset",
                debit=net_cash,
                credit=Decimal(0),
            ),
        )
    else:
        lines.insert(
            0,
            TrialBalanceLine(
                code="1010",
                name="Cash & Bank",
                account_type="Asset",
                debit=Decimal(0),
                credit=abs(net_cash),
            ),
        )

    lines.sort(key=lambda l: l.code)
    total_debit = sum(l.debit for l in lines)
    total_credit = sum(l.credit for l in lines)
    difference = total_debit - total_credit
    is_balanced = abs(difference) < Decimal("0.01")

    return TrialBalanceResponse(
        lines=lines,
        total_debit=total_debit,
        total_credit=total_credit,
        is_balanced=is_balanced,
        difference=difference,
    )
