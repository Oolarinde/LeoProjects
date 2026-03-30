"""CRUD routes for Revenue Transactions."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.models.user import User
from app.schemas.revenue import RevenueCreate, RevenueUpdate, RevenueResponse
from app.services import revenue as revenue_service
from app.utils.dependencies import require_permission
from app.utils.permissions import Module, AccessLevel
from app.utils.request_context import get_client_ip

router = APIRouter()

_read = require_permission(Module.REVENUE, AccessLevel.READ)
_write = require_permission(Module.REVENUE, AccessLevel.WRITE)


@router.get("/", response_model=list[RevenueResponse])
async def list_revenue(
    year: int = Query(...),
    location_id: Optional[UUID] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(_read),
    db: AsyncSession = Depends(get_db),
):
    items, total = await revenue_service.list_revenue(
        db, current_user.company_id, year, location_id, limit, offset,
    )
    return items


@router.get("/summary")
async def revenue_summary(
    year: int = Query(...),
    location_id: Optional[UUID] = Query(None),
    current_user: User = Depends(_read),
    db: AsyncSession = Depends(get_db),
):
    return await revenue_service.get_summary(db, current_user.company_id, year, location_id)


@router.post("/", response_model=RevenueResponse, status_code=201)
async def create_revenue(
    data: RevenueCreate,
    request: Request,
    current_user: User = Depends(_write),
    db: AsyncSession = Depends(get_db),
):
    return await revenue_service.create_revenue(
        db, current_user.company_id, data.model_dump(), current_user.id, get_client_ip(request),
    )


@router.patch("/{item_id}", response_model=RevenueResponse)
async def update_revenue(
    item_id: UUID,
    data: RevenueUpdate,
    request: Request,
    current_user: User = Depends(_write),
    db: AsyncSession = Depends(get_db),
):
    return await revenue_service.update_revenue(
        db, item_id, current_user.company_id,
        data.model_dump(exclude_unset=True), current_user.id, get_client_ip(request),
    )


@router.delete("/{item_id}", status_code=204)
async def delete_revenue(
    item_id: UUID,
    request: Request,
    current_user: User = Depends(_write),
    db: AsyncSession = Depends(get_db),
):
    await revenue_service.delete_revenue(
        db, item_id, current_user.company_id, current_user.id, get_client_ip(request),
    )
