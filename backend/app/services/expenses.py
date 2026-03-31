"""CRUD services for Expense Transactions."""
from __future__ import annotations


import uuid
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, func as sqlfunc
from sqlalchemy.orm import Session

from app.models.expense_transaction import ExpenseTransaction
from app.services.audit import log_action, compute_diff


UPDATABLE_FIELDS = {
    "location_id", "account_id", "category", "date",
    "amount", "payment_method", "reference_no",
    "description", "vendor_name",
}


def list_expenses(
    db: Session,
    company_id: UUID,
    year: int,
    location_id: UUID | None = None,
    limit: int = 50,
    offset: int = 0,
    search: str | None = None,
) -> tuple[list[ExpenseTransaction], int]:
    """Return (items, total_count) filtered by year, optional location, paginated."""
    from sqlalchemy import or_
    base = select(ExpenseTransaction).where(
        ExpenseTransaction.company_id == company_id,
        ExpenseTransaction.fiscal_year == year,
        ExpenseTransaction.is_voided == False,
    )
    if location_id:
        base = base.where(ExpenseTransaction.location_id == location_id)
    if search:
        term = f"%{search.lower()}%"
        base = base.where(
            or_(
                ExpenseTransaction.vendor_name.ilike(term),
                ExpenseTransaction.reference_no.ilike(term),
                ExpenseTransaction.description.ilike(term),
                ExpenseTransaction.category.ilike(term),
            )
        )

    count_q = select(sqlfunc.count()).select_from(base.subquery())
    total = (db.execute(count_q)).scalar() or 0

    items_q = base.order_by(ExpenseTransaction.date.desc()).limit(limit).offset(offset)
    result = db.execute(items_q)
    return list(result.scalars().all()), total


def get_summary(
    db: Session,
    company_id: UUID,
    year: int,
    location_id: UUID | None = None,
) -> dict:
    """Return {total, count} for KPI cards."""
    base = select(
        sqlfunc.coalesce(sqlfunc.sum(ExpenseTransaction.amount), 0).label("total"),
        sqlfunc.count().label("count"),
    ).where(
        ExpenseTransaction.company_id == company_id,
        ExpenseTransaction.fiscal_year == year,
        ExpenseTransaction.is_voided == False,
    )
    if location_id:
        base = base.where(ExpenseTransaction.location_id == location_id)
    row = (db.execute(base)).one()
    return {"total": row.total, "count": row.count}


def create_expense(
    db: Session,
    company_id: UUID,
    data: dict,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> ExpenseTransaction:
    fiscal_year = data["date"].year
    item = ExpenseTransaction(
        id=uuid.uuid4(),
        company_id=company_id,
        fiscal_year=fiscal_year,
        created_by=user_id,
        **data,
    )
    db.add(item)
    db.flush()
    log_action(
        db,
        company_id=company_id,
        table_name="expense_transactions",
        record_id=item.id,
        action="CREATE",
        user_id=user_id,
        ip_address=ip_address,
    )
    return item


def update_expense(
    db: Session,
    item_id: UUID,
    company_id: UUID,
    data: dict,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> ExpenseTransaction:
    result = db.execute(
        select(ExpenseTransaction).where(
            ExpenseTransaction.id == item_id,
            ExpenseTransaction.company_id == company_id,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense transaction not found")

    safe = {k: v for k, v in data.items() if k in UPDATABLE_FIELDS}
    diff = compute_diff(item, safe)

    for key, value in safe.items():
        setattr(item, key, value)

    # Recompute fiscal_year if date changed
    if "date" in safe and safe["date"] is not None:
        item.fiscal_year = safe["date"].year

    item.updated_by = user_id
    db.flush()

    if diff:
        log_action(
            db,
            company_id=company_id,
            table_name="expense_transactions",
            record_id=item.id,
            action="UPDATE",
            changed_fields=diff,
            user_id=user_id,
            ip_address=ip_address,
        )
    return item


def void_expense(
    db: Session,
    item_id: UUID,
    company_id: UUID,
    reason: str = "",
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> ExpenseTransaction:
    """Void an expense transaction (never delete financial records)."""
    from datetime import datetime, timezone
    result = db.execute(
        select(ExpenseTransaction).where(
            ExpenseTransaction.id == item_id,
            ExpenseTransaction.company_id == company_id,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense transaction not found")
    if item.is_voided:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Transaction already voided")

    item.is_voided = True
    item.void_reason = reason
    item.voided_by = user_id
    item.voided_at = datetime.now(timezone.utc)
    db.flush()
    log_action(
        db,
        company_id=company_id,
        table_name="expense_transactions",
        record_id=item.id,
        action="VOID",
        changed_fields={"void_reason": reason},
        user_id=user_id,
        ip_address=ip_address,
    )
    db.commit()
    db.refresh(item)
    return item
