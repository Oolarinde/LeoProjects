from __future__ import annotations
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, field_validator


class ReferenceDataCreate(BaseModel):
    category: str
    value: str

    @field_validator("category")
    @classmethod
    def category_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Category is required")
        return v.strip()

    @field_validator("value")
    @classmethod
    def value_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Value is required")
        return v.strip()


class ReferenceDataUpdate(BaseModel):
    category: str | None = None
    value: str | None = None

    @field_validator("category")
    @classmethod
    def category_not_empty(cls, v: str | None) -> str | None:
        if v is not None:
            if not v.strip():
                raise ValueError("Category cannot be empty")
            return v.strip()
        return v

    @field_validator("value")
    @classmethod
    def value_not_empty(cls, v: str | None) -> str | None:
        if v is not None:
            if not v.strip():
                raise ValueError("Value cannot be empty")
            return v.strip()
        return v


class ReferenceDataResponse(BaseModel):
    id: UUID
    company_id: UUID
    category: str
    value: str
    created_at: datetime | None

    model_config = {"from_attributes": True}
