"""Payroll Sprint 3 schemas — runs, items, item lines."""
from datetime import date as DateType, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


# ── PayrollRun ───────────────────────────────────────────────────────────────

class PayrollRunCreate(BaseModel):
    year: int
    month: int
    notes: Optional[str] = None


class PayrollRunResponse(BaseModel):
    id: UUID
    company_id: UUID
    year: int
    month: int
    status: str
    run_date: Optional[DateType] = None
    employee_count: int
    total_gross: Decimal
    total_net: Decimal
    total_paye: Decimal
    total_pension_ee: Decimal
    total_pension_er: Decimal
    total_deductions: Decimal
    notes: Optional[str] = None
    approved_by: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── PayrollItemLine ──────────────────────────────────────────────────────────

class PayrollItemLineResponse(BaseModel):
    id: UUID
    line_type: str
    type_code: str
    name: str
    amount: Decimal

    class Config:
        from_attributes = True


# ── PayrollItem ──────────────────────────────────────────────────────────────

class PayrollItemResponse(BaseModel):
    id: UUID
    employee_id: UUID
    employee_name: Optional[str] = None
    employee_ref: Optional[str] = None
    basic_salary: Decimal
    total_allowances: Decimal
    gross_pay: Decimal
    cra: Decimal
    taxable_income_annual: Decimal
    paye_tax: Decimal
    pension_employee: Decimal
    pension_employer: Decimal
    nhf: Decimal
    nsitf: Decimal
    other_deductions: Decimal
    total_deductions: Decimal
    net_pay: Decimal
    lines: List[PayrollItemLineResponse] = []

    class Config:
        from_attributes = True


# ── PayrollRun with Items ────────────────────────────────────────────────────

class PayrollRunDetailResponse(PayrollRunResponse):
    items: List[PayrollItemResponse] = []
