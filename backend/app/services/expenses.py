"""CRUD services for Expense Transactions."""

import uuid
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, func as sqlfunc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.expense_transaction import ExpenseTransaction
from app.services.audit import log_action, compute_diff


UPDATABLE_FIELDS = {
    "location_id", "account_id", "category", "date",
    "amount", "payment_method", "reference_no",
    "description", "vendor_name",
}


async def list_expenses(
    db: AsyncSession,
    company_id: UUID,
    year: int,
    location_id: UUID | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[ExpenseTransaction], int]:
    """Return (items, total_count) filtered by year, optional location, paginated."""
    base = select(ExpenseTransaction).where(
        ExpenseTransaction.company_id == company_id,
        ExpenseTransaction.fiscal_year == year,
    )
    if location_id:
        base = base.where(ExpenseTransaction.location_id == location_id)

    count_q = select(sqlfunc.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    items_q = base.order_by(ExpenseTransaction.date.desc()).limit(limit).offset(offset)
    result = await db.execute(items_q)
    return list(result.scalars().all()), total


async def get_summary(
    db: AsyncSession,
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
    )
    if location_id:
        base = base.where(ExpenseTransaction.location_id == location_id)
    row = (await db.execute(base)).one()
    return {"total": row.total, "count": row.count}


async def create_expense(
    db: AsyncSession,
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
    await db.flush()
    await log_action(
        db,
        company_id=company_id,
        table_name="expense_transactions",
        record_id=item.id,
        action="CREATE",
        user_id=user_id,
        ip_address=ip_address,
    )
    return item


async def update_expense(
    db: AsyncSession,
    item_id: UUID,
    company_id: UUID,
    data: dict,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> ExpenseTransaction:
    result = await db.execute(
        select(ExpenseTransaction).where(
            ExpenseTransaction.id == item_id,
            ExpenseTransaction.company_id == company_id,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense transaction not found")

    filtered = {k: v for k, v in data.items() if v is not None and k in UPDATABLE_FIELDS}
    diff = compute_diff(item, filtered)

    for key, value in data.items():
        if value is not None and key in UPDATABLE_FIELDS:
            setattr(item, key, value)

    # Recompute fiscal_year if date changed
    if "date" in data and data["date"] is not None:
        item.fiscal_year = data["date"].year

    item.updated_by = user_id
    await db.flush()

    if diff:
        await log_action(
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


async def delete_expense(
    db: AsyncSession,
    item_id: UUID,
    company_id: UUID,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> None:
    result = await db.execute(
        select(ExpenseTransaction).where(
            ExpenseTransaction.id == item_id,
            ExpenseTransaction.company_id == company_id,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense transaction not found")
    record_id = item.id
    await db.delete(item)
    await db.flush()
    await log_action(
        db,
        company_id=company_id,
        table_name="expense_transactions",
        record_id=record_id,
        action="DELETE",
        user_id=user_id,
        ip_address=ip_address,
    )
