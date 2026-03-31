"""Routes for Intercompany Transactions."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from app.models.user import User
from app.schemas.intercompany import (
    IcBalanceResponse,
    IcTransactionCreate,
    IcTransactionListResponse,
    IcTransactionResponse,
    IcVoidRequest,
)
from app.services import company_groups as group_service
from app.services import intercompany as ic_service
from app.utils.dependencies import get_current_user, require_role
from app.utils.permissions import SUPER_ADMIN, ADMIN

router = APIRouter()

_admin = require_role(SUPER_ADMIN, ADMIN)


def _get_group_id(db: Session, user: User) -> UUID:
    """Get the user's company group ID, raise 404 if not in a group."""
    group = group_service.get_user_group(db, user)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company group found")
    return group.id


@router.get("/transactions")
def list_transactions(
    year: int = Query(...),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    group_id = _get_group_id(db, current_user)
    items, total = ic_service.list_ic_transactions(db, group_id, year, limit, offset)
    return {"items": items, "total": total}


@router.post("/transactions", status_code=201)
def create_transaction(
    data: IcTransactionCreate,
    current_user: User = Depends(_admin),
    db: Session = Depends(get_db),
):
    group_id = _get_group_id(db, current_user)

    if data.allocation_rule_id:
        # Allocated shared expense — creates multiple IC transactions
        transactions = ic_service.create_allocated_ic_transaction(
            db, group_id, data.allocation_rule_id, data, current_user,
        )
        db.commit()
        return {
            "allocated": True,
            "count": len(transactions),
            "ids": [str(t.id) for t in transactions],
        }
    else:
        ic_txn = ic_service.create_ic_transaction(db, group_id, data, current_user)
        db.commit()
        return {
            "id": str(ic_txn.id),
            "status": ic_txn.status,
            "source_expense_id": str(ic_txn.source_expense_id) if ic_txn.source_expense_id else None,
            "target_revenue_id": str(ic_txn.target_revenue_id) if ic_txn.target_revenue_id else None,
        }


@router.patch("/transactions/{ic_id}/confirm")
def confirm_transaction(
    ic_id: UUID,
    current_user: User = Depends(_admin),
    db: Session = Depends(get_db),
):
    group_id = _get_group_id(db, current_user)
    ic_txn = ic_service.confirm_ic_transaction(db, group_id, ic_id, current_user)
    db.commit()
    return {"id": str(ic_txn.id), "status": ic_txn.status}


@router.patch("/transactions/{ic_id}/void")
def void_transaction(
    ic_id: UUID,
    data: IcVoidRequest,
    current_user: User = Depends(_admin),
    db: Session = Depends(get_db),
):
    group_id = _get_group_id(db, current_user)
    ic_txn = ic_service.void_ic_transaction(db, group_id, ic_id, data.void_reason, current_user)
    db.commit()
    return {"id": str(ic_txn.id), "status": ic_txn.status}


@router.get("/balances")
def get_balances(
    year: int = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    group_id = _get_group_id(db, current_user)
    return ic_service.get_ic_balances(db, group_id, year)
