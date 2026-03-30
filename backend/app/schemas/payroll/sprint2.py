"""Pydantic schemas for Payroll Sprint 2 — employee profiles, allowances, deductions, leave."""

from datetime import date as DateType, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# ── Employee Payroll Profile ────────────────────────────────────────────────

class PayrollProfileCreate(BaseModel):
    employee_id: UUID
    basic_salary: Decimal = Field(ge=0)
    pay_grade: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_sort_code: Optional[str] = None
    tax_id: Optional[str] = None
    pension_id: Optional[str] = None
    effective_date: DateType
    is_active: bool = True


class PayrollProfileUpdate(BaseModel):
    basic_salary: Optional[Decimal] = Field(default=None, ge=0)
    pay_grade: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_sort_code: Optional[str] = None
    tax_id: Optional[str] = None
    pension_id: Optional[str] = None
    effective_date: Optional[DateType] = None
    is_active: Optional[bool] = None


class PayrollProfileResponse(BaseModel):
    id: UUID
    company_id: UUID
    employee_id: UUID
    basic_salary: Decimal
    pay_grade: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_sort_code: Optional[str] = None
    tax_id: Optional[str] = None
    pension_id: Optional[str] = None
    effective_date: DateType
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Employee Allowance ──────────────────────────────────────────────────────

class EmployeeAllowanceCreate(BaseModel):
    employee_id: UUID
    allowance_type_id: UUID
    amount: Decimal = Field(ge=0)
    is_active: bool = True


class EmployeeAllowanceUpdate(BaseModel):
    amount: Optional[Decimal] = Field(default=None, ge=0)
    is_active: Optional[bool] = None


class EmployeeAllowanceResponse(BaseModel):
    id: UUID
    company_id: UUID
    employee_id: UUID
    allowance_type_id: UUID
    amount: Decimal
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Employee Deduction ──────────────────────────────────────────────────────

class EmployeeDeductionCreate(BaseModel):
    employee_id: UUID
    deduction_type_id: UUID
    override_value: Optional[Decimal] = Field(default=None, ge=0)
    is_active: bool = True


class EmployeeDeductionUpdate(BaseModel):
    override_value: Optional[Decimal] = Field(default=None, ge=0)
    is_active: Optional[bool] = None


class EmployeeDeductionResponse(BaseModel):
    id: UUID
    company_id: UUID
    employee_id: UUID
    deduction_type_id: UUID
    override_value: Optional[Decimal] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Employee Leave Balance ──────────────────────────────────────────────────

class LeaveBalanceResponse(BaseModel):
    id: UUID
    company_id: UUID
    employee_id: UUID
    leave_policy_id: UUID
    year: int
    entitled_days: Decimal
    used_days: Decimal
    carried_over_days: Decimal
    remaining_days: Decimal = Decimal(0)

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_remaining(cls, obj) -> "LeaveBalanceResponse":
        remaining = obj.entitled_days + obj.carried_over_days - obj.used_days
        return cls(
            id=obj.id,
            company_id=obj.company_id,
            employee_id=obj.employee_id,
            leave_policy_id=obj.leave_policy_id,
            year=obj.year,
            entitled_days=obj.entitled_days,
            used_days=obj.used_days,
            carried_over_days=obj.carried_over_days,
            remaining_days=max(remaining, Decimal(0)),
        )


# ── Leave Request ───────────────────────────────────────────────────────────

VALID_STATUSES = {"PENDING", "APPROVED", "REJECTED", "CANCELLED"}


class LeaveRequestCreate(BaseModel):
    employee_id: UUID
    leave_policy_id: UUID
    start_date: DateType
    end_date: DateType
    days_requested: Decimal = Field(gt=0)
    reason: Optional[str] = None

    @field_validator("end_date")
    @classmethod
    def end_after_start(cls, v: DateType, info) -> DateType:
        start = info.data.get("start_date")
        if start and v < start:
            raise ValueError("end_date must be on or after start_date")
        return v


class LeaveRequestUpdate(BaseModel):
    reason: Optional[str] = None
    status: Optional[str] = None
    rejection_reason: Optional[str] = None

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(sorted(VALID_STATUSES))}")
        return v


class LeaveRequestResponse(BaseModel):
    id: UUID
    company_id: UUID
    employee_id: UUID
    leave_policy_id: UUID
    start_date: DateType
    end_date: DateType
    days_requested: Decimal
    reason: Optional[str] = None
    status: str
    approved_by: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
