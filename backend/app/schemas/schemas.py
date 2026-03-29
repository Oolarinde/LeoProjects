from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator


# --- Auth ---

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    company_name: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    company_id: UUID
    is_active: bool
    permissions: dict[str, str] = {}
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Company ---

class CompanyResponse(BaseModel):
    id: UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Location ---

class LocationResponse(BaseModel):
    id: UUID
    company_id: UUID
    name: str
    address: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Unit ---

class UnitResponse(BaseModel):
    id: UUID
    location_id: UUID
    name: str
    unit_type: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Account ---

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


# --- Employee ---

class EmployeeResponse(BaseModel):
    id: UUID
    company_id: UUID
    employee_ref: str
    name: str
    designation: str | None
    gender: str | None
    phone: str | None
    email: str | None
    monthly_salary: float | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Reference Data ---

class ReferenceDataResponse(BaseModel):
    id: UUID
    company_id: UUID
    category: str
    value: str

    model_config = {"from_attributes": True}


class DropdownsResponse(BaseModel):
    locations: list[LocationResponse]
    payment_methods: list[str]
    expense_categories: list[str]
    departments: list[str]
    revenue_accounts: list[str]
