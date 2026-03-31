"""Routes for employee cost allocations — assign staff to subsidiaries with cost percentages."""

from uuid import UUID
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from database import get_db
from app.models.user import User
from app.models.employee import Employee
from app.models.employee_cost_allocation import EmployeeCostAllocation
from app.models.company import Company
from app.utils.dependencies import get_current_user, require_permission
from app.utils.permissions import Module, AccessLevel

router = APIRouter()

_write = Depends(require_permission(Module.EMPLOYEES, AccessLevel.WRITE))


class CostAllocationLine(BaseModel):
    company_id: UUID
    percentage: Decimal = Field(..., gt=0, le=100)


class SetAllocationsRequest(BaseModel):
    """Set all cost allocations for an employee. Replaces existing ones. Must sum to 100%."""
    allocations: list[CostAllocationLine]


class CostAllocationResponse(BaseModel):
    employee_id: UUID
    employee_name: str
    allocations: list[dict]  # [{company_id, company_name, percentage}]


@router.get("/employees/{employee_id}/cost-allocations")
def get_employee_allocations(
    employee_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get cost allocations for an employee."""
    from app.services.company_groups import get_group_company_ids_for_user
    company_ids = get_group_company_ids_for_user(db, current_user)
    employee = (db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.company_id.in_(company_ids))
    )).scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    allocations = (db.execute(
        select(EmployeeCostAllocation, Company)
        .join(Company, EmployeeCostAllocation.company_id == Company.id)
        .where(EmployeeCostAllocation.employee_id == employee_id)
        .order_by(Company.name)
    )).all()

    return {
        "employee_id": str(employee.id),
        "employee_name": employee.name,
        "allocations": [
            {
                "id": str(a.EmployeeCostAllocation.id),
                "company_id": str(a.EmployeeCostAllocation.company_id),
                "company_name": a.Company.name,
                "entity_prefix": a.Company.entity_prefix,
                "percentage": a.EmployeeCostAllocation.percentage,
            }
            for a in allocations
        ],
    }


@router.put("/employees/{employee_id}/cost-allocations")
def set_employee_allocations(
    employee_id: UUID,
    data: SetAllocationsRequest,
    current_user: User = _write,
    db: Session = Depends(get_db),
):
    """Replace all cost allocations for an employee. Must sum to 100%."""
    from app.services.company_groups import get_group_company_ids_for_user
    company_ids = get_group_company_ids_for_user(db, current_user)
    employee = (db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.company_id.in_(company_ids))
    )).scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Validate sum = 100%
    total = sum(a.percentage for a in data.allocations)
    if abs(total - Decimal("100")) > Decimal("0.01"):
        raise HTTPException(
            status_code=422,
            detail=f"Allocations must sum to 100%. Current sum: {total}%",
        )

    # Delete existing allocations
    existing = (db.execute(
        select(EmployeeCostAllocation).where(EmployeeCostAllocation.employee_id == employee_id)
    )).scalars().all()
    for e in existing:
        db.delete(e)
    db.flush()

    # Create new allocations (validate target companies are in user's group)
    for alloc in data.allocations:
        if alloc.company_id not in [c for c in company_ids]:
            raise HTTPException(
                status_code=403,
                detail=f"No access to allocate costs to company {alloc.company_id}",
            )
        eca = EmployeeCostAllocation(
            employee_id=employee_id,
            company_id=alloc.company_id,
            percentage=alloc.percentage,
        )
        db.add(eca)

    db.flush()
    db.commit()

    return get_employee_allocations(employee_id, current_user, db)
