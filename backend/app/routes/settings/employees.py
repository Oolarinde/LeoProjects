"""CRUD routes for Employees."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.models.user import User
from app.schemas.settings.employees import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
)
from app.services.settings import employees as employees_service
from app.services.company_groups import get_group_company_ids_for_user
from app.utils.dependencies import require_permission
from app.utils.permissions import Module, AccessLevel

router = APIRouter()

_read = require_permission(Module.EMPLOYEES, AccessLevel.READ)
_write = require_permission(Module.EMPLOYEES, AccessLevel.WRITE)


@router.get("/", response_model=list[EmployeeResponse])
async def list_employees(
    current_user: User = Depends(_read),
    db: AsyncSession = Depends(get_db),
):
    # Group payroll: GROUP_ADMIN sees all group employees
    if current_user.role in ("SUPER_ADMIN", "GROUP_ADMIN"):
        company_ids = await get_group_company_ids_for_user(db, current_user)
        return await employees_service.list_employees_multi(db, company_ids)
    return await employees_service.list_employees(db, current_user.company_id)


@router.post("/", response_model=EmployeeResponse, status_code=201)
async def create_employee(
    data: EmployeeCreate,
    current_user: User = Depends(_write),
    db: AsyncSession = Depends(get_db),
):
    # GROUP_ADMIN can create employees in any subsidiary
    target_company_id = current_user.company_id
    if data.target_company_id and current_user.role in ("SUPER_ADMIN", "GROUP_ADMIN"):
        group_ids = await get_group_company_ids_for_user(db, current_user)
        if data.target_company_id not in group_ids:
            raise HTTPException(status_code=403, detail="No access to target company")
        target_company_id = data.target_company_id

    create_data = data.model_dump(exclude={"target_company_id"})
    return await employees_service.create_employee(
        db, target_company_id, create_data
    )


@router.patch("/{item_id}", response_model=EmployeeResponse)
async def update_employee(
    item_id: UUID,
    data: EmployeeUpdate,
    current_user: User = Depends(_write),
    db: AsyncSession = Depends(get_db),
):
    # GROUP_ADMIN can update employees across subsidiaries
    if current_user.role in ("SUPER_ADMIN", "GROUP_ADMIN"):
        group_ids = await get_group_company_ids_for_user(db, current_user)
        return await employees_service.update_employee_multi(
            db, item_id, group_ids, data.model_dump(exclude_unset=True)
        )
    return await employees_service.update_employee(
        db, item_id, current_user.company_id, data.model_dump(exclude_unset=True)
    )


@router.delete("/{item_id}", status_code=204)
async def delete_employee(
    item_id: UUID,
    current_user: User = Depends(_write),
    db: AsyncSession = Depends(get_db),
):
    await employees_service.delete_employee(db, item_id, current_user.company_id)
