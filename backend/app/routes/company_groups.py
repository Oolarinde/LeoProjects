"""Routes for Company Group administration."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.models.user import User
from app.schemas.company_groups import (
    AddCompanyToGroupRequest,
    AddUserToCompanyRequest,
    AllocationRuleCreate,
    CoaMismatchResponse,
    CoaTemplateEntryCreate,
    CoaTemplateEntryResponse,
    CompanyGroupCreate,
    CompanyGroupMemberResponse,
    CompanyGroupResponse,
    CompanyGroupUpdate,
    CreateSubsidiaryRequest,
    GroupDashboardResponse,
    UpdateCompanyRequest,
    UpdateUserAccessRequest,
)
from app.services import company_groups as group_service
from app.utils.dependencies import get_current_user, require_role
from app.utils.permissions import SUPER_ADMIN, ADMIN

router = APIRouter()

_admin = require_role(SUPER_ADMIN, ADMIN)


# ── Group CRUD ────────────────────────────────────────────────────────────────

@router.post("/", response_model=CompanyGroupResponse, status_code=201)
async def create_group(
    data: CompanyGroupCreate,
    current_user: User = Depends(_admin),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.create_group(
        db, data.name, data.description, data.fiscal_year_end, current_user,
    )
    await db.commit()
    await db.refresh(group)
    return group


@router.get("/mine", response_model=CompanyGroupResponse)
async def get_my_group(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.get_user_group(db, current_user)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company group found")
    return group


@router.patch("/mine", response_model=CompanyGroupResponse)
async def update_my_group(
    data: CompanyGroupUpdate,
    current_user: User = Depends(_admin),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.get_user_group(db, current_user)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company group found")
    updated = await group_service.update_group(
        db, group.id, data.model_dump(exclude_unset=True), current_user,
    )
    await db.commit()
    await db.refresh(updated)
    return updated


# ── Company membership ────────────────────────────────────────────────────────

@router.get("/companies")
async def list_companies(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.get_user_group(db, current_user)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company group found")
    return await group_service.list_group_companies(db, group.id)


@router.post("/companies", status_code=201)
async def add_company(
    data: AddCompanyToGroupRequest,
    current_user: User = Depends(_admin),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.get_user_group(db, current_user)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company group found")
    member = await group_service.add_company_to_group(
        db, group.id, data.company_id, data.is_parent,
        data.ownership_pct, data.entity_prefix, current_user,
    )
    await db.commit()
    return {"id": str(member.id), "company_id": str(member.company_id), "status": "added"}


@router.post("/companies/create", status_code=201)
async def create_subsidiary(
    data: CreateSubsidiaryRequest,
    current_user: User = Depends(_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a brand-new company and add it to the user's group as a subsidiary."""
    group = await group_service.get_user_group(db, current_user)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company group found")
    company, member = await group_service.create_subsidiary(
        db, group.id, data.name, data.entity_prefix, data.rc_number,
        data.ownership_pct, current_user,
    )
    await db.commit()
    return {
        "id": str(member.id),
        "company_id": str(company.id),
        "company_name": company.name,
        "status": "created",
    }


