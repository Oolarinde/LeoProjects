"""Pydantic schemas for Intercompany Transactions."""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class IcTransactionCreate(BaseModel):
    source_company_id: UUID
    target_company_id: UUID
    transaction_type: str
    date: date
    amount: Decimal = Field(..., gt=0)
    description: str | None = None
    reference_no: str | None = None
    allocation_rule_id: UUID | None = None


class IcTransactionResponse(BaseModel):
    id: UUID
    company_group_id: UUID
    source_company_id: UUID
    source_company_name: str
    target_company_id: UUID
    target_company_name: str
    transaction_type: str
    date: date
    fiscal_year: int
    amount: Decimal
    description: str | None
    reference_no: str | None
    status: str
    created_at: datetime
    created_by: UUID | None
    confirmed_by: UUID | None
    confirmed_at: datetime | None
    model_config = {"from_attributes": True}


class IcVoidRequest(BaseModel):
    void_reason: str = Field(..., min_length=1)


class IcBalanceResponse(BaseModel):
    source_company_id: UUID
    source_company_name: str
    target_company_id: UUID
    target_company_name: str
    net_balance: Decimal


class IcTransactionListResponse(BaseModel):
    items: list[IcTransactionResponse]
    total: int
