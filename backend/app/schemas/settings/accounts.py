from __future__ import annotations
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, field_validator


VALID_ACCOUNT_TYPES = {"Asset", "Liability", "Equity", "Revenue", "Expense"}
VALID_NORMAL_BALANCES = {"Dr", "Cr"}


class AccountCreate(BaseModel):
    code: str
    name: str
    type: str
    normal_balance: str
    description: str | None = None

    @field_validator("code")
    @classmethod
    def code_format(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("Code is required")
        return v

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name is required")
        return v.strip()

    @field_validator("type")
    @classmethod
    def valid_type(cls, v: str) -> str:
        v = v.strip()
        if v not in VALID_ACCOUNT_TYPES:
            raise ValueError(f"Must be one of: {', '.join(sorted(VALID_ACCOUNT_TYPES))}")
        return v

    @field_validator("normal_balance")
    @classmethod
    def valid_balance(cls, v: str) -> str:
        v = v.strip()
        if v not in VALID_NORMAL_BALANCES:
            raise ValueError("Must be 'Dr' or 'Cr'")
        return v


class AccountUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    type: str | None = None
    normal_balance: str | None = None
    description: str | None = None

    @field_validator("code")
    @classmethod
    def code_format(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip().upper()
            if not v:
                raise ValueError("Code cannot be empty")
        return v

    @field_validator("type")
    @classmethod
    def valid_type(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if v not in VALID_ACCOUNT_TYPES:
                raise ValueError(f"Must be one of: {', '.join(sorted(VALID_ACCOUNT_TYPES))}")
        return v

    @field_validator("normal_balance")
    @classmethod
    def valid_balance(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if v not in VALID_NORMAL_BALANCES:
                raise ValueError("Must be 'Dr' or 'Cr'")
        return v


class AccountResponse(BaseModel):
    id: UUID
    company_id: UUID
    code: str
    name: str
    type: str
    normal_balance: str
    description: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
