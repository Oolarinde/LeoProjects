"""User management service — CRUD with role-hierarchy enforcement."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.utils.security import hash_password
from app.utils.permissions import (
    SUPER_ADMIN, ADMIN, STAFF,
    get_default_permissions, validate_permissions,
)

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


async def list_users(db: AsyncSession, company_id: UUID) -> list[User]:
    result = await db.execute(
        select(User).where(User.company_id == company_id).order_by(User.created_at)
    )
    return list(result.scalars().all())


async def get_user(db: AsyncSession, user_id: UUID, company_id: UUID) -> User:
    result = await db.execute(
        select(User).where(User.id == user_id, User.company_id == company_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


async def create_user(
    db: AsyncSession,
    company_id: UUID,
    email: str,
    full_name: str,
    password: str,
    role: str,
    permissions: dict[str, str],
    acting_user: User,
) -> User:
    if role not in VALID_ROLES or role == SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be ADMIN or STAFF",
        )

    _check_hierarchy(acting_user, role)

    # Check email uniqueness
    existing = await db.execute(select(User).where(User.email == email.lower().strip()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")

    validated_perms = validate_permissions(permissions) if permissions else get_default_permissions(role)

    user = User(
        company_id=company_id,
        email=email.lower().strip(),
        hashed_password=hash_password(password),
        full_name=full_name,
        role=role,
        permissions=validated_perms,
    )
    db.add(user)
    await db.flush()
    return user


async def update_user(
    db: AsyncSession,
    user_id: UUID,
    company_id: UUID,
    acting_user: User,
    full_name: str | None = None,
    role: str | None = None,
    permissions: dict[str, str] | None = None,
    is_active: bool | None = None,
) -> User:
    target = await get_user(db, user_id, company_id)

    # Check hierarchy against the target's current role
    _check_hierarchy(acting_user, target.role, target.id)

    if role is not None:
        if role not in VALID_ROLES or role == SUPER_ADMIN:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role must be ADMIN or STAFF")
        _check_hierarchy(acting_user, role)
        target.role = role

    if full_name is not None:
        target.full_name = full_name

    if permissions is not None:
        target.permissions = validate_permissions(permissions)

    if is_active is not None:
        if str(target.id) == str(acting_user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot deactivate yourself")
        target.is_active = is_active

    await db.flush()
    return target


async def deactivate_user(
    db: AsyncSession, user_id: UUID, company_id: UUID, acting_user: User
) -> User:
    target = await get_user(db, user_id, company_id)
    _check_hierarchy(acting_user, target.role, target.id)

    if str(target.id) == str(acting_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot deactivate yourself")

    target.is_active = False
    await db.flush()
    return target
