from __future__ import annotations
"""CRUD services for Chart of Accounts."""

import uuid
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.account import Account
from app.services.audit import log_action, compute_diff


UPDATABLE_FIELDS = {"name", "code", "type", "normal_balance", "description"}


def list_accounts(db: Session, company_id: UUID) -> list[Account]:
    result = db.execute(
        select(Account)
        .where(Account.company_id == company_id)
        .order_by(Account.code)
    )
    return list(result.scalars().all())


def create_account(
    db: Session,
    company_id: UUID,
    data: dict,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> Account:
    existing = db.execute(
        select(Account).where(
            Account.company_id == company_id,
            Account.code == data["code"],
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Account with code '{data['code']}' already exists",
        )
    item = Account(id=uuid.uuid4(), company_id=company_id, created_by=user_id, **data)
    db.add(item)
    db.flush()
    log_action(
        db,
        company_id=company_id,
        table_name="accounts",
        record_id=item.id,
        action="CREATE",
        user_id=user_id,
        ip_address=ip_address,
    )
    return item


def update_account(
    db: Session,
    item_id: UUID,
    company_id: UUID,
    data: dict,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> Account:
    result = db.execute(
        select(Account).where(
            Account.id == item_id, Account.company_id == company_id
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    if "code" in data and data["code"] is not None and data["code"] != item.code:
        dup = db.execute(
            select(Account).where(
                Account.company_id == company_id,
                Account.code == data["code"],
                Account.id != item_id,
            )
        )
        if dup.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Account with code '{data['code']}' already exists",
            )
    filtered = {k: v for k, v in data.items() if v is not None and k in UPDATABLE_FIELDS}
    diff = compute_diff(item, filtered)
    for key, value in data.items():
        if value is not None and key in UPDATABLE_FIELDS:
            setattr(item, key, value)
    item.updated_by = user_id
    db.flush()
    if diff:
        log_action(
            db,
            company_id=company_id,
            table_name="accounts",
            record_id=item.id,
            action="UPDATE",
            changed_fields=diff,
            user_id=user_id,
            ip_address=ip_address,
        )
    return item


def delete_account(
    db: Session,
    item_id: UUID,
    company_id: UUID,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> None:
    result = db.execute(
        select(Account).where(
            Account.id == item_id, Account.company_id == company_id
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    record_id = item.id
    db.delete(item)
    db.flush()
    log_action(
        db,
        company_id=company_id,
        table_name="accounts",
        record_id=record_id,
        action="DELETE",
        user_id=user_id,
        ip_address=ip_address,
    )
