"""Pydantic schemas for Group Accounting — company groups, allocation rules, CoA template."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class CreateSubsidiaryRequest(BaseModel):
    """Create a new company AND add it to the group in one step."""
    name: str = Field(..., max_length=200)
    entity_prefix: str | None = Field(None, max_length=5)
    rc_number: str | None = Field(None, max_length=20)
    ownership_pct: Decimal = Field(default=Decimal("100.00"), gt=0, le=100)


class UpdateCompanyRequest(BaseModel):
    """Rename / edit a company."""
    name: str | None = Field(None, max_length=200)
    entity_prefix: str | None = None
    rc_number: str | None = None
    tin: str | None = None
    vat_number: str | None = None
    entity_type: str | None = None


class CompanyGroupCreate(BaseModel):
    name: str = Field(..., max_length=200)
    description: str | None = None
    fiscal_year_end: int = Field(default=12, ge=1, le=12)


class CompanyGroupResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    fiscal_year_end: int
    base_currency: str
    created_at: datetime
    model_config = {"from_attributes": True}


class CompanyGroupUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    fiscal_year_end: int | None = None


class AddCompanyToGroupRequest(BaseModel):
    company_id: UUID
    is_parent: bool = False
    ownership_pct: Decimal = Field(default=Decimal("100.00"), gt=0, le=100)
    entity_prefix: str | None = Field(None, max_length=5)


class CompanyGroupMemberResponse(BaseModel):
    id: UUID
    company_id: UUID
    company_name: str
    entity_prefix: str | None
    is_parent: bool
    ownership_pct: Decimal
    joined_at: datetime
    model_config = {"from_attributes": True}


class AddUserToCompanyRequest(BaseModel):
    user_id: UUID
    company_id: UUID
    role: str = "STAFF"


class CoaMismatchResponse(BaseModel):
    matching: int
    missing: list[dict]  # accounts in template but not in company
    conflicts: list[dict]  # same code, different name/type


class AllocationRuleCreate(BaseModel):
    name: str = Field(..., max_length=100)
    description: str | None = None
    allocation_type: str = "PERCENTAGE"
    lines: list["AllocationRuleLineCreate"]


class AllocationRuleLineCreate(BaseModel):
    company_id: UUID
    percentage: Decimal = Field(..., ge=0, le=100)


class AllocationRuleResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    allocation_type: str
    is_active: bool
    lines: list["AllocationRuleLineResponse"]
    model_config = {"from_attributes": True}


class AllocationRuleLineResponse(BaseModel):
    id: UUID
    company_id: UUID
    company_name: str
    percentage: Decimal
    model_config = {"from_attributes": True}


class CoaTemplateEntryCreate(BaseModel):
    code: str = Field(..., max_length=10)
    name: str = Field(..., max_length=100)
    type: str  # Asset, Liability, Equity, Revenue, Expense
    normal_balance: str  # Dr, Cr
    description: str | None = None
    is_intercompany: bool = False
    cost_centre: str | None = None


class CoaTemplateEntryResponse(BaseModel):
    id: UUID
    code: str
    name: str
    type: str
    normal_balance: str
    description: str | None
    is_intercompany: bool
    cost_centre: str | None
    model_config = {"from_attributes": True}


class UserMembershipUpdate(BaseModel):
    company_id: UUID
    role: str = "COMPANY_ADMIN"  # GROUP_ADMIN, COMPANY_ADMIN, VIEWER
    is_default: bool = False


class UpdateUserAccessRequest(BaseModel):
    memberships: list[UserMembershipUpdate]


class GroupDashboardResponse(BaseModel):
    group_revenue: Decimal
    group_expenses: Decimal
    group_net_profit: Decimal
    ic_balance: Decimal
    subsidiaries: list[dict]
    pending_ic_count: int
    pending_ic_total: Decimal
