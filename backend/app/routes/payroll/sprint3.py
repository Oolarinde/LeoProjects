"""Payroll Sprint 3 routes — payroll runs (create, calculate, approve, cancel)."""
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload

from database import get_db
from app.models.user import User
from app.models.payroll.payroll_run import PayrollRun
from app.models.payroll.payroll_item import PayrollItem
from app.models.payroll.payroll_item_line import PayrollItemLine
from app.schemas.payroll.sprint3 import (
    PayrollRunCreate,
    PayrollRunResponse,
    PayrollRunDetailResponse,
    PayrollItemResponse,
    PayrollItemLineResponse,
)
from app.services.payroll.engine import calculate_payroll
from app.services.payroll.gl_posting import post_payroll_to_gl
from app.services.company_groups import get_group_company_ids_for_user
from app.utils.dependencies import get_current_user, require_permission
from app.utils.permissions import Module, AccessLevel

_payroll_write = Depends(require_permission(Module.PAYROLL, AccessLevel.WRITE))

router = APIRouter()


def _item_to_response(item: PayrollItem) -> PayrollItemResponse:
    """Convert PayrollItem ORM → response with employee name."""
    emp = item.employee
    # Resolve company name for group payroll display
    company_name = None
    if hasattr(item, "company") and item.company:
        company_name = item.company.name
    return PayrollItemResponse(
        id=item.id,
        employee_id=item.employee_id,
        company_id=item.company_id,
        company_name=company_name,
        employee_name=emp.name if emp else None,
        employee_ref=emp.employee_ref if emp else None,
        basic_salary=item.basic_salary,
        total_allowances=item.total_allowances,
        gross_pay=item.gross_pay,
        cra=item.cra,
        taxable_income_annual=item.taxable_income_annual,
        paye_tax=item.paye_tax,
        pension_employee=item.pension_employee,
        pension_employer=item.pension_employer,
        nhf=item.nhf,
        nsitf=item.nsitf,
        other_deductions=item.other_deductions,
        total_deductions=item.total_deductions,
        net_pay=item.net_pay,
        lines=[
            PayrollItemLineResponse(
                id=line.id,
                line_type=line.line_type,
                type_code=line.type_code,
                name=line.name,
                amount=line.amount,
            )
            for line in (item.lines or [])
        ],
    )


# ── List Runs ────────────────────────────────────────────────────────────────

@router.get("/runs", response_model=list[PayrollRunResponse])
def list_runs(
    year: int = Query(None),
    month: int = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = select(PayrollRun).where(PayrollRun.company_id == current_user.company_id)
    if year:
        q = q.where(PayrollRun.year == year)
    if month:
        q = q.where(PayrollRun.month == month)
    q = q.order_by(PayrollRun.year.desc(), PayrollRun.month.desc())
    result = db.execute(q)
    return list(result.scalars().all())


# ── Get Run Detail ───────────────────────────────────────────────────────────

@router.get("/runs/{run_id}", response_model=PayrollRunDetailResponse)
def get_run(
    run_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = db.execute(
        select(PayrollRun)
        .where(PayrollRun.id == run_id, PayrollRun.company_id == current_user.company_id)
        .options(
            selectinload(PayrollRun.items)
            .selectinload(PayrollItem.employee),
            selectinload(PayrollRun.items)
            .selectinload(PayrollItem.company),
            selectinload(PayrollRun.items)
            .selectinload(PayrollItem.lines),
        )
    )
    run = result.scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=404, detail="Payroll run not found")

    return PayrollRunDetailResponse(
        **{c.key: getattr(run, c.key) for c in PayrollRun.__table__.columns},
        items=[_item_to_response(item) for item in run.items],
    )


# ── Create Run (DRAFT) ──────────────────────────────────────────────────────

@router.post("/runs", response_model=PayrollRunResponse, status_code=201)
def create_run(
    body: PayrollRunCreate,
    current_user: User = _payroll_write,
    db: Session = Depends(get_db),
):
    # Check for existing run for this period
    existing = db.execute(
        select(PayrollRun).where(
            PayrollRun.company_id == current_user.company_id,
            PayrollRun.year == body.year,
            PayrollRun.month == body.month,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail=f"A payroll run for {body.year}/{body.month:02d} already exists",
        )

    run = PayrollRun(
        company_id=current_user.company_id,
        year=body.year,
        month=body.month,
        notes=body.notes,
        status="DRAFT",
        created_by=current_user.id,
    )
    db.add(run)
    db.flush()
    db.commit()
    db.refresh(run)
    return run


# ── Calculate ────────────────────────────────────────────────────────────────

@router.post("/runs/{run_id}/calculate", response_model=PayrollRunDetailResponse)
def calculate_run(
    run_id: UUID,
    current_user: User = _payroll_write,
    db: Session = Depends(get_db),
):
    result = db.execute(
        select(PayrollRun).where(
            PayrollRun.id == run_id,
            PayrollRun.company_id == current_user.company_id,
        )
    )
    run = result.scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=404, detail="Payroll run not found")

    if run.status not in ("DRAFT", "CALCULATED"):
        raise HTTPException(status_code=400, detail=f"Cannot calculate a run in '{run.status}' status")

    # Group payroll: load employees from all group companies
    employee_company_ids = None
    if current_user.role in ("SUPER_ADMIN", "GROUP_ADMIN"):
        employee_company_ids = get_group_company_ids_for_user(db, current_user)

    try:
        run = calculate_payroll(db, current_user.company_id, run, employee_company_ids)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    db.commit()

    # Re-fetch with items loaded
    return get_run(run_id, current_user, db)


# ── Approve ──────────────────────────────────────────────────────────────────

@router.post("/runs/{run_id}/approve", response_model=PayrollRunResponse)
def approve_run(
    run_id: UUID,
    current_user: User = _payroll_write,
    db: Session = Depends(get_db),
):
    result = db.execute(
        select(PayrollRun).where(
            PayrollRun.id == run_id,
            PayrollRun.company_id == current_user.company_id,
        )
    )
    run = result.scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=404, detail="Payroll run not found")

    if run.status != "CALCULATED":
        raise HTTPException(status_code=400, detail="Only CALCULATED runs can be approved")

    run.status = "APPROVED"
    run.approved_by = current_user.id
    run.approved_at = datetime.utcnow()

    # Auto-post payroll journal to GL (LEDGER P1)
    post_payroll_to_gl(db, current_user.company_id, run, current_user.id)

    db.commit()
    db.refresh(run)
    return run


