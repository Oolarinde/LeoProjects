"""CRUD routes for Units."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from app.models.user import User
from app.schemas.settings.units import (
    UnitCreate,
    UnitUpdate,
    UnitResponse,
)
from app.services.settings import units as units_service
from app.utils.dependencies import require_permission
from app.utils.permissions import Module, AccessLevel

router = APIRouter()

_read = require_permission(Module.LOCATIONS, AccessLevel.READ)
_write = require_permission(Module.LOCATIONS, AccessLevel.WRITE)


@router.get("/", response_model=list[UnitResponse])
def list_units(
    location_id: Optional[UUID] = Query(None),
    current_user: User = Depends(_read),
    db: Session = Depends(get_db),
):
    return units_service.list_units(db, current_user.company_id, location_id)


@router.post("/", response_model=UnitResponse, status_code=201)
def create_unit(
    data: UnitCreate,
    current_user: User = Depends(_write),
    db: Session = Depends(get_db),
):
    return units_service.create_unit(
        db, current_user.company_id, data.model_dump()
    )


@router.patch("/{item_id}", response_model=UnitResponse)
def update_unit(
    item_id: UUID,
    data: UnitUpdate,
    current_user: User = Depends(_write),
    db: Session = Depends(get_db),
):
    return units_service.update_unit(
        db, item_id, current_user.company_id, data.model_dump(exclude_unset=True)
    )


@router.delete("/{item_id}", status_code=204)
def delete_unit(
    item_id: UUID,
    current_user: User = Depends(_write),
    db: Session = Depends(get_db),
):
    units_service.delete_unit(db, item_id, current_user.company_id)
