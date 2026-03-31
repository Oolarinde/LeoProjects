"""CRUD routes for Locations."""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from app.models.user import User
from app.schemas.settings.locations import (
    LocationCreate,
    LocationUpdate,
    LocationResponse,
)
from app.services.settings import locations as locations_service
from app.utils.dependencies import require_permission
from app.utils.permissions import Module, AccessLevel

router = APIRouter()

_read = require_permission(Module.LOCATIONS, AccessLevel.READ)
_write = require_permission(Module.LOCATIONS, AccessLevel.WRITE)


@router.get("/", response_model=list[LocationResponse])
def list_locations(
    current_user: User = Depends(_read),
    db: Session = Depends(get_db),
):
    return locations_service.list_locations(db, current_user.company_id)


@router.post("/", response_model=LocationResponse, status_code=201)
def create_location(
    data: LocationCreate,
    current_user: User = Depends(_write),
    db: Session = Depends(get_db),
):
    return locations_service.create_location(
        db, current_user.company_id, data.model_dump()
    )


@router.patch("/{item_id}", response_model=LocationResponse)
def update_location(
    item_id: UUID,
    data: LocationUpdate,
    current_user: User = Depends(_write),
    db: Session = Depends(get_db),
):
    return locations_service.update_location(
        db, item_id, current_user.company_id, data.model_dump(exclude_unset=True)
    )


@router.delete("/{item_id}", status_code=204)
def delete_location(
    item_id: UUID,
    current_user: User = Depends(_write),
    db: Session = Depends(get_db),
):
    locations_service.delete_location(db, item_id, current_user.company_id)
