from __future__ import annotations
from pydantic import BaseModel, EmailStr, field_validator


class UserCreateRequest(BaseModel):
    email: EmailStr
    full_name: str
    role: str  # "ADMIN" or "STAFF" (system hierarchy)
    password: str
    group_id: str  # UUID — the custom role to assign (required)

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Full name is required")
        return v.strip()

    @field_validator("group_id")
    @classmethod
    def group_id_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Role assignment is required")
        return v.strip()


class UserUpdateRequest(BaseModel):
    full_name: str | None = None
    role: str | None = None
    is_active: bool | None = None
    group_id: str | None = None  # UUID string — change the user's custom role

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("Full name cannot be empty")
        return v.strip() if v else v
