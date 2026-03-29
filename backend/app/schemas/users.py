from pydantic import BaseModel, EmailStr


class UserCreateRequest(BaseModel):
    email: EmailStr
    full_name: str
    role: str  # "ADMIN" or "STAFF"
    password: str
    permissions: dict[str, str] = {}


class UserUpdateRequest(BaseModel):
    full_name: str | None = None
    role: str | None = None
    permissions: dict[str, str] | None = None
    is_active: bool | None = None
