"""Routes for Payroll Sprint 2 — employee profiles, allowances, deductions, leave."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from database import get_db
from app.models.user import User
from app.schemas.payroll.sprint2 import (
    PayrollProfileCreate, PayrollProfileUpdate, PayrollProfileResponse,
    EmployeeAllowanceCreate, EmployeeAllowanceUpdate, EmployeeAllowanceResponse,
    EmployeeDeductionCreate, EmployeeDeductionUpdate, EmployeeDeductionResponse,
    LeaveBalanceResponse,
    LeaveRequestCreate, LeaveRequestUpdate, LeaveRequestResponse,
)
from app.services.payroll import sprint2 as svc
from app.services.company_groups import get_group_company_ids_for_user
from app.utils.dependencies import require_permission
from app.utils.permissions import Module, AccessLevel
from app.utils.request_context import get_client_ip

router = APIRouter()

_read = require_permission(Module.PAYROLL, AccessLevel.READ)
_write = require_permission(Module.PAYROLL, AccessLevel.WRITE)


# ── Payroll Profiles ─────────────────────────────────────────────────────────

@router.get("/profiles", response_model=list[PayrollProfileResponse])
def list_profiles(
    current_user: User = Depends(_read),
    db: Session = Depends(get_db),
):
    # Group payroll: GROUP_ADMIN sees all group employees
    if current_user.role in ("SUPER_ADMIN", "GROUP_ADMIN"):
        company_ids = get_group_company_ids_for_user(db, current_user)
        return svc.list_profiles_multi(db, company_ids)
    return svc.list_profiles(db, current_user.company_id)


@router.put("/profiles", response_model=PayrollProfileResponse, status_code=200)
def upsert_profile(
    data: PayrollProfileCreate,
    request: Request,
    current_user: User = Depends(_write),
    db: Session = Depends(get_db),
):
    return svc.upsert_profile(
        db, current_user.company_id, data.model_dump(),
        current_user.id, get_client_ip(request),
    )


@router.get("/profiles/{employee_id}", response_model=Optional[PayrollProfileResponse])
def get_profile(
    employee_id: UUID,
    current_user: User = Depends(_read),
    db: Session = Depends(get_db),
):
    return svc.get_profile(db, current_user.company_id, employee_id)


# ── Employee Allowances ───────────────────────────────────────────────────────

@router.get("/employees/{employee_id}/allowances", response_model=list[EmployeeAllowanceResponse])
def list_allowances(
    employee_id: UUID,
    current_user: User = Depends(_read),
    db: Session = Depends(get_db),
):
    return svc.list_employee_allowances(db, current_user.company_id, employee_id)


@router.put("/employees/{employee_id}/allowances", response_model=EmployeeAllowanceResponse)
def upsert_allowance(
    employee_id: UUID,
    data: EmployeeAllowanceCreate,
    request: Request,
    current_user: User = Depends(_write),
    db: Session = Depends(get_db),
):
    payload = data.model_dump()
    payload["employee_id"] = employee_id
    return svc.upsert_employee_allowance(
        db, current_user.company_id, payload,
        current_user.id, get_client_ip(request),
    )


@router.delete("/employees/{employee_id}/allowances/{item_id}", status_code=204)
def delete_allowance(
    employee_id: UUID,
    item_id: UUID,
    current_user: User = Depends(_write),
    db: Session = Depends(get_db),
):
    svc.delete_employee_allowance(db, item_id, current_user.company_id)


# ── Employee Deductions ───────────────────────────────────────────────────────

@router.get("/employees/{employee_id}/deductions", response_model=list[EmployeeDeductionResponse])
def list_deductions(
    employee_id: UUID,
    current_user: User = Depends(_read),
    db: Session = Depends(get_db),
):
    return svc.list_employee_deductions(db, current_user.company_id, employee_id)


@router.put("/employees/{employee_id}/deductions", response_model=EmployeeDeductionResponse)
def upsert_deduction(
    employee_id: UUID,
    data: EmployeeDeductionCreate,
    request: Request,
    current_user: User = Depends(_write),
    db: Session = Depends(get_db),
):
    payload = data.model_dump()
    payload["employee_id"] = employee_id
    return svc.upsert_employee_deduction(
        db, current_user.company_id, payload,
        current_user.id, get_client_ip(request),
    )


@router.delete("/employees/{employee_id}/deductions/{item_id}", status_code=204)
def delete_deduction(
    employee_id: UUID,
    item_id: UUID,
    current_user: User = Depends(_write),
    db: Session = Depends(get_db),
):
    svc.delete_employee_deduction(db, item_id, current_user.company_id)


# ── Leave Balances ────────────────────────────────────────────────────────────

@router.get("/employees/{employee_id}/leave-balances", response_model=list[LeaveBalanceResponse])
def get_leave_balances(
    employee_id: UUID,
    year: int = Query(...),
    current_user: User = Depends(_read),
    db: Session = Depends(get_db),
):
    balances = svc.get_or_init_leave_balances(
        db, current_user.company_id, employee_id, year
    )
    return [LeaveBalanceResponse.from_orm_with_remaining(b) for b in balances]


# ── Leave Requests ────────────────────────────────────────────────────────────

@router.get("/leave-requests", response_model=list[LeaveRequestResponse])
def list_leave_requests(
    employee_id: Optional[UUID] = Query(None),
    status_filter: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    current_user: User = Depends(_read),
    db: Session = Depends(get_db),
):
    return svc.list_leave_requests(
        db, current_user.company_id, employee_id, status_filter, year
    )


@router.post("/leave-requests", response_model=LeaveRequestResponse, status_code=201)
def create_leave_request(
    data: LeaveRequestCreate,
    request: Request,
    current_user: User = Depends(_write),
    db: Session = Depends(get_db),
):
    return svc.create_leave_request(
        db, current_user.company_id, data.model_dump(),
        current_user.id, get_client_ip(request),
    )


@router.patch("/leave-requests/{request_id}/status", response_model=LeaveRequestResponse)
def update_leave_request_status(
    request_id: UUID,
    data: LeaveRequestUpdate,
    request: Request,
    current_user: User = Depends(_write),
    db: Session = Depends(get_db),
):
    return svc.update_leave_request_status(
        db, request_id, current_user.company_id,
        data.status, current_user.id, data.rejection_reason,
        get_client_ip(request),
    )


@router.patch("/leave-requests/{request_id}/cancel", response_model=LeaveRequestResponse)
def cancel_leave_request(
    request_id: UUID,
    request: Request,
    current_user: User = Depends(_write),
    db: Session = Depends(get_db),
):
    return svc.cancel_leave_request(
        db, request_id, current_user.company_id,
        current_user.id, get_client_ip(request),
    )
