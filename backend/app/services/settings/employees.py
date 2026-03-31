from __future__ import annotations
"""CRUD services for Employees."""

import uuid
from datetime import date as date_type
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Employee
from app.services.audit import log_action, compute_diff


UPDATABLE_FIELDS = {
    "employee_ref", "name", "designation", "gender", "phone", "email",
    "monthly_salary", "status", "department", "hire_date", "date_of_birth", "address",
}

# Fields that need string→date conversion
DATE_FIELDS = {"hire_date", "date_of_birth"}


def _convert_dates(data: dict) -> dict:
    """Convert ISO date strings to Python date objects for SQLAlchemy."""
    for field in DATE_FIELDS:
        if field in data and isinstance(data[field], str):
            try:
                data[field] = date_type.fromisoformat(data[field])
            except (ValueError, TypeError):
                data[field] = None
    return data


async def _next_employee_ref(db: AsyncSession, company_id: UUID) -> str:
    """Auto-generate next employee_ref like E001, E002, etc."""
    result = await db.execute(
        select(sa_func.count()).where(Employee.company_id == company_id)
    )
    count = result.scalar() or 0
    return f"E{count + 1:03d}"


async def list_employees(db: AsyncSession, company_id: UUID) -> list[Employee]:
    result = await db.execute(
        select(Employee)
        .where(Employee.company_id == company_id)
        .order_by(Employee.employee_ref)
    )
    return list(result.scalars().all())


async def list_employees_multi(db: AsyncSession, company_ids: list[UUID]) -> list[Employee]:
    """List employees across multiple companies (group payroll)."""
    result = await db.execute(
        select(Employee)
        .where(Employee.company_id.in_(company_ids))
        .order_by(Employee.employee_ref)
    )
    return list(result.scalars().all())


async def create_employee(
    db: AsyncSession,
    company_id: UUID,
    data: dict,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> Employee:
    # Auto-generate employee_ref if not provided
    if not data.get("employee_ref"):
        data["employee_ref"] = await _next_employee_ref(db, company_id)

    existing = await db.execute(
        select(Employee).where(
            Employee.company_id == company_id,
            Employee.employee_ref == data["employee_ref"],
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Employee with ref '{data['employee_ref']}' already exists",
        )
    data = _convert_dates(data)
    item = Employee(id=uuid.uuid4(), company_id=company_id, created_by=user_id, **data)
    db.add(item)
    await db.flush()
    await log_action(
        db,
        company_id=company_id,
        table_name="employees",
        record_id=item.id,
        action="CREATE",
        user_id=user_id,
        ip_address=ip_address,
    )
    return item


async def update_employee(
    db: AsyncSession,
    item_id: UUID,
    company_id: UUID,
    data: dict,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> Employee:
    result = await db.execute(
        select(Employee).where(
            Employee.id == item_id, Employee.company_id == company_id
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    if "employee_ref" in data and data["employee_ref"] is not None and data["employee_ref"] != item.employee_ref:
        dup = await db.execute(
            select(Employee).where(
                Employee.company_id == company_id,
                Employee.employee_ref == data["employee_ref"],
                Employee.id != item_id,
            )
        )
        if dup.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Employee with ref '{data['employee_ref']}' already exists",
            )
    data = _convert_dates(data)
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
            table_name="employees",
            record_id=item.id,
            action="UPDATE",
            changed_fields=diff,
            user_id=user_id,
            ip_address=ip_address,
        )
    return item


async def update_employee_multi(
    db: AsyncSession,
    item_id: UUID,
    company_ids: list[UUID],
    data: dict,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> Employee:
    """Update employee across any of the given group company IDs."""
    result = await db.execute(
        select(Employee).where(
            Employee.id == item_id, Employee.company_id.in_(company_ids)
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    if "employee_ref" in data and data["employee_ref"] is not None and data["employee_ref"] != item.employee_ref:
        dup = await db.execute(
            select(Employee).where(
                Employee.company_id == item.company_id,
                Employee.employee_ref == data["employee_ref"],
                Employee.id != item_id,
            )
        )
        if dup.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Employee with ref '{data['employee_ref']}' already exists",
            )
    data = _convert_dates(data)
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
            company_id=item.company_id,
            table_name="employees",
            record_id=item.id,
            action="UPDATE",
            changed_fields=diff,
            user_id=user_id,
            ip_address=ip_address,
        )
    return item


async def delete_employee(
    db: AsyncSession,
    item_id: UUID,
    company_id: UUID,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> None:
    result = await db.execute(
        select(Employee).where(
            Employee.id == item_id, Employee.company_id == company_id
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    record_id = item.id
    await db.delete(item)
    await db.flush()
    await log_action(
        db,
        company_id=company_id,
        table_name="employees",
        record_id=record_id,
        action="DELETE",
        user_id=user_id,
        ip_address=ip_address,
    )
