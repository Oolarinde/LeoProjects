"""CRUD routes for Chart of Accounts."""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.models.user import User
from app.schemas.settings.accounts import (
    AccountCreate,
    AccountUpdate,
    AccountResponse,
)
from app.services.settings import accounts as accounts_service
from app.utils.dependencies import require_permission
from app.utils.permissions import Module, AccessLevel

router = APIRouter()

_read = require_permission(Module.ACCOUNTS, AccessLevel.READ)
_write = require_permission(Module.ACCOUNTS, AccessLevel.WRITE)


@router.get("/", response_model=list[AccountResponse])
async def list_accounts(
    current_user: User = Depends(_read),
    db: AsyncSession = Depends(get_db),
):
    return await accounts_service.list_accounts(db, current_user.company_id)


@router.post("/", response_model=AccountResponse, status_code=201)
async def create_account(
    data: AccountCreate,
    current_user: User = Depends(_write),
    db: AsyncSession = Depends(get_db),
):
    return await accounts_service.create_account(
        db, current_user.company_id, data.model_dump()
    )


@router.patch("/{item_id}", response_model=AccountResponse)
async def update_account(
    item_id: UUID,
    data: AccountUpdate,
    current_user: User = Depends(_write),
    db: AsyncSession = Depends(get_db),
):
    return await accounts_service.update_account(
        db, item_id, current_user.company_id, data.model_dump(exclude_unset=True)
    )


@router.delete("/{item_id}", status_code=204)
async def delete_account(
    item_id: UUID,
    current_user: User = Depends(_write),
    db: AsyncSession = Depends(get_db),
):
    await accounts_service.delete_account(db, item_id, current_user.company_id)
