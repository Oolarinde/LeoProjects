"""Consolidated financial report endpoints for group accounting."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from app.models.user import User
from app.services import company_groups as group_service
from app.services import consolidated_reports as consol_service
from app.utils.dependencies import get_current_user

router = APIRouter()


def _get_group_id(db: Session, user: User) -> UUID:
    """Get the user's company group ID, raise 404 if not in a group."""
    group = group_service.get_user_group(db, user)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company group found")
    return group.id


@router.get("/pnl/summary")
def consolidated_pnl(
    year: int = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    group_id = _get_group_id(db, current_user)
    return consol_service.get_consolidated_pnl(db, group_id, year)


@router.get("/balance-sheet/summary")
def consolidated_balance_sheet(
    year: int = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    group_id = _get_group_id(db, current_user)
    return consol_service.get_consolidated_balance_sheet(db, group_id, year)


@router.get("/trial-balance/summary")
def consolidated_trial_balance(
    year: int = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    group_id = _get_group_id(db, current_user)
    return consol_service.get_consolidated_trial_balance(db, group_id, year)
