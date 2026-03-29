from pydantic import BaseModel, EmailStr, field_validator


class UserCreateRequest(BaseModel):
    email: EmailStr
    full_name: str
    role: str  # "ADMIN" or "STAFF"
    password: str
    permissions: dict[str, str] = {}

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


class UserUpdateRequest(BaseModel):
    full_name: str | None = None
    role: str | None = None
    permissions: dict[str, str] | None = None
    is_active: bool | None = None

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("Full name cannot be empty")
        return v.strip() if v else v
