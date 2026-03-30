from __future__ import annotations
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, field_validator


class GroupCreateRequest(BaseModel):
    name: str
    description: str | None = None
    permissions: dict[str, str] = {}

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Group name is required")
        return v.strip()


class GroupUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    permissions: dict[str, str] | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("Group name cannot be empty")
        return v.strip() if v else v


class GroupMemberRequest(BaseModel):
    user_ids: list[UUID]


class GroupResponse(BaseModel):
    id: UUID
    company_id: UUID
    name: str
    description: str | None
    permissions: dict[str, str] = {}
    member_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class GroupDetailResponse(GroupResponse):
    members: list["GroupMemberInfo"] = []


class GroupMemberInfo(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    is_active: bool

    model_config = {"from_attributes": True}