@router.patch("/companies/{company_id}")
async def update_company(
    company_id: UUID,
    data: UpdateCompanyRequest,
    current_user: User = Depends(_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a company's details (name, prefix, RC number, etc.)."""
    group = await group_service.get_user_group(db, current_user)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company group found")
    company = await group_service.update_company(
        db, group.id, company_id, data.model_dump(exclude_unset=True), current_user,
    )
    await db.commit()
    await db.refresh(company)
    return {
        "id": str(company.id),
        "name": company.name,
        "entity_prefix": company.entity_prefix,
        "rc_number": company.rc_number,
    }


@router.patch("/companies/{company_id}/set-parent")
async def set_parent_company(
    company_id: UUID,
    current_user: User = Depends(_admin),
    db: AsyncSession = Depends(get_db),
):
    """Designate a company as the holding/parent company of the group."""
    group = await group_service.get_user_group(db, current_user)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company group found")
    await group_service.set_parent_company(db, group.id, company_id)
    await db.commit()
    return {"company_id": str(company_id), "is_parent": True}


@router.delete("/companies/{company_id}", status_code=204)
async def remove_company(
    company_id: UUID,
    current_user: User = Depends(_admin),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.get_user_group(db, current_user)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company group found")
    await group_service.remove_company_from_group(db, group.id, company_id)
    await db.commit()


@router.post("/companies/{company_id}/users", status_code=201)
async def add_user_to_company(
    company_id: UUID,
    data: AddUserToCompanyRequest,
    current_user: User = Depends(_admin),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.get_user_group(db, current_user)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company group found")
    membership = await group_service.add_user_to_company(
        db, group.id, company_id, data.user_id, data.role,
    )
    await db.commit()
    return {"id": str(membership.id), "status": "added"}


# ── Group user management ────────────────────────────────────────────────────

@router.get("/users")
async def list_group_users(
    current_user: User = Depends(_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all users across the group with their subsidiary access."""
    group = await group_service.get_user_group(db, current_user)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No group found")
    return await group_service.list_group_users(db, group.id)


@router.put("/users/{user_id}/access")
async def update_user_access(
    user_id: UUID,
    data: UpdateUserAccessRequest,
    current_user: User = Depends(_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update which subsidiaries a user can access and their role in each."""
    group = await group_service.get_user_group(db, current_user)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No group found")
    await group_service.update_user_access(db, group.id, user_id, data.memberships)
    await db.commit()
    return await group_service.list_group_users(db, group.id)


# ── CoA mismatch check & fix ─────────────────────────────────────────────────

@router.get("/coa-check/{company_id}", response_model=CoaMismatchResponse)
async def check_coa(
    company_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.get_user_group(db, current_user)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company group found")
    return await group_service.check_coa_mismatches(db, group.id, company_id)


@router.post("/coa-fix/{company_id}")
async def fix_coa(
    company_id: UUID,
    current_user: User = Depends(_admin),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.get_user_group(db, current_user)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company group found")
    count = await group_service.add_missing_accounts(db, group.id, company_id)
    await db.commit()
    return {"accounts_added": count}


# ── CoA template CRUD ─────────────────────────────────────────────────────────

@router.get("/coa-template", response_model=list[CoaTemplateEntryResponse])
async def list_coa_template(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.get_user_group(db, current_user)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company group found")
    return await group_service.list_coa_template(db, group.id)


@router.post("/coa-template", response_model=CoaTemplateEntryResponse, status_code=201)
async def create_coa_template_entry(
    data: CoaTemplateEntryCreate,
    current_user: User = Depends(_admin),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.get_user_group(db, current_user)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company group found")
    entry = await group_service.create_coa_template_entry(db, group.id, data.model_dump())
    await db.commit()
    await db.refresh(entry)
    return entry


@router.put("/coa-template/{entry_id}", response_model=CoaTemplateEntryResponse)
async def update_coa_template_entry(
    entry_id: UUID,
    data: CoaTemplateEntryCreate,
    current_user: User = Depends(_admin),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.get_user_group(db, current_user)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company group found")
    entry = await group_service.update_coa_template_entry(db, group.id, entry_id, data.model_dump())
    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/coa-template/{entry_id}", status_code=204)
async def delete_coa_template_entry(
    entry_id: UUID,
    current_user: User = Depends(_admin),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.get_user_group(db, current_user)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company group found")
    await group_service.delete_coa_template_entry(db, group.id, entry_id)
    await db.commit()


# ── Allocation rules ─────────────────────────────────────────────────────────

@router.get("/allocation-rules")
async def list_allocation_rules(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.get_user_group(db, current_user)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company group found")
    return await group_service.list_allocation_rules(db, group.id)


@router.post("/allocation-rules", status_code=201)
async def create_allocation_rule(
    data: AllocationRuleCreate,
    current_user: User = Depends(_admin),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.get_user_group(db, current_user)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company group found")
    rule = await group_service.create_allocation_rule(
        db, group.id, data.name, data.description, data.allocation_type,
        [ln.model_dump() for ln in data.lines], current_user,
    )
    await db.commit()
    # Return the full rule with lines
    rules = await group_service.list_allocation_rules(db, group.id)
    return next((r for r in rules if r["id"] == str(rule.id)), {"id": str(rule.id)})


@router.put("/allocation-rules/{rule_id}")
async def update_allocation_rule(
    rule_id: UUID,
    data: AllocationRuleCreate,
    current_user: User = Depends(_admin),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.get_user_group(db, current_user)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company group found")
    await group_service.update_allocation_rule(
        db, group.id, rule_id, data.name, data.description, data.allocation_type,
        [ln.model_dump() for ln in data.lines], current_user,
    )
    await db.commit()
    rules = await group_service.list_allocation_rules(db, group.id)
    return next((r for r in rules if r["id"] == str(rule_id)), {"id": str(rule_id)})


@router.delete("/allocation-rules/{rule_id}", status_code=204)
async def delete_allocation_rule(
    rule_id: UUID,
    current_user: User = Depends(_admin),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.get_user_group(db, current_user)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company group found")
    await group_service.delete_allocation_rule(db, group.id, rule_id)
    await db.commit()


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=GroupDashboardResponse)
async def group_dashboard(
    year: int = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.get_user_group(db, current_user)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company group found")
    return await group_service.get_group_dashboard(db, group.id, year)
