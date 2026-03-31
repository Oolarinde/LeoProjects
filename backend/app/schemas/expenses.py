"""Pydantic schemas for Expense Transactions."""
from __future__ import annotations


from datetime import date as DateType, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


VALID_PAYMENT_METHODS = {"Cash", "Bank Transfer", "POS", "Mobile Transfer", "Cheque"}

VALID_CATEGORIES = {
    "Salaries", "Construction", "Maintenance", "Utilities", "Inventory",
    "Administrative", "Loans & Advances", "Transportation",
    "IT & Communications", "Other",
}


class ExpenseCreate(BaseModel):
    location_id: UUID | None = None
    account_id: UUID
    category: str
    date: DateType
    amount: Decimal = Field(gt=0)
    payment_method: Optional[str] = None
    reference_no: Optional[str] = None
    description: Optional[str] = None
    vendor_name: Optional[str] = None

    @field_validator("category")
    @classmethod
    def valid_category(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Category is required")
        if v not in VALID_CATEGORIES:
            raise ValueError(f"Must be one of: {', '.join(sorted(VALID_CATEGORIES))}")
        return v

    @field_validator("payment_method")
    @classmethod
    def valid_payment_method(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if v and v not in VALID_PAYMENT_METHODS:
                raise ValueError(f"Must be one of: {', '.join(sorted(VALID_PAYMENT_METHODS))}")
        return v or None


class ExpenseUpdate(BaseModel):
    location_id: Optional[UUID] = None
    account_id: Optional[UUID] = None
    category: Optional[str] = None
    date: Optional[DateType] = None
    amount: Optional[Decimal] = Field(default=None, gt=0)
    payment_method: Optional[str] = None
    reference_no: Optional[str] = None
    description: Optional[str] = None
    vendor_name: Optional[str] = None

    @field_validator("category")
    @classmethod
    def valid_category(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if v and v not in VALID_CATEGORIES:
                raise ValueError(f"Must be one of: {', '.join(sorted(VALID_CATEGORIES))}")
        return v

    @field_validator("payment_method")
    @classmethod
    def valid_payment_method(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if v and v not in VALID_PAYMENT_METHODS:
                raise ValueError(f"Must be one of: {', '.join(sorted(VALID_PAYMENT_METHODS))}")
        return v


class ExpenseResponse(BaseModel):
    id: UUID
    company_id: UUID
    location_id: Optional[UUID] = None
    account_id: UUID
    category: str
    date: DateType
    fiscal_year: int
    amount: Decimal
    payment_method: Optional[str] = None
    reference_no: Optional[str] = None
    description: Optional[str] = None
    vendor_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[UUID] = None
    updated_by: UUID | None
    is_voided: bool = False
    void_reason: Optional[str] = None
    voided_by: Optional[UUID] = None
    voided_at: Optional[datetime] = None
    wht_rate: Optional[Decimal] = None
    wht_amount: Optional[Decimal] = None

    model_config = {"from_attributes": True}
