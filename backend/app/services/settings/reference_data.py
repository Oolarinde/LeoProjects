from __future__ import annotations
"""CRUD services for Reference Data."""

import uuid
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.reference_data import ReferenceData
from app.services.audit import log_action, compute_diff


UPDATABLE_FIELDS = {"category", "value"}


def list_reference_data(
    db: Session, company_id: UUID, category: str | None = None
) -> list[ReferenceData]:
    stmt = select(ReferenceData).where(ReferenceData.company_id == company_id)
    if category is not None:
        stmt = stmt.where(ReferenceData.category == category)
    stmt = stmt.order_by(ReferenceData.category, ReferenceData.value)
    result = db.execute(stmt)
    return list(result.scalars().all())


def create_reference_data(
    db: Session,
    company_id: UUID,
    data: dict,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> ReferenceData:
    existing = db.execute(
        select(ReferenceData).where(
            ReferenceData.company_id == company_id,
            ReferenceData.category == data["category"],
            ReferenceData.value == data["value"],
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Reference data '{data['value']}' in category '{data['category']}' already exists",
        )
    item = ReferenceData(id=uuid.uuid4(), company_id=company_id, created_by=user_id, **data)
    db.add(item)
    db.flush()
    log_action(
        db,
        company_id=company_id,
        table_name="reference_data",
        record_id=item.id,
        action="CREATE",
        user_id=user_id,
        ip_address=ip_address,
    )
    return item


def update_reference_data(
    db: Session,
    item_id: UUID,
    company_id: UUID,
    data: dict,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> ReferenceData:
    result = db.execute(
        select(ReferenceData).where(
            ReferenceData.id == item_id, ReferenceData.company_id == company_id
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reference data not found")
    # Check duplicate on (company_id, category, value)
    check_cat = data.get("category") or item.category
    check_val = data.get("value") or item.value
    if check_cat != item.category or check_val != item.value:
        dup = db.execute(
            select(ReferenceData).where(
                ReferenceData.company_id == company_id,
                ReferenceData.category == check_cat,
                ReferenceData.value == check_val,
                ReferenceData.id != item_id,
            )
        )
        if dup.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Reference data '{check_val}' in category '{check_cat}' already exists",
            )
    filtered = {k: v for k, v in data.items() if v is not None and k in UPDATABLE_FIELDS}
    diff = compute_diff(item, filtered)
    for key, value in data.items():
        if value is not None and key in UPDATABLE_FIELDS:
            setattr(item, key, value)
    item.updated_by = user_id
    db.flush()
    if diff:
        log_action(
            db,
            company_id=company_id,
            table_name="reference_data",
            record_id=item.id,
            action="UPDATE",
            changed_fields=diff,
            user_id=user_id,
            ip_address=ip_address,
        )
    return item


def delete_reference_data(
    db: Session,
    item_id: UUID,
    company_id: UUID,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> None:
    result = db.execute(
        select(ReferenceData).where(
            ReferenceData.id == item_id, ReferenceData.company_id == company_id
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reference data not found")
    record_id = item.id
    db.delete(item)
    db.flush()
    log_action(
        db,
        company_id=company_id,
        table_name="reference_data",
        record_id=record_id,
        action="DELETE",
        user_id=user_id,
        ip_address=ip_address,
    )
