"""CRUD services for Revenue Transactions."""
from __future__ import annotations


import uuid
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, func as sqlfunc
from sqlalchemy.orm import Session

from app.models.revenue_transaction import RevenueTransaction
from app.services.audit import log_action, compute_diff


UPDATABLE_FIELDS = {
    "location_id", "unit_id", "account_id", "date",
    "amount", "payment_method", "reference_no",
    "description", "tenant_name",
}


def list_revenue(
    db: Session,
    company_id: UUID,
    year: int,
    location_id: UUID | None = None,
    limit: int = 50,
    offset: int = 0,
    search: str | None = None,
) -> tuple[list[RevenueTransaction], int]:
    """Return (items, total_count) filtered by year, optional location, paginated."""
    from sqlalchemy import or_, cast, Text
    base = select(RevenueTransaction).where(
        RevenueTransaction.company_id == company_id,
        RevenueTransaction.fiscal_year == year,
        RevenueTransaction.is_voided == False,
    )
    if location_id:
        base = base.where(RevenueTransaction.location_id == location_id)
    if search:
        term = f"%{search.lower()}%"
        base = base.where(
            or_(
                RevenueTransaction.tenant_name.ilike(term),
                RevenueTransaction.reference_no.ilike(term),
                RevenueTransaction.description.ilike(term),
            )
        )

    # total count
    count_q = select(sqlfunc.count()).select_from(base.subquery())
    total = (db.execute(count_q)).scalar() or 0

    # paginated results
    items_q = base.order_by(RevenueTransaction.date.desc()).limit(limit).offset(offset)
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
        sqlfunc.coalesce(sqlfunc.sum(RevenueTransaction.amount), 0).label("total"),
        sqlfunc.count().label("count"),
    ).where(
        RevenueTransaction.company_id == company_id,
        RevenueTransaction.fiscal_year == year,
        RevenueTransaction.is_voided == False,
    )
    if location_id:
        base = base.where(RevenueTransaction.location_id == location_id)
    row = (db.execute(base)).one()
    return {"total": row.total, "count": row.count}


def create_revenue(
    db: Session,
    company_id: UUID,
    data: dict,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> RevenueTransaction:
    fiscal_year = data["date"].year
    item = RevenueTransaction(
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
        table_name="revenue_transactions",
        record_id=item.id,
        action="CREATE",
        user_id=user_id,
        ip_address=ip_address,
    )
    return item


def update_revenue(
    db: Session,
    item_id: UUID,
    company_id: UUID,
    data: dict,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> RevenueTransaction:
    result = db.execute(
        select(RevenueTransaction).where(
            RevenueTransaction.id == item_id,
            RevenueTransaction.company_id == company_id,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Revenue transaction not found")

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
            table_name="revenue_transactions",
            record_id=item.id,
            action="UPDATE",
            changed_fields=diff,
            user_id=user_id,
            ip_address=ip_address,
        )
    return item


def void_revenue(
    db: Session,
    item_id: UUID,
    company_id: UUID,
    reason: str = "",
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> RevenueTransaction:
    """Void a revenue transaction (never delete financial records)."""
    from datetime import datetime, timezone
    result = db.execute(
        select(RevenueTransaction).where(
            RevenueTransaction.id == item_id,
            RevenueTransaction.company_id == company_id,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Revenue transaction not found")
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
        table_name="revenue_transactions",
        record_id=item.id,
        action="VOID",
        changed_fields={"void_reason": reason},
        user_id=user_id,
        ip_address=ip_address,
    )
    db.commit()
    db.refresh(item)
    return item
