from typing import Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from app.models.user import User
from app.models.location import Location
from app.models.unit import Unit
from app.models.account import Account
from app.models.employee import Employee
from app.models.reference_data import ReferenceData
from app.utils.dependencies import get_current_user

router = APIRouter()


# -- Response schemas (inline for simplicity) --


class LocationResponse(BaseModel):
    id: UUID
    name: str
    address: Optional[str] = None

    model_config = {"from_attributes": True}


class UnitResponse(BaseModel):
    id: UUID
    location_id: UUID
    name: str
    unit_type: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}


class AccountResponse(BaseModel):
    id: UUID
    code: str
    name: str
    type: str
    normal_balance: str
    description: Optional[str] = None

    model_config = {"from_attributes": True}


class EmployeeResponse(BaseModel):
    id: UUID
    employee_ref: str
    name: str
    designation: Optional[str] = None
    status: Optional[str] = None

    model_config = {"from_attributes": True}


class DropdownsResponse(BaseModel):
    items: Dict[str, List[str]]  # {category: [values]}


@router.get("/locations", response_model=List[LocationResponse])
def get_locations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = select(Location).where(Location.company_id == current_user.company_id).order_by(Location.name)
    return list((db.execute(q)).scalars().all())


@router.get("/units", response_model=List[UnitResponse])
def get_units(
    location_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = select(Unit).join(Location).where(Location.company_id == current_user.company_id)
    if location_id:
        q = q.where(Unit.location_id == location_id)
    q = q.order_by(Unit.name)
    return list((db.execute(q)).scalars().all())


@router.get("/accounts", response_model=List[AccountResponse])
def get_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = select(Account).where(Account.company_id == current_user.company_id).order_by(Account.code)
    return list((db.execute(q)).scalars().all())


@router.get("/employees", response_model=List[EmployeeResponse])
def get_employees(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = select(Employee).where(Employee.company_id == current_user.company_id).order_by(Employee.name)
    return list((db.execute(q)).scalars().all())


@router.get("/dropdowns", response_model=DropdownsResponse)
def get_dropdowns(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = (
        select(ReferenceData)
        .where(ReferenceData.company_id == current_user.company_id)
        .order_by(ReferenceData.category, ReferenceData.value)
    )
    rows = (db.execute(q)).scalars().all()
    grouped: dict[str, list[str]] = {}
    for row in rows:
        grouped.setdefault(row.category, []).append(row.value)
    return DropdownsResponse(items=grouped)
