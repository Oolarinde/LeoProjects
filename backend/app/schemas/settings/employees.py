from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, field_validator


class EmployeeCreate(BaseModel):
    employee_ref: str | None = None  # Auto-generated if not provided
    name: str
    designation: str | None = None
    gender: str | None = None
    phone: str | None = None
    email: str | None = None
    monthly_salary: Decimal | None = None
    status: str = "Active"
    department: str | None = None
    hire_date: str | None = None
    date_of_birth: str | None = None
    address: str | None = None
    # GROUP_ADMIN can specify target subsidiary
    target_company_id: UUID | None = None

    @field_validator("employee_ref")
    @classmethod
    def ref_not_empty(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("Employee ref cannot be empty")
        return v.strip() if v else v

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name is required")
        return v.strip()

    @field_validator("monthly_salary")
    @classmethod
    def salary_positive(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v < 0:
            raise ValueError("Monthly salary cannot be negative")
        return v


class EmployeeUpdate(BaseModel):
    employee_ref: str | None = None
    name: str | None = None
    designation: str | None = None
    gender: str | None = None
    phone: str | None = None
    email: str | None = None
    monthly_salary: Decimal | None = None
    status: str | None = None
    department: str | None = None
    hire_date: str | None = None
    date_of_birth: str | None = None
    address: str | None = None

    @field_validator("employee_ref")
    @classmethod
    def ref_not_empty(cls, v: str | None) -> str | None:
        if v is not None:
            if not v.strip():
                raise ValueError("Employee ref cannot be empty")
            return v.strip()
        return v

    @field_validator("monthly_salary")
    @classmethod
    def salary_positive(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v < 0:
            raise ValueError("Monthly salary cannot be negative")
        return v


class EmployeeResponse(BaseModel):
    id: UUID
    company_id: UUID
    employee_ref: str
    name: str
    designation: str | None = None
    gender: str | None = None
    phone: str | None = None
    email: str | None = None
    monthly_salary: Decimal | None = None
    status: str
    department: str | None = None
    hire_date: date | None = None
    date_of_birth: date | None = None
    address: str | None = None
    photo_url: str | None = None
    supervisor_id: UUID | None = None
    user_id: UUID | None = None
    bank_name: str | None = None
    bank_account_no: str | None = None
    next_of_kin_name: str | None = None
    next_of_kin_phone: str | None = None
    next_of_kin_relationship: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
