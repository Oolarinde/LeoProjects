from __future__ import annotations
"""User management service — CRUD with role-hierarchy enforcement."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.group import Group
from app.utils.security import hash_password
from app.utils.permissions import SUPER_ADMIN, ADMIN, STAFF
from app.services.audit import log_action, compute_diff

VALID_ROLES = {SUPER_ADMIN, ADMIN, STAFF}
ROLE_RANK = {SUPER_ADMIN: 3, ADMIN: 2, STAFF: 1}


def _check_hierarchy(acting_user: User, target_role: str, target_id: UUID | None = None):
    """Ensure acting user can manage the target role. Raises 403 on violation."""
    if acting_user.role == SUPER_ADMIN:
        if target_id and str(target_id) == str(acting_user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot modify your own account here")
        return
    # ADMIN can only manage STAFF
    if ROLE_RANK.get(target_role, 0) >= ROLE_RANK.get(acting_user.role, 0):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cannot manage users with role {target_role}",
        )


def _resolve_group(db: Session, group_id_str: str, company_id: UUID) -> Group:
    """Validate and fetch a group by ID within a company."""
    result = db.execute(
        select(Group).where(Group.id == UUID(group_id_str), Group.company_id == company_id)
    )
    group = result.scalar_one_or_none()
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    return group


def list_users(db: Session, company_id: UUID) -> list[User]:
    result = db.execute(
        select(User).where(User.company_id == company_id).order_by(User.created_at)
    )
    return list(result.scalars().all())


def get_user(db: Session, user_id: UUID, company_id: UUID) -> User:
    result = db.execute(
        select(User).where(User.id == user_id, User.company_id == company_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def create_user(
    db: Session,
    company_id: UUID,
    email: str,
    full_name: str,
    password: str,
    role: str,
    group_id: str,
    acting_user: User,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> User:
    if role not in VALID_ROLES or role == SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be ADMIN or STAFF",
        )

    _check_hierarchy(acting_user, role)

    # Check email uniqueness
    existing = db.execute(select(User).where(User.email == email.lower().strip()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")

    # Resolve the custom role (group) and inherit its permissions
    group = _resolve_group(db, group_id, company_id)

    user = User(
        company_id=company_id,
        email=email.lower().strip(),
        hashed_password=hash_password(password),
        full_name=full_name,
        role=role,
        group_id=group.id,
        permissions=group.permissions,
        created_by=user_id,
    )
    db.add(user)
    db.flush()
    log_action(
        db,
        company_id=company_id,
        table_name="users",
        record_id=user.id,
        action="CREATE",
        user_id=user_id,
        ip_address=ip_address,
    )
    return user


def update_user(
    db: Session,
    user_id: UUID,
    company_id: UUID,
    acting_user: User,
    full_name: str | None = None,
    role: str | None = None,
    is_active: bool | None = None,
    group_id: str | None = None,
    audit_user_id: UUID | None = None,
    ip_address: str | None = None,
) -> User:
    target = get_user(db, user_id, company_id)

    # Check hierarchy against the target's current role
    _check_hierarchy(acting_user, target.role, target.id)

    # Build update dict for audit diff
    update_data: dict = {}
    if role is not None:
        update_data["role"] = role
    if full_name is not None:
        update_data["full_name"] = full_name
    if group_id is not None:
        update_data["group_id"] = group_id
    if is_active is not None:
        update_data["is_active"] = is_active

    diff = compute_diff(target, update_data)

    if role is not None:
        if role not in VALID_ROLES or role == SUPER_ADMIN:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role must be ADMIN or STAFF")
        _check_hierarchy(acting_user, role)
        target.role = role

    if full_name is not None:
        target.full_name = full_name

    if group_id is not None:
        # Change custom role — inherit new role's permissions
        group = _resolve_group(db, group_id, company_id)
        target.group_id = group.id
        target.permissions = group.permissions

    if is_active is not None:
        if str(target.id) == str(acting_user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot deactivate yourself")
        target.is_active = is_active

    target.updated_by = audit_user_id
    db.flush()

    if diff:
        log_action(
            db,
            company_id=company_id,
            table_name="users",
            record_id=target.id,
            action="UPDATE",
            changed_fields=diff,
            user_id=audit_user_id,
            ip_address=ip_address,
        )
    return target


def deactivate_user(
    db: Session,
    user_id: UUID,
    company_id: UUID,
    acting_user: User,
    audit_user_id: UUID | None = None,
    ip_address: str | None = None,
) -> User:
    target = get_user(db, user_id, company_id)
    _check_hierarchy(acting_user, target.role, target.id)

    if str(target.id) == str(acting_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot deactivate yourself")

    target.is_active = False
    target.updated_by = audit_user_id
    db.flush()
    log_action(
        db,
        company_id=company_id,
        table_name="users",
        record_id=target.id,
        action="DELETE",
        user_id=audit_user_id,
        ip_address=ip_address,
    )
    return target
