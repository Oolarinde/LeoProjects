from __future__ import annotations
"""CRUD services for Locations."""

import uuid
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.location import Location
from app.services.audit import log_action, compute_diff


UPDATABLE_FIELDS = {"name", "address"}


def list_locations(db: Session, company_id: UUID) -> list[Location]:
    result = db.execute(
        select(Location)
        .where(Location.company_id == company_id)
        .order_by(Location.name)
    )
    return list(result.scalars().all())


def create_location(
    db: Session,
    company_id: UUID,
    data: dict,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> Location:
    existing = db.execute(
        select(Location).where(
            Location.company_id == company_id,
            Location.name == data["name"],
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Location with name '{data['name']}' already exists",
        )
    item = Location(id=uuid.uuid4(), company_id=company_id, created_by=user_id, **data)
    db.add(item)
    db.flush()
    log_action(
        db,
        company_id=company_id,
        table_name="locations",
        record_id=item.id,
        action="CREATE",
        user_id=user_id,
        ip_address=ip_address,
    )
    return item


def update_location(
    db: Session,
    item_id: UUID,
    company_id: UUID,
    data: dict,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> Location:
    result = db.execute(
        select(Location).where(
            Location.id == item_id, Location.company_id == company_id
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    if "name" in data and data["name"] is not None and data["name"] != item.name:
        dup = db.execute(
            select(Location).where(
                Location.company_id == company_id,
                Location.name == data["name"],
                Location.id != item_id,
            )
        )
        if dup.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Location with name '{data['name']}' already exists",
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
            table_name="locations",
            record_id=item.id,
            action="UPDATE",
            changed_fields=diff,
            user_id=user_id,
            ip_address=ip_address,
        )
    return item


def delete_location(
    db: Session,
    item_id: UUID,
    company_id: UUID,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> None:
    result = db.execute(
        select(Location).where(
            Location.id == item_id, Location.company_id == company_id
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    record_id = item.id
    db.delete(item)
    db.flush()
    log_action(
        db,
        company_id=company_id,
        table_name="locations",
        record_id=record_id,
        action="DELETE",
        user_id=user_id,
        ip_address=ip_address,
    )
