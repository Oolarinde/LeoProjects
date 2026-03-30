from __future__ import annotations
"""CRUD services for Units."""

import uuid
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.unit import Unit
from app.models.location import Location
from app.services.audit import log_action, compute_diff


UPDATABLE_FIELDS = {"name", "location_id", "unit_type", "is_active"}


async def list_units(
    db: AsyncSession, company_id: UUID, location_id: UUID | None = None
) -> list[Unit]:
    stmt = select(Unit).where(Unit.company_id == company_id)
    if location_id is not None:
        stmt = stmt.where(Unit.location_id == location_id)
    stmt = stmt.order_by(Unit.name)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_unit(
    db: AsyncSession,
    company_id: UUID,
    data: dict,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> Unit:
    # Verify location belongs to same company
    loc_result = await db.execute(
        select(Location).where(
            Location.id == data["location_id"],
            Location.company_id == company_id,
        )
    )
    if loc_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found or does not belong to this company",
        )
    existing = await db.execute(
        select(Unit).where(
            Unit.company_id == company_id,
            Unit.location_id == data["location_id"],
            Unit.name == data["name"],
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Unit with name '{data['name']}' already exists at this location",
        )
    item = Unit(id=uuid.uuid4(), company_id=company_id, created_by=user_id, **data)
    db.add(item)
    await db.flush()
    await log_action(
        db,
        company_id=company_id,
        table_name="units",
        record_id=item.id,
        action="CREATE",
        user_id=user_id,
        ip_address=ip_address,
    )
    return item


async def update_unit(
    db: AsyncSession,
    item_id: UUID,
    company_id: UUID,
    data: dict,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> Unit:
    result = await db.execute(
        select(Unit).where(
            Unit.id == item_id, Unit.company_id == company_id
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unit not found")
    # If location_id is being changed, verify it belongs to same company
    if "location_id" in data and data["location_id"] is not None and data["location_id"] != item.location_id:
        loc_result = await db.execute(
            select(Location).where(
                Location.id == data["location_id"],
                Location.company_id == company_id,
            )
        )
        if loc_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found or does not belong to this company",
            )
    # Check duplicate name at same location
    check_name = data.get("name", item.name) or item.name
    check_loc = data.get("location_id", item.location_id) or item.location_id
    if check_name != item.name or check_loc != item.location_id:
        dup = await db.execute(
            select(Unit).where(
                Unit.company_id == company_id,
                Unit.location_id == check_loc,
                Unit.name == check_name,
                Unit.id != item_id,
            )
        )
        if dup.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Unit with name '{check_name}' already exists at this location",
            )
    filtered = {k: v for k, v in data.items() if v is not None and k in UPDATABLE_FIELDS}
    diff = compute_diff(item, filtered)
    for key, value in data.items():
        if value is not None and key in UPDATABLE_FIELDS:
            setattr(item, key, value)
    item.updated_by = user_id
    await db.flush()
    if diff:
        await log_action(
            db,
            company_id=company_id,
            table_name="units",
            record_id=item.id,
            action="UPDATE",
            changed_fields=diff,
            user_id=user_id,
            ip_address=ip_address,
        )
    return item


async def delete_unit(
    db: AsyncSession,
    item_id: UUID,
    company_id: UUID,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> None:
    result = await db.execute(
        select(Unit).where(
            Unit.id == item_id, Unit.company_id == company_id
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unit not found")
    record_id = item.id
    await db.delete(item)
    await db.flush()
    await log_action(
        db,
        company_id=company_id,
        table_name="units",
        record_id=record_id,
        action="DELETE",
        user_id=user_id,
        ip_address=ip_address,
    )
