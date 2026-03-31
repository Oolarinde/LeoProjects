"""Services for Payroll Sprint 2 — employee profiles, allowances, deductions, leave."""
from __future__ import annotations


import uuid
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.payroll.employee_payroll_profile import EmployeePayrollProfile
from app.models.payroll.employee_allowance import EmployeeAllowance
from app.models.payroll.employee_deduction import EmployeeDeduction
from app.models.payroll.employee_leave_balance import EmployeeLeaveBalance
from app.models.payroll.leave_policy import LeavePolicy
from app.models.payroll.leave_request import LeaveRequest
from app.services.audit import log_action, compute_diff


# ── Employee Payroll Profile ────────────────────────────────────────────────

def get_profile(db: Session, company_id: UUID, employee_id: UUID) -> EmployeePayrollProfile | None:
    result = db.execute(
        select(EmployeePayrollProfile).where(
            EmployeePayrollProfile.company_id == company_id,
            EmployeePayrollProfile.employee_id == employee_id,
        )
    )
    return result.scalar_one_or_none()


def list_profiles(db: Session, company_id: UUID) -> list[EmployeePayrollProfile]:
    result = db.execute(
        select(EmployeePayrollProfile)
        .where(EmployeePayrollProfile.company_id == company_id)
        .order_by(EmployeePayrollProfile.created_at)
    )
    return list(result.scalars().all())


def list_profiles_multi(db: Session, company_ids: list[UUID]) -> list[EmployeePayrollProfile]:
    """List payroll profiles across multiple companies (group payroll)."""
    result = db.execute(
        select(EmployeePayrollProfile)
        .where(EmployeePayrollProfile.company_id.in_(company_ids))
        .order_by(EmployeePayrollProfile.created_at)
    )
    return list(result.scalars().all())


