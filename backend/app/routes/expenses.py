"""CRUD routes for Expense Transactions."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.models.user import User
from app.schemas.expenses import ExpenseCreate, ExpenseUpdate, ExpenseResponse
from app.services import expenses as expenses_service
from app.utils.dependencies import require_permission
from app.utils.permissions import Module, AccessLevel
from app.utils.request_context import get_client_ip

router = APIRouter()

_read = require_permission(Module.EXPENSES, AccessLevel.READ)
_write = require_permission(Module.EXPENSES, AccessLevel.WRITE)


@router.get("/", response_model=list[ExpenseResponse])
async def list_expenses(
    year: int = Query(...),
    location_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(_read),
    db: AsyncSession = Depends(get_db),
):
    items, total = await expenses_service.list_expenses(
        db, current_user.company_id, year, location_id, limit, offset, search,
    )
    return items


@router.get("/summary")
async def expenses_summary(
    year: int = Query(...),
    location_id: Optional[UUID] = Query(None),
    current_user: User = Depends(_read),
    db: AsyncSession = Depends(get_db),
):
    return await expenses_service.get_summary(db, current_user.company_id, year, location_id)


@router.post("/", response_model=ExpenseResponse, status_code=201)
async def create_expense(
    data: ExpenseCreate,
    request: Request,
    current_user: User = Depends(_write),
    db: AsyncSession = Depends(get_db),
):
    return await expenses_service.create_expense(
        db, current_user.company_id, data.model_dump(), current_user.id, get_client_ip(request),
    )


@router.patch("/{item_id}", response_model=ExpenseResponse)
async def update_expense(
    item_id: UUID,
    data: ExpenseUpdate,
    request: Request,
    current_user: User = Depends(_write),
    db: AsyncSession = Depends(get_db),
):
    return await expenses_service.update_expense(
        db, item_id, current_user.company_id,
        data.model_dump(exclude_unset=True), current_user.id, get_client_ip(request),
    )


@router.post("/{item_id}/void", response_model=ExpenseResponse)
async def void_expense(
    item_id: UUID,
    request: Request,
    reason: str = Query(""),
    current_user: User = Depends(_write),
    db: AsyncSession = Depends(get_db),
):
    """Void an expense transaction. Financial records are never deleted."""
    return await expenses_service.void_expense(
        db, item_id, current_user.company_id, reason, current_user.id, get_client_ip(request),
    )
