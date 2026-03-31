"""Pydantic schemas for Revenue Transactions."""
from __future__ import annotations

from datetime import date as DateType, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


VALID_PAYMENT_METHODS = {"Cash", "Bank Transfer", "POS", "Mobile Transfer", "Cheque"}


class RevenueCreate(BaseModel):
    location_id: UUID
    unit_id: Optional[UUID] = None
    account_id: UUID
    date: DateType
    amount: Decimal = Field(gt=0)
    payment_method: str | None = None
    reference_no: str | None = None
    description: str | None = None
    tenant_name: str | None = None

    @field_validator("payment_method")
    @classmethod
    def valid_payment_method(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if v and v not in VALID_PAYMENT_METHODS:
                raise ValueError(f"Must be one of: {', '.join(sorted(VALID_PAYMENT_METHODS))}")
        return v or None


class RevenueUpdate(BaseModel):
    location_id: Optional[UUID] = None
    unit_id: Optional[UUID] = None
    account_id: Optional[UUID] = None
    date: Optional[DateType] = None
    amount: Optional[Decimal] = Field(default=None, gt=0)
    payment_method: str | None = None
    reference_no: str | None = None
    description: str | None = None
    tenant_name: str | None = None

    @field_validator("payment_method")
    @classmethod
    def valid_payment_method(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if v and v not in VALID_PAYMENT_METHODS:
                raise ValueError(f"Must be one of: {', '.join(sorted(VALID_PAYMENT_METHODS))}")
        return v


class RevenueResponse(BaseModel):
    id: UUID
    company_id: UUID
    location_id: UUID
    unit_id: Optional[UUID] = None
    account_id: UUID
    date: DateType
    fiscal_year: int
    amount: Decimal
    payment_method: Optional[str] = None
    reference_no: Optional[str] = None
    description: Optional[str] = None
    tenant_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None
    is_voided: bool = False
    void_reason: Optional[str] = None
    voided_by: Optional[UUID] = None
    voided_at: Optional[datetime] = None
    is_deposit: bool = False

    model_config = {"from_attributes": True}
