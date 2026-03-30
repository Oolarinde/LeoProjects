from __future__ import annotations
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, field_validator


class LocationCreate(BaseModel):
    name: str
    address: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name is required")
        return v.strip()


class LocationUpdate(BaseModel):
    name: str | None = None
    address: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str | None) -> str | None:
        if v is not None:
            if not v.strip():
                raise ValueError("Name cannot be empty")
            return v.strip()
        return v


class LocationResponse(BaseModel):
    id: UUID
    company_id: UUID
    name: str
    address: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