def upsert_profile(
    db: Session,
    company_id: UUID,
    data: dict,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> EmployeePayrollProfile:
    employee_id = data["employee_id"]
    existing = get_profile(db, company_id, employee_id)

    if existing:
        diff = compute_diff(existing, {k: v for k, v in data.items() if k != "employee_id"})
        for k, v in data.items():
            if k != "employee_id" and hasattr(existing, k):
                setattr(existing, k, v)
        existing.updated_by = user_id
        db.flush()
        if diff:
            log_action(db, company_id=company_id, table_name="employee_payroll_profiles",
                             record_id=existing.id, action="UPDATE", changed_fields=diff,
                             user_id=user_id, ip_address=ip_address)
        return existing

    profile = EmployeePayrollProfile(
        id=uuid.uuid4(), company_id=company_id, created_by=user_id, **data,
    )
    db.add(profile)
    db.flush()
    log_action(db, company_id=company_id, table_name="employee_payroll_profiles",
                     record_id=profile.id, action="CREATE", user_id=user_id, ip_address=ip_address)
    return profile


# ── Employee Allowances ─────────────────────────────────────────────────────

def list_employee_allowances(
    db: Session, company_id: UUID, employee_id: UUID
) -> list[EmployeeAllowance]:
    result = db.execute(
        select(EmployeeAllowance).where(
            EmployeeAllowance.company_id == company_id,
            EmployeeAllowance.employee_id == employee_id,
        )
    )
    return list(result.scalars().all())


def upsert_employee_allowance(
    db: Session,
    company_id: UUID,
    data: dict,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> EmployeeAllowance:
    existing = (db.execute(
        select(EmployeeAllowance).where(
            EmployeeAllowance.employee_id == data["employee_id"],
            EmployeeAllowance.allowance_type_id == data["allowance_type_id"],
        )
    )).scalar_one_or_none()

    if existing:
        for k, v in data.items():
            if k not in ("employee_id", "allowance_type_id"):
                setattr(existing, k, v)
        existing.updated_by = user_id
        db.flush()
        return existing

    item = EmployeeAllowance(id=uuid.uuid4(), company_id=company_id, created_by=user_id, **data)
    db.add(item)
    db.flush()
    return item


def delete_employee_allowance(
    db: Session, item_id: UUID, company_id: UUID
) -> None:
    item = (db.execute(
        select(EmployeeAllowance).where(
            EmployeeAllowance.id == item_id,
            EmployeeAllowance.company_id == company_id,
        )
    )).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allowance not found")
    db.delete(item)
    db.flush()


# ── Employee Deductions ─────────────────────────────────────────────────────

def list_employee_deductions(
    db: Session, company_id: UUID, employee_id: UUID
) -> list[EmployeeDeduction]:
    result = db.execute(
        select(EmployeeDeduction).where(
            EmployeeDeduction.company_id == company_id,
            EmployeeDeduction.employee_id == employee_id,
        )
    )
    return list(result.scalars().all())


def upsert_employee_deduction(
    db: Session,
    company_id: UUID,
    data: dict,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> EmployeeDeduction:
    existing = (db.execute(
        select(EmployeeDeduction).where(
            EmployeeDeduction.employee_id == data["employee_id"],
            EmployeeDeduction.deduction_type_id == data["deduction_type_id"],
        )
    )).scalar_one_or_none()

    if existing:
        for k, v in data.items():
            if k not in ("employee_id", "deduction_type_id"):
                setattr(existing, k, v)
        existing.updated_by = user_id
        db.flush()
        return existing

    item = EmployeeDeduction(id=uuid.uuid4(), company_id=company_id, created_by=user_id, **data)
    db.add(item)
    db.flush()
    return item


def delete_employee_deduction(
    db: Session, item_id: UUID, company_id: UUID
) -> None:
    item = (db.execute(
        select(EmployeeDeduction).where(
            EmployeeDeduction.id == item_id,
            EmployeeDeduction.company_id == company_id,
        )
    )).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deduction not found")
    db.delete(item)
    db.flush()


# ── Leave Balances ──────────────────────────────────────────────────────────

def get_or_init_leave_balances(
    db: Session,
    company_id: UUID,
    employee_id: UUID,
    year: int,
) -> list[EmployeeLeaveBalance]:
    """Return leave balances for the year, initialising from policies if missing."""
    existing = (db.execute(
        select(EmployeeLeaveBalance).where(
            EmployeeLeaveBalance.company_id == company_id,
            EmployeeLeaveBalance.employee_id == employee_id,
            EmployeeLeaveBalance.year == year,
        )
    )).scalars().all()

    if existing:
        return list(existing)

    # Bootstrap from active leave policies
    policies = (db.execute(
        select(LeavePolicy).where(
            LeavePolicy.company_id == company_id,
            LeavePolicy.is_active == True,  # noqa: E712
        )
    )).scalars().all()

    balances = []
    for policy in policies:
        bal = EmployeeLeaveBalance(
            id=uuid.uuid4(),
            company_id=company_id,
            employee_id=employee_id,
            leave_policy_id=policy.id,
            year=year,
            entitled_days=Decimal(policy.days_per_year),
            used_days=Decimal(0),
            carried_over_days=Decimal(0),
        )
        db.add(bal)
        balances.append(bal)

    db.flush()
    return balances


# ── Leave Requests ──────────────────────────────────────────────────────────

def list_leave_requests(
    db: Session,
    company_id: UUID,
    employee_id: UUID | None = None,
    status_filter: str | None = None,
    year: int | None = None,
) -> list[LeaveRequest]:
    q = select(LeaveRequest).where(LeaveRequest.company_id == company_id)
    if employee_id:
        q = q.where(LeaveRequest.employee_id == employee_id)
    if status_filter:
        q = q.where(LeaveRequest.status == status_filter)
    if year:
        from sqlalchemy import extract
        q = q.where(extract("year", LeaveRequest.start_date) == year)
    q = q.order_by(LeaveRequest.created_at.desc())
    return list((db.execute(q)).scalars().all())


def create_leave_request(
    db: Session,
    company_id: UUID,
    data: dict,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> LeaveRequest:
    req = LeaveRequest(id=uuid.uuid4(), company_id=company_id, created_by=user_id, **data)
    db.add(req)
    db.flush()
    log_action(db, company_id=company_id, table_name="leave_requests",
                     record_id=req.id, action="CREATE", user_id=user_id, ip_address=ip_address)
    return req


def update_leave_request_status(
    db: Session,
    request_id: UUID,
    company_id: UUID,
    new_status: str,
    approver_id: UUID | None = None,
    rejection_reason: str | None = None,
    ip_address: str | None = None,
) -> LeaveRequest:
    req = (db.execute(
        select(LeaveRequest).where(
            LeaveRequest.id == request_id,
            LeaveRequest.company_id == company_id,
        )
    )).scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found")
    if req.status not in ("PENDING",):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Cannot change status from {req.status}",
        )

    req.status = new_status
    req.updated_by = approver_id
    if new_status == "APPROVED":
        req.approved_by = approver_id
        req.approved_at = datetime.now(timezone.utc)
        # Deduct from leave balance
        _deduct_leave(db, company_id, req)
    elif new_status == "REJECTED":
        req.rejection_reason = rejection_reason

    db.flush()
    log_action(db, company_id=company_id, table_name="leave_requests",
                     record_id=req.id, action="UPDATE",
                     changed_fields={"status": new_status},
                     user_id=approver_id, ip_address=ip_address)
    return req


def cancel_leave_request(
    db: Session,
    request_id: UUID,
    company_id: UUID,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> LeaveRequest:
    req = (db.execute(
        select(LeaveRequest).where(
            LeaveRequest.id == request_id,
            LeaveRequest.company_id == company_id,
        )
    )).scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found")
    if req.status == "CANCELLED":
        return req

    # If was approved, restore leave balance
    if req.status == "APPROVED":
        _restore_leave(db, company_id, req)

    req.status = "CANCELLED"
    req.updated_by = user_id
    db.flush()
    return req


def _deduct_leave(db: Session, company_id: UUID, req: LeaveRequest) -> None:
    year = req.start_date.year
    bal = (db.execute(
        select(EmployeeLeaveBalance).where(
            EmployeeLeaveBalance.employee_id == req.employee_id,
            EmployeeLeaveBalance.leave_policy_id == req.leave_policy_id,
            EmployeeLeaveBalance.year == year,
        )
    )).scalar_one_or_none()
    if bal:
        bal.used_days = bal.used_days + req.days_requested


def _restore_leave(db: Session, company_id: UUID, req: LeaveRequest) -> None:
    year = req.start_date.year
    bal = (db.execute(
        select(EmployeeLeaveBalance).where(
            EmployeeLeaveBalance.employee_id == req.employee_id,
            EmployeeLeaveBalance.leave_policy_id == req.leave_policy_id,
            EmployeeLeaveBalance.year == year,
        )
    )).scalar_one_or_none()
    if bal:
        bal.used_days = max(Decimal(0), bal.used_days - req.days_requested)
