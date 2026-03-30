from __future__ import annotations
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, field_validator


class EmployeeCreate(BaseModel):
    employee_ref: str
    name: str
    designation: str | None = None
    gender: str | None = None
    phone: str | None = None
    email: str | None = None
    monthly_salary: Decimal | None = None
    status: str = "Active"

    @field_validator("employee_ref")
    @classmethod
    def ref_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Employee ref is required")
        return v.strip()

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
    designation: str | None
    gender: str | None
    phone: str | None
    email: str | None
    monthly_salary: Decimal | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
