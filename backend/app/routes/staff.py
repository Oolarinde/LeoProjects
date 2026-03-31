"""Staff profile routes — comprehensive employee management."""

import os
import secrets
import uuid as _uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, func as sa_func
from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload

from database import get_db
from app.models.employee import Employee
from app.models.employee_cost_allocation import EmployeeCostAllocation
from app.models.company import Company
from app.models.group import Group
from app.models.user import User
from app.models.user_company_membership import UserCompanyMembership
from app.models.login_session import LoginSession
from app.models.payroll.payroll_item import PayrollItem
from app.models.payroll.payroll_run import PayrollRun
from app.models.payroll.employee_payroll_profile import EmployeePayrollProfile
from app.models.payroll.employee_leave_balance import EmployeeLeaveBalance
from app.models.payroll.leave_request import LeaveRequest
from app.models.payroll.leave_policy import LeavePolicy
from app.utils.dependencies import get_current_user, require_permission
from app.utils.permissions import Module, AccessLevel
from app.utils.config import settings as app_settings
from app.services.company_groups import get_group_company_ids_for_user
from app.utils.security import hash_password

router = APIRouter()

_write = Depends(require_permission(Module.STAFF, AccessLevel.WRITE))


# ── Schemas ──────────────────────────────────────────────────────────────────


class StaffUpdateBody(BaseModel):
    name: Optional[str] = None
    designation: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    next_of_kin_name: Optional[str] = None
    next_of_kin_phone: Optional[str] = None
    next_of_kin_relationship: Optional[str] = None
    department: Optional[str] = None
    hire_date: Optional[str] = None
    supervisor_id: Optional[str] = None
    status: Optional[str] = None
    monthly_salary: Optional[Decimal] = None
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None


class StaffCreateBody(BaseModel):
    employee_ref: str = ""  # Auto-generated if empty
    name: str
    company_id: Optional[str] = None
    designation: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    hire_date: Optional[str] = None
    monthly_salary: Optional[Decimal] = None
    status: str = "Active"
    create_login: bool = False
    login_role: str = "STAFF"


class CreateLoginBody(BaseModel):
    email: str
    role: str = "STAFF"


# ── Helpers ──────────────────────────────────────────────────────────────────


def _get_employee_or_404(
    db: Session, employee_id: UUID, company_ids: list[UUID]
) -> Employee:
    """Fetch employee within the user's accessible companies, or raise 404."""
    stmt = select(Employee).where(
        Employee.id == employee_id,
        Employee.company_id.in_(company_ids),
    )
    emp = (db.execute(stmt)).scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp


def _serialize_employee(emp: Employee, company: Optional[Company], supervisor: Optional[Employee],
                        linked_user: Optional[User], cost_allocs: list) -> dict:
    """Build the rich staff profile response."""
    result = {
        "id": str(emp.id),
        "employee_ref": emp.employee_ref,
        "name": emp.name,
        "photo_url": emp.photo_url,
        "designation": emp.designation,
        "department": emp.department,
        "gender": emp.gender,
        "phone": emp.phone,
        "email": emp.email,
        "date_of_birth": emp.date_of_birth.isoformat() if emp.date_of_birth else None,
        "address": emp.address,
        "hire_date": emp.hire_date.isoformat() if emp.hire_date else None,
        "monthly_salary": float(emp.monthly_salary) if emp.monthly_salary else None,
        "status": emp.status,
        "created_at": emp.created_at.isoformat() if emp.created_at else None,
        "updated_at": emp.updated_at.isoformat() if emp.updated_at else None,
        "next_of_kin": {
            "name": emp.next_of_kin_name,
            "phone": emp.next_of_kin_phone,
            "relationship": emp.next_of_kin_relationship,
        },
        "bank": {
            "name": emp.bank_name,
            "account_no": emp.bank_account_no,
        },
        "supervisor": None,
        "company": None,
        "cost_allocations": cost_allocs,
        "linked_user": None,
    }
    if company:
        result["company"] = {
            "id": str(company.id),
            "name": company.name,
            "entity_prefix": company.entity_prefix,
        }
    if supervisor:
        result["supervisor"] = {
            "id": str(supervisor.id),
            "name": supervisor.name,
            "employee_ref": supervisor.employee_ref,
        }
    if linked_user:
        result["linked_user"] = {
            "id": str(linked_user.id),
            "email": linked_user.email,
            "role": linked_user.role,
            "is_active": linked_user.is_active,
            "avatar_url": linked_user.avatar_url,
        }
    return result


