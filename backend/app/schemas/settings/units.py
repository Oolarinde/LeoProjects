from __future__ import annotations
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, field_validator


class UnitCreate(BaseModel):
    name: str
    location_id: UUID
    unit_type: str | None = None
    is_active: bool = True

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name is required")
        return v.strip()


class UnitUpdate(BaseModel):
    name: str | None = None
    location_id: UUID | None = None
    unit_type: str | None = None
    is_active: bool | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str | None) -> str | None:
        if v is not None:
            if not v.strip():
                raise ValueError("Name cannot be empty")
            return v.strip()
        return v


class UnitResponse(BaseModel):
    id: UUID
    company_id: UUID
    location_id: UUID
    name: str
    unit_type: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
