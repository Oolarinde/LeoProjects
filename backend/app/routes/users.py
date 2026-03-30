from __future__ import annotations
"""User management routes — admin-only."""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.models.user import User
from app.schemas.schemas import UserResponse
from app.schemas.users import UserCreateRequest, UserUpdateRequest
from app.services import users as user_service
from app.utils.dependencies import require_admin

router = APIRouter()


@router.get("", response_model=list[UserResponse])
async def list_users(
    current_user: User = Depends(require_admin()),
    db: AsyncSession = Depends(get_db),
):
    return await user_service.list_users(db, current_user.company_id)


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(
    data: UserCreateRequest,
    current_user: User = Depends(require_admin()),
    db: AsyncSession = Depends(get_db),
):
    user = await user_service.create_user(
        db=db,
        company_id=current_user.company_id,
        email=data.email,
        full_name=data.full_name,
        password=data.password,
        role=data.role,
        group_id=data.group_id,
        acting_user=current_user,
    )
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    current_user: User = Depends(require_admin()),
    db: AsyncSession = Depends(get_db),
):
    return await user_service.get_user(db, user_id, current_user.company_id)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    data: UserUpdateRequest,
    current_user: User = Depends(require_admin()),
    db: AsyncSession = Depends(get_db),
):
    user = await user_service.update_user(
        db=db,
        user_id=user_id,
        company_id=current_user.company_id,
        acting_user=current_user,
        full_name=data.full_name,
        role=data.role,
        is_active=data.is_active,
        group_id=data.group_id,
    )
    return user


@router.delete("/{user_id}", response_model=UserResponse)
async def deactivate_user(
    user_id: UUID,
    current_user: User = Depends(require_admin()),
    db: AsyncSession = Depends(get_db),
):
    user = await user_service.deactivate_user(
        db=db,
        user_id=user_id,
        company_id=current_user.company_id,
        acting_user=current_user,
    )
    return user
