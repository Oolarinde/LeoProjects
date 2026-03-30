from __future__ import annotations
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, field_validator


class PayrollSettingsUpdate(BaseModel):
    pay_period: str | None = None
    pension_employee_pct: float | None = None
    pension_employer_pct: float | None = None
    nhf_pct: float | None = None
    nsitf_employee_pct: float | None = None
    tax_method: str | None = None
    enable_13th_month: bool | None = None
    fiscal_year_start_month: int | None = None

    @field_validator("pension_employee_pct", "pension_employer_pct", "nhf_pct", "nsitf_employee_pct")
    @classmethod
    def pct_range(cls, v: float | None) -> float | None:
        if v is not None and (v < 0 or v > 100):
            raise ValueError("Percentage must be between 0 and 100")
        return v

    @field_validator("fiscal_year_start_month")
    @classmethod
    def valid_month(cls, v: int | None) -> int | None:
        if v is not None and (v < 1 or v > 12):
            raise ValueError("Month must be between 1 and 12")
        return v


class PayrollSettingsResponse(BaseModel):
    id: UUID
    company_id: UUID
    pay_period: str
    pension_employee_pct: float
    pension_employer_pct: float
    nhf_pct: float
    nsitf_employee_pct: float
    tax_method: str
    enable_13th_month: bool
    fiscal_year_start_month: int
    created_at: datetime
    updated_at: datetime | None

    model_config = {"from_attributes": True}
