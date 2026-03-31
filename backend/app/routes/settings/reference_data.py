"""CRUD routes for Reference Data."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from app.models.user import User
from app.schemas.settings.reference_data import (
    ReferenceDataCreate,
    ReferenceDataUpdate,
    ReferenceDataResponse,
)
from app.services.settings import reference_data as reference_data_service
from app.utils.dependencies import require_permission
from app.utils.permissions import Module, AccessLevel

router = APIRouter()

_read = require_permission(Module.REFERENCE, AccessLevel.READ)
_write = require_permission(Module.REFERENCE, AccessLevel.WRITE)


@router.get("/", response_model=list[ReferenceDataResponse])
def list_reference_data(
    category: Optional[str] = Query(None),
    current_user: User = Depends(_read),
    db: Session = Depends(get_db),
):
    return reference_data_service.list_reference_data(
        db, current_user.company_id, category
    )


@router.post("/", response_model=ReferenceDataResponse, status_code=201)
def create_reference_data(
    data: ReferenceDataCreate,
    current_user: User = Depends(_write),
    db: Session = Depends(get_db),
):
    return reference_data_service.create_reference_data(
        db, current_user.company_id, data.model_dump()
    )


@router.patch("/{item_id}", response_model=ReferenceDataResponse)
def update_reference_data(
    item_id: UUID,
    data: ReferenceDataUpdate,
    current_user: User = Depends(_write),
    db: Session = Depends(get_db),
):
    return reference_data_service.update_reference_data(
        db, item_id, current_user.company_id, data.model_dump(exclude_unset=True)
    )


@router.delete("/{item_id}", status_code=204)
def delete_reference_data(
    item_id: UUID,
    current_user: User = Depends(_write),
    db: Session = Depends(get_db),
):
    reference_data_service.delete_reference_data(db, item_id, current_user.company_id)
