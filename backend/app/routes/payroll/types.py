from __future__ import annotations
"""CRUD routes for allowance types, deduction types, tax brackets, and leave policies."""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.models.user import User
from app.schemas.payroll.types import (
    AllowanceTypeCreate,
    AllowanceTypeUpdate,
    AllowanceTypeResponse,
    DeductionTypeCreate,
    DeductionTypeUpdate,
    DeductionTypeResponse,
    TaxBracketResponse,
    TaxBracketsReplace,
    LeavePolicyCreate,
    LeavePolicyUpdate,
    LeavePolicyResponse,
)
from app.services.payroll import types as types_service
from app.utils.dependencies import require_permission
from app.utils.permissions import Module, AccessLevel

router = APIRouter()

_read = require_permission(Module.PAYROLL, AccessLevel.READ)
_write = require_permission(Module.PAYROLL, AccessLevel.WRITE)


# ── Allowance Types ──────────────────────────────────────────────


@router.get("/allowance-types", response_model=list[AllowanceTypeResponse])
async def list_allowance_types(
    current_user: User = Depends(_read),
    db: AsyncSession = Depends(get_db),
):
    return await types_service.list_allowance_types(db, current_user.company_id)


@router.post("/allowance-types", response_model=AllowanceTypeResponse, status_code=201)
async def create_allowance_type(
    data: AllowanceTypeCreate,
    current_user: User = Depends(_write),
    db: AsyncSession = Depends(get_db),
):
    return await types_service.create_allowance_type(
        db, current_user.company_id, data.model_dump()
    )


@router.patch("/allowance-types/{item_id}", response_model=AllowanceTypeResponse)
async def update_allowance_type(
    item_id: UUID,
    data: AllowanceTypeUpdate,
    current_user: User = Depends(_write),
    db: AsyncSession = Depends(get_db),
):
    return await types_service.update_allowance_type(
        db, item_id, current_user.company_id, data.model_dump(exclude_unset=True)
    )


@router.delete("/allowance-types/{item_id}", status_code=204)
async def delete_allowance_type(
    item_id: UUID,
    current_user: User = Depends(_write),
    db: AsyncSession = Depends(get_db),
):
    await types_service.delete_allowance_type(db, item_id, current_user.company_id)


# ── Deduction Types ──────────────────────────────────────────────


@router.get("/deduction-types", response_model=list[DeductionTypeResponse])
async def list_deduction_types(
    current_user: User = Depends(_read),
    db: AsyncSession = Depends(get_db),
):
    return await types_service.list_deduction_types(db, current_user.company_id)


@router.post("/deduction-types", response_model=DeductionTypeResponse, status_code=201)
async def create_deduction_type(
    data: DeductionTypeCreate,
    current_user: User = Depends(_write),
    db: AsyncSession = Depends(get_db),
):
    return await types_service.create_deduction_type(
        db, current_user.company_id, data.model_dump()
    )


@router.patch("/deduction-types/{item_id}", response_model=DeductionTypeResponse)
async def update_deduction_type(
    item_id: UUID,
    data: DeductionTypeUpdate,
    current_user: User = Depends(_write),
    db: AsyncSession = Depends(get_db),
):
    return await types_service.update_deduction_type(
        db, item_id, current_user.company_id, data.model_dump(exclude_unset=True)
    )


@router.delete("/deduction-types/{item_id}", status_code=204)
async def delete_deduction_type(
    item_id: UUID,
    current_user: User = Depends(_write),
    db: AsyncSession = Depends(get_db),
):
    await types_service.delete_deduction_type(db, item_id, current_user.company_id)


# ── Tax Brackets ─────────────────────────────────────────────────


@router.get("/tax-brackets", response_model=list[TaxBracketResponse])
async def list_tax_brackets(
    current_user: User = Depends(_read),
    db: AsyncSession = Depends(get_db),
):
    return await types_service.list_tax_brackets(db, current_user.company_id)


@router.put("/tax-brackets", response_model=list[TaxBracketResponse])
async def replace_tax_brackets(
    data: TaxBracketsReplace,
    current_user: User = Depends(_write),
    db: AsyncSession = Depends(get_db),
):
    return await types_service.replace_tax_brackets(
        db, current_user.company_id, [b.model_dump() for b in data.brackets]
    )


# ── Leave Policies ───────────────────────────────────────────────


@router.get("/leave-policies", response_model=list[LeavePolicyResponse])
async def list_leave_policies(
    current_user: User = Depends(_read),
    db: AsyncSession = Depends(get_db),
):
    return await types_service.list_leave_policies(db, current_user.company_id)


@router.post("/leave-policies", response_model=LeavePolicyResponse, status_code=201)
async def create_leave_policy(
    data: LeavePolicyCreate,
    current_user: User = Depends(_write),
    db: AsyncSession = Depends(get_db),
):
    return await types_service.create_leave_policy(
        db, current_user.company_id, data.model_dump()
    )


@router.patch("/leave-policies/{item_id}", response_model=LeavePolicyResponse)
async def update_leave_policy(
    item_id: UUID,
    data: LeavePolicyUpdate,
    current_user: User = Depends(_write),
    db: AsyncSession = Depends(get_db),
):
    return await types_service.update_leave_policy(
        db, item_id, current_user.company_id, data.model_dump(exclude_unset=True)
    )


@router.delete("/leave-policies/{item_id}", status_code=204)
async def delete_leave_policy(
    item_id: UUID,
    current_user: User = Depends(_write),
    db: AsyncSession = Depends(get_db),
):
    await types_service.delete_leave_policy(db, item_id, current_user.company_id)
