from __future__ import annotations
"""Group management routes — admin-only."""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.models.user import User
from app.schemas.groups import (
    GroupCreateRequest,
    GroupUpdateRequest,
    GroupMemberRequest,
    GroupResponse,
    GroupDetailResponse,
)
from app.services import groups as group_service
from app.utils.dependencies import require_admin

router = APIRouter()


@router.get("", response_model=list[GroupResponse])
async def list_groups(
    current_user: User = Depends(require_admin()),
    db: AsyncSession = Depends(get_db),
):
    return await group_service.list_groups(db, current_user.company_id)


@router.post("", response_model=GroupResponse, status_code=201)
async def create_group(
    data: GroupCreateRequest,
    current_user: User = Depends(require_admin()),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.create_group(
        db=db,
        company_id=current_user.company_id,
        name=data.name,
        description=data.description,
        permissions=data.permissions,
    )
    return GroupResponse(
        id=group.id,
        company_id=group.company_id,
        name=group.name,
        description=group.description,
        permissions=group.permissions,
        member_count=0,
        created_at=group.created_at,
    )


@router.get("/{group_id}", response_model=GroupDetailResponse)
async def get_group(
    group_id: UUID,
    current_user: User = Depends(require_admin()),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.get_group(db, group_id, current_user.company_id)
    return GroupDetailResponse(
        id=group.id,
        company_id=group.company_id,
        name=group.name,
        description=group.description,
        permissions=group.permissions,
        member_count=len([m for m in group.members if m.is_active]),
        created_at=group.created_at,
        members=[
            {"id": m.id, "email": m.email, "full_name": m.full_name, "role": m.role, "is_active": m.is_active}
            for m in group.members
        ],
    )


@router.patch("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: UUID,
    data: GroupUpdateRequest,
    current_user: User = Depends(require_admin()),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.update_group(
        db=db,
        group_id=group_id,
        company_id=current_user.company_id,
        name=data.name,
        description=data.description,
        permissions=data.permissions,
    )
    active_count = len([m for m in group.members if m.is_active])
    return GroupResponse(
        id=group.id,
        company_id=group.company_id,
        name=group.name,
        description=group.description,
        permissions=group.permissions,
        member_count=active_count,
        created_at=group.created_at,
    )


@router.delete("/{group_id}", status_code=204)
async def delete_group(
    group_id: UUID,
    current_user: User = Depends(require_admin()),
    db: AsyncSession = Depends(get_db),
):
    await group_service.delete_group(db, group_id, current_user.company_id)


@router.post("/{group_id}/members", response_model=GroupDetailResponse)
async def add_members(
    group_id: UUID,
    data: GroupMemberRequest,
    current_user: User = Depends(require_admin()),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.add_members(db, group_id, current_user.company_id, data.user_ids)
    return GroupDetailResponse(
        id=group.id,
        company_id=group.company_id,
        name=group.name,
        description=group.description,
        permissions=group.permissions,
        member_count=len([m for m in group.members if m.is_active]),
        created_at=group.created_at,
        members=[
            {"id": m.id, "email": m.email, "full_name": m.full_name, "role": m.role, "is_active": m.is_active}
            for m in group.members
        ],
    )


@router.delete("/{group_id}/members", response_model=GroupDetailResponse)
async def remove_members(
    group_id: UUID,
    data: GroupMemberRequest,
    current_user: User = Depends(require_admin()),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.remove_members(db, group_id, current_user.company_id, data.user_ids)
    return GroupDetailResponse(
        id=group.id,
        company_id=group.company_id,
        name=group.name,
        description=group.description,
        permissions=group.permissions,
        member_count=len([m for m in group.members if m.is_active]),
        created_at=group.created_at,
        members=[
            {"id": m.id, "email": m.email, "full_name": m.full_name, "role": m.role, "is_active": m.is_active}
            for m in group.members
        ],
    )
