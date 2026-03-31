"""General Ledger endpoint — paginated UNION of revenue + expense transactions."""
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

MAX_PAGE_SIZE = 200


class LedgerEntry(BaseModel):
    id: str
    date: str
    code: str
    account: str
    entry_type: str
    description: str
    location_name: str
    reference_no: str
    debit: Decimal = Decimal(0)
    credit: Decimal = Decimal(0)


class LedgerResponse(BaseModel):
    entries: List[LedgerEntry] = []
    total: int = 0
    page: int = 1
    size: int = 50


@router.get("/entries", response_model=LedgerResponse)
async def get_ledger_entries(
    year: int = Query(...),
    location_id: Optional[UUID] = Query(None),
    account_id: Optional[UUID] = Query(None),
    entry_type: Optional[str] = Query(None),  # "Income" | "Expense"
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=MAX_PAGE_SIZE),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cid = current_user.company_id
    params = base_params(cid, year, location_id)
    lf_rev = loc_filter("r", location_id)
    lf_exp = loc_filter("e", location_id)

    # Extra account filter
    acct_rev = " AND r.account_id = :account_id" if account_id else ""
    acct_exp = " AND e.account_id = :account_id" if account_id else ""
    if account_id:
        params["account_id"] = account_id

    offset = (page - 1) * size
    params["limit"] = size
    params["offset"] = offset

    rev_sql = f"""
        SELECT r.id::text, r.date, a.code, a.name AS account,
               'Income' AS entry_type,
               COALESCE(r.description, r.tenant_name, '') AS description,
               COALESCE(l.name, '') AS location_name,
               COALESCE(r.reference_no, '') AS reference_no,
               0::numeric AS debit, r.amount AS credit
        FROM revenue_transactions r
        JOIN accounts a ON r.account_id = a.id
        LEFT JOIN locations l ON r.location_id = l.id
        WHERE r.company_id = :cid AND r.is_voided = false AND r.fiscal_year = :year{lf_rev}{acct_rev}
    """

    exp_sql = f"""
        SELECT e.id::text, e.date, a.code, a.name AS account,
               'Expense' AS entry_type,
               COALESCE(e.description, e.vendor_name, '') AS description,
               COALESCE(l.name, '') AS location_name,
               COALESCE(e.reference_no, '') AS reference_no,
               e.amount AS debit, 0::numeric AS credit
        FROM expense_transactions e
        JOIN accounts a ON e.account_id = a.id
        LEFT JOIN locations l ON e.location_id = l.id
        WHERE e.company_id = :cid AND e.is_voided = false AND e.fiscal_year = :year{lf_exp}{acct_exp}
    """

    if entry_type == "Income":
        union_sql = rev_sql
    elif entry_type == "Expense":
        union_sql = exp_sql
    else:
        union_sql = f"({rev_sql}) UNION ALL ({exp_sql})"

    # Total count
    count_result = await db.execute(
        sa.text(f"SELECT COUNT(*) FROM ({union_sql}) gl"),
        params,
    )
    total = count_result.scalar_one()

    # Paginated data
    data_result = await db.execute(
        sa.text(f"""
            SELECT * FROM ({union_sql}) gl
            ORDER BY date DESC, credit DESC
            LIMIT :limit OFFSET :offset
        """),
        params,
    )

    entries = [
        LedgerEntry(
            id=row.id,
            date=str(row.date),
            code=row.code,
            account=row.account,
            entry_type=row.entry_type,
            description=row.description,
            location_name=row.location_name,
            reference_no=row.reference_no,
            debit=Decimal(str(row.debit)),
            credit=Decimal(str(row.credit)),
        )
        for row in data_result
    ]

    return LedgerResponse(entries=entries, total=total, page=page, size=size)