# ── Cancel ───────────────────────────────────────────────────────────────────

@router.post("/runs/{run_id}/cancel", response_model=PayrollRunResponse)
def cancel_run(
    run_id: UUID,
    current_user: User = _payroll_write,
    db: Session = Depends(get_db),
):
    result = db.execute(
        select(PayrollRun).where(
            PayrollRun.id == run_id,
            PayrollRun.company_id == current_user.company_id,
        )
    )
    run = result.scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=404, detail="Payroll run not found")

    if run.status == "PAID":
        raise HTTPException(status_code=400, detail="Cannot cancel a PAID run")

    run.status = "CANCELLED"
    db.commit()
    db.refresh(run)
    return run


# ── Delete (DRAFT only) ─────────────────────────────────────────────────────

@router.delete("/runs/{run_id}", status_code=204)
def delete_run(
    run_id: UUID,
    current_user: User = _payroll_write,
    db: Session = Depends(get_db),
):
    result = db.execute(
        select(PayrollRun).where(
            PayrollRun.id == run_id,
            PayrollRun.company_id == current_user.company_id,
        )
    )
    run = result.scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=404, detail="Payroll run not found")

    if run.status not in ("DRAFT", "CANCELLED"):
        raise HTTPException(status_code=400, detail="Only DRAFT or CANCELLED runs can be deleted")

    db.delete(run)
    db.commit()


# ── Export (placeholder — returns JSON summary for client-side export) ──────

@router.get("/export")
def export_payroll(
    year: int = Query(...),
    month: int = Query(None),
    format: str = Query("xlsx"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return payroll data for client-side export. Full server-side XLSX/PDF export to be added later."""
    q = select(PayrollRun).where(PayrollRun.company_id == current_user.company_id, PayrollRun.year == year)
    if month:
        q = q.where(PayrollRun.month == month)
    q = q.options(
        selectinload(PayrollRun.items).selectinload(PayrollItem.employee),
        selectinload(PayrollRun.items).selectinload(PayrollItem.company),
        selectinload(PayrollRun.items).selectinload(PayrollItem.lines),
    ).order_by(PayrollRun.month)
    result = db.execute(q)
    runs = result.scalars().all()

    export_data = []
    for run in runs:
        run_data = {
            "month": run.month,
            "year": run.year,
            "status": run.status,
            "employee_count": run.employee_count,
            "total_gross": str(run.total_gross),
            "total_net": str(run.total_net),
            "total_deductions": str(run.total_deductions),
            "items": [
                {
                    "employee_name": item.employee.name if item.employee else None,
                    "employee_ref": item.employee.employee_ref if item.employee else None,
                    "company_name": item.company.name if item.company else None,
                    "gross_pay": str(item.gross_pay),
                    "paye_tax": str(item.paye_tax),
                    "pension_employee": str(item.pension_employee),
                    "pension_employer": str(item.pension_employer),
                    "nhf": str(item.nhf),
                    "total_deductions": str(item.total_deductions),
                    "net_pay": str(item.net_pay),
                }
                for item in (run.items or [])
            ],
        }
        export_data.append(run_data)

    return {"year": year, "month": month, "format": format, "runs": export_data}
