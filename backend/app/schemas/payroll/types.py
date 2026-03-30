from __future__ import annotations
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, field_validator


# ── Allowance Types ──────────────────────────────────────────────


class AllowanceTypeCreate(BaseModel):
    name: str
    code: str
    is_taxable: bool = True
    description: str | None = None
    sort_order: int = 0

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name is required")
        return v.strip()

    @field_validator("code")
    @classmethod
    def code_format(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("Code is required")
        if len(v) > 20:
            raise ValueError("Code must be 20 characters or less")
        return v


class AllowanceTypeUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    is_taxable: bool | None = None
    is_active: bool | None = None
    description: str | None = None
    sort_order: int | None = None

    @field_validator("code")
    @classmethod
    def code_format(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip().upper()
            if not v:
                raise ValueError("Code cannot be empty")
        return v


class AllowanceTypeResponse(BaseModel):
    id: UUID
    company_id: UUID
    name: str
    code: str
    is_taxable: bool
    is_active: bool
    description: str | None
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Deduction Types ──────────────────────────────────────────────

VALID_CALC_METHODS = {"FIXED", "PERCENTAGE_GROSS", "PERCENTAGE_BASIC", "TAX_TABLE", "MANUAL"}


class DeductionTypeCreate(BaseModel):
    name: str
    code: str
    is_statutory: bool = False
    calculation_method: str = "FIXED"
    default_value: float | None = None
    description: str | None = None
    sort_order: int = 0

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name is required")
        return v.strip()

    @field_validator("code")
    @classmethod
    def code_format(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("Code is required")
        return v

    @field_validator("calculation_method")
    @classmethod
    def valid_method(cls, v: str) -> str:
        v = v.strip().upper()
        if v not in VALID_CALC_METHODS:
            raise ValueError(f"Must be one of: {', '.join(sorted(VALID_CALC_METHODS))}")
        return v


class DeductionTypeUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    is_statutory: bool | None = None
    calculation_method: str | None = None
    default_value: float | None = None
    is_active: bool | None = None
    description: str | None = None
    sort_order: int | None = None

    @field_validator("calculation_method")
    @classmethod
    def valid_method(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip().upper()
            if v not in VALID_CALC_METHODS:
                raise ValueError(f"Must be one of: {', '.join(sorted(VALID_CALC_METHODS))}")
        return v


class DeductionTypeResponse(BaseModel):
    id: UUID
    company_id: UUID
    name: str
    code: str
    is_statutory: bool
    calculation_method: str
    default_value: float | None
    is_active: bool
    description: str | None
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Tax Brackets ─────────────────────────────────────────────────


class TaxBracketCreate(BaseModel):
    lower_bound: float
    upper_bound: float | None = None
    rate_pct: float
    sort_order: int = 0

    @field_validator("rate_pct")
    @classmethod
    def rate_range(cls, v: float) -> float:
        if v < 0 or v > 100:
            raise ValueError("Rate must be between 0 and 100")
        return v

    @field_validator("lower_bound")
    @classmethod
    def bound_positive(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Lower bound cannot be negative")
        return v


class TaxBracketResponse(BaseModel):
    id: UUID
    company_id: UUID
    lower_bound: float
    upper_bound: float | None
    rate_pct: float
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class TaxBracketsReplace(BaseModel):
    """Replace all tax brackets for a company at once."""
    brackets: list[TaxBracketCreate]

    @field_validator("brackets")
    @classmethod
    def at_least_one(cls, v: list[TaxBracketCreate]) -> list[TaxBracketCreate]:
        if not v:
            raise ValueError("At least one tax bracket is required")
        return v


# ── Leave Policies ───────────────────────────────────────────────

VALID_LEAVE_TYPES = {"ANNUAL", "SICK", "CASUAL", "MATERNITY", "PATERNITY", "UNPAID", "COMPASSIONATE"}


class LeavePolicyCreate(BaseModel):
    leave_type: str
    days_per_year: int
    is_paid: bool = True
    carry_over_allowed: bool = False
    max_carry_over_days: int | None = None
    requires_approval: bool = True

    @field_validator("leave_type")
    @classmethod
    def valid_type(cls, v: str) -> str:
        v = v.strip().upper()
        if v not in VALID_LEAVE_TYPES:
            raise ValueError(f"Must be one of: {', '.join(sorted(VALID_LEAVE_TYPES))}")
        return v

    @field_validator("days_per_year")
    @classmethod
    def positive_days(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Days per year cannot be negative")
        return v


class LeavePolicyUpdate(BaseModel):
    days_per_year: int | None = None
    is_paid: bool | None = None
    carry_over_allowed: bool | None = None
    max_carry_over_days: int | None = None
    requires_approval: bool | None = None
    is_active: bool | None = None

    @field_validator("days_per_year")
    @classmethod
    def positive_days(cls, v: int | None) -> int | None:
        if v is not None and v < 0:
            raise ValueError("Days per year cannot be negative")
        return v


class LeavePolicyResponse(BaseModel):
    id: UUID
    company_id: UUID
    leave_type: str
    days_per_year: int
    is_paid: bool
    carry_over_allowed: bool
    max_carry_over_days: int | None
    requires_approval: bool
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