# ── GET /staff/{employee_id} — Full profile ─────────────────────────────────


@router.get("/{employee_id}")
def get_staff_profile(
    employee_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_ids = get_group_company_ids_for_user(db, current_user)
    emp = _get_employee_or_404(db, employee_id, company_ids)

    # Load company
    company = (db.execute(
        select(Company).where(Company.id == emp.company_id)
    )).scalar_one_or_none()

    # Load supervisor
    supervisor = None
    if emp.supervisor_id:
        supervisor = (db.execute(
            select(Employee).where(Employee.id == emp.supervisor_id)
        )).scalar_one_or_none()

    # Load linked user
    linked_user = None
    if emp.user_id:
        linked_user = (db.execute(
            select(User).where(User.id == emp.user_id)
        )).scalar_one_or_none()

    # Load cost allocations with companies in one query (no N+1)
    alloc_rows = (db.execute(
        select(EmployeeCostAllocation, Company)
        .join(Company, EmployeeCostAllocation.company_id == Company.id)
        .where(EmployeeCostAllocation.employee_id == emp.id)
        .order_by(Company.name)
    )).all()
    cost_allocs = [
        {
            "company_id": str(a.EmployeeCostAllocation.company_id),
            "company_name": a.Company.name,
            "entity_prefix": a.Company.entity_prefix,
            "percentage": float(a.EmployeeCostAllocation.percentage),
        }
        for a in alloc_rows
    ]

    return _serialize_employee(emp, company, supervisor, linked_user, cost_allocs)


# ── PUT /staff/{employee_id} — Update profile ───────────────────────────────


@router.put("/{employee_id}")
def update_staff_profile(
    employee_id: UUID,
    body: StaffUpdateBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_ids = get_group_company_ids_for_user(db, current_user)
    emp = _get_employee_or_404(db, employee_id, company_ids)

    from datetime import date as date_type

    ALLOWED_FIELDS = {
        "name", "designation", "gender", "phone", "email",
        "address", "next_of_kin_name", "next_of_kin_phone",
        "next_of_kin_relationship", "department", "status",
        "bank_name", "bank_account_no",
    }

    for field, value in body.model_dump(exclude_unset=True).items():
        if field in ALLOWED_FIELDS:
            setattr(emp, field, value)
        elif field == "date_of_birth" and value is not None:
            emp.date_of_birth = date_type.fromisoformat(value)
        elif field == "hire_date" and value is not None:
            emp.hire_date = date_type.fromisoformat(value)
        elif field == "supervisor_id":
            emp.supervisor_id = UUID(value) if value else None
        elif field == "monthly_salary" and value is not None:
            emp.monthly_salary = Decimal(str(value))

    emp.updated_by = current_user.id
    db.flush()

    # Re-fetch for response
    return get_staff_profile(employee_id, db, current_user)


# ── POST /staff/{employee_id}/photo — Upload photo ──────────────────────────


@router.post("/{employee_id}/photo")
def upload_staff_photo(
    employee_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_ids = get_group_company_ids_for_user(db, current_user)
    emp = _get_employee_or_404(db, employee_id, company_ids)

    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" not in content_type:
        raise HTTPException(status_code=400, detail="Expected multipart/form-data")

    form = request.form()
    file = form.get("photo")
    if file is None:
        raise HTTPException(status_code=400, detail="No photo file provided")

    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are allowed")

    data = file.read()
    MAX_SIZE = 2 * 1024 * 1024  # 2 MB
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File size must be under 2 MB")

    ext = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}[file.content_type]
    filename = f"staff_{emp.id}_{_uuid.uuid4().hex[:8]}{ext}"
    staff_dir = os.path.join(app_settings.UPLOAD_DIR, "staff")
    os.makedirs(staff_dir, exist_ok=True)
    filepath = os.path.join(staff_dir, filename)

    # Remove old photo if exists (path traversal safe)
    if emp.photo_url:
        old_filename = os.path.basename(emp.photo_url)
        old_path = os.path.join(staff_dir, old_filename)
        if os.path.isfile(old_path):
            os.remove(old_path)

    with open(filepath, "wb") as f:
        f.write(data)

    emp.photo_url = f"/uploads/staff/{filename}"
    emp.updated_by = current_user.id
    db.flush()

    return {"photo_url": emp.photo_url}


# ── GET /staff/{employee_id}/payroll-history ─────────────────────────────────


@router.get("/{employee_id}/payroll-history")
def get_payroll_history(
    employee_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_ids = get_group_company_ids_for_user(db, current_user)
    emp = _get_employee_or_404(db, employee_id, company_ids)

    stmt = (
        select(PayrollItem, PayrollRun)
        .join(PayrollRun, PayrollItem.payroll_run_id == PayrollRun.id)
        .where(PayrollItem.employee_id == emp.id)
        .order_by(PayrollRun.year.desc(), PayrollRun.month.desc())
    )
    rows = (db.execute(stmt)).all()

    items = []
    for pi, pr in rows:
        items.append({
            "id": str(pi.id),
            "payroll_run_id": str(pr.id),
            "year": pr.year,
            "month": pr.month,
            "status": pr.status,
            "basic_salary": float(pi.basic_salary),
            "total_allowances": float(pi.total_allowances),
            "gross_pay": float(pi.gross_pay),
            "paye_tax": float(pi.paye_tax),
            "pension_employee": float(pi.pension_employee),
            "pension_employer": float(pi.pension_employer),
            "nhf": float(pi.nhf),
            "nsitf": float(pi.nsitf),
            "other_deductions": float(pi.other_deductions),
            "total_deductions": float(pi.total_deductions),
            "net_pay": float(pi.net_pay),
            "run_date": pr.run_date.isoformat() if pr.run_date else None,
        })

    return items


# ── GET /staff/{employee_id}/leave ───────────────────────────────────────────


@router.get("/{employee_id}/leave")
def get_leave_info(
    employee_id: UUID,
    year: int = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_ids = get_group_company_ids_for_user(db, current_user)
    emp = _get_employee_or_404(db, employee_id, company_ids)

    # Use current year if not specified
    if year is None:
        year = datetime.now().year

    # Leave balances
    bal_stmt = (
        select(EmployeeLeaveBalance, LeavePolicy)
        .join(LeavePolicy, EmployeeLeaveBalance.leave_policy_id == LeavePolicy.id)
        .where(
            EmployeeLeaveBalance.employee_id == emp.id,
            EmployeeLeaveBalance.year == year,
        )
    )
    bal_rows = (db.execute(bal_stmt)).all()

    balances = []
    for bal, policy in bal_rows:
        remaining = float(bal.entitled_days) + float(bal.carried_over_days) - float(bal.used_days)
        balances.append({
            "id": str(bal.id),
            "leave_type": policy.leave_type,
            "entitled_days": float(bal.entitled_days),
            "carried_over_days": float(bal.carried_over_days),
            "used_days": float(bal.used_days),
            "remaining_days": remaining,
            "is_paid": policy.is_paid,
        })

    # Leave requests (all time, most recent first)
    req_stmt = (
        select(LeaveRequest, LeavePolicy)
        .join(LeavePolicy, LeaveRequest.leave_policy_id == LeavePolicy.id)
        .where(LeaveRequest.employee_id == emp.id)
        .order_by(LeaveRequest.start_date.desc())
        .limit(50)
    )
    req_rows = (db.execute(req_stmt)).all()

    requests = []
    for req, policy in req_rows:
        requests.append({
            "id": str(req.id),
            "leave_type": policy.leave_type,
            "start_date": req.start_date.isoformat(),
            "end_date": req.end_date.isoformat(),
            "days_requested": float(req.days_requested),
            "status": req.status,
            "reason": req.reason,
            "rejection_reason": req.rejection_reason,
            "created_at": req.created_at.isoformat() if req.created_at else None,
        })

    return {"year": year, "balances": balances, "requests": requests}


# ── GET /staff/{employee_id}/login-history ───────────────────────────────────


@router.get("/{employee_id}/login-history")
def get_login_history(
    employee_id: UUID,
    limit: int = Query(default=20, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_ids = get_group_company_ids_for_user(db, current_user)
    emp = _get_employee_or_404(db, employee_id, company_ids)

    if not emp.user_id:
        return {"has_login": False, "sessions": []}

    stmt = (
        select(LoginSession)
        .where(LoginSession.user_id == emp.user_id)
        .order_by(LoginSession.created_at.desc())
        .limit(limit)
    )
    sessions = (db.execute(stmt)).scalars().all()

    return {
        "has_login": True,
        "sessions": [
            {
                "id": str(s.id),
                "ip_address": s.ip_address,
                "browser": s.browser,
                "os": s.os,
                "device_type": s.device_type,
                "city": s.city,
                "country": s.country,
                "created_at": s.created_at.isoformat(),
            }
            for s in sessions
        ],
    }


# ── POST /staff — Create new staff member ───────────────────────────────────


@router.post("", status_code=201)
def create_staff(
    body: StaffCreateBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target_company_id = UUID(body.company_id) if body.company_id else current_user.company_id
    company_ids = get_group_company_ids_for_user(db, current_user)
    if target_company_id not in company_ids:
        raise HTTPException(status_code=403, detail="No access to this company")

    from datetime import date as date_type

    # Auto-generate employee_ref if not provided
    ref = body.employee_ref.strip() if body.employee_ref else ""
    if not ref:
        from app.services.settings.employees import _next_employee_ref
        ref = _next_employee_ref(db, target_company_id)

    emp = Employee(
        company_id=target_company_id,
        employee_ref=ref,
        name=body.name,
        designation=body.designation,
        gender=body.gender,
        phone=body.phone,
        email=body.email,
        department=body.department,
        hire_date=date_type.fromisoformat(body.hire_date) if body.hire_date else None,
        monthly_salary=Decimal(str(body.monthly_salary)) if body.monthly_salary else None,
        status=body.status,
        created_by=current_user.id,
    )
    db.add(emp)
    db.flush()

    temp_password = None
    if body.create_login and body.email:
        temp_password = _create_login_for_employee(
            db, emp, body.email, body.login_role, target_company_id, current_user
        )

    result = {
        "id": str(emp.id),
        "employee_ref": emp.employee_ref,
        "name": emp.name,
    }
    if temp_password:
        result["temp_password"] = temp_password
    return result


# ── POST /staff/{employee_id}/create-login ───────────────────────────────────


@router.post("/{employee_id}/create-login")
def create_login_for_employee(
    employee_id: UUID,
    body: CreateLoginBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_ids = get_group_company_ids_for_user(db, current_user)
    emp = _get_employee_or_404(db, employee_id, company_ids)

    if emp.user_id:
        raise HTTPException(status_code=409, detail="Employee already has a login account")

    # Check email not taken
    existing = (db.execute(
        select(User).where(User.email == body.email.lower().strip())
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="This email address is already registered")

    temp_password = _create_login_for_employee(
        db, emp, body.email, body.role, emp.company_id, current_user
    )

    return {
        "message": "Login account created",
        "email": body.email.lower().strip(),
        "temp_password": temp_password,
        "user_id": str(emp.user_id),
    }


def _create_login_for_employee(
    db: Session,
    emp: Employee,
    email: str,
    role: str,
    company_id: UUID,
    current_user: User,
) -> str:
    """Create a User + membership for an employee. Returns temporary password."""
    from app.services.auth import _ensure_default_roles

    # Get or create the Staff role
    _admin_role, staff_role = _ensure_default_roles(db, company_id)

    # Use admin role if the requested role is ADMIN/COMPANY_ADMIN, else staff
    use_role = _admin_role if role in ("ADMIN", "COMPANY_ADMIN", "SUPER_ADMIN") else staff_role

    temp_password = secrets.token_urlsafe(12)

    user = User(
        company_id=company_id,
        email=email.lower().strip(),
        hashed_password=hash_password(temp_password),
        full_name=emp.name,
        role=role if role in ("ADMIN", "COMPANY_ADMIN", "SUPER_ADMIN", "STAFF") else "STAFF",
        permissions=use_role.permissions,
        group_id=use_role.id,
        created_by=current_user.id,
    )
    db.add(user)
    db.flush()

    # Create company membership
    membership = UserCompanyMembership(
        user_id=user.id,
        company_id=company_id,
        role=user.role,
        permissions=use_role.permissions,
        group_id=use_role.id,
        is_default=True,
    )
    db.add(membership)

    # Link user to employee
    emp.user_id = user.id
    emp.updated_by = current_user.id
    db.flush()

    return temp_password
