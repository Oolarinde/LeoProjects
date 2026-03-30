from __future__ import annotations
"""Role (group) management service — CRUD with member management."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.group import Group
from app.models.user import User
from app.utils.permissions import validate_permissions
from app.services.audit import log_action, compute_diff


async def list_groups(db: AsyncSession, company_id: UUID) -> list[dict]:
    """List all roles for a company with member counts."""
    result = await db.execute(
        select(
            Group,
            sa_func.count(User.id).label("member_count"),
        )
        .outerjoin(User, (User.group_id == Group.id) & (User.is_active.is_(True)))
        .where(Group.company_id == company_id)
        .group_by(Group.id)
        .order_by(Group.created_at)
    )
    rows = result.all()
    groups = []
    for group, member_count in rows:
        groups.append({
            "id": group.id,
            "company_id": group.company_id,
            "name": group.name,
            "description": group.description,
            "permissions": group.permissions,
            "member_count": member_count,
            "created_at": group.created_at,
        })
    return groups


async def get_group(db: AsyncSession, group_id: UUID, company_id: UUID) -> Group:
    result = await db.execute(
        select(Group)
        .options(selectinload(Group.members))
        .where(Group.id == group_id, Group.company_id == company_id)
    )
    group = result.scalar_one_or_none()
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    return group


async def create_group(
    db: AsyncSession,
    company_id: UUID,
    name: str,
    description: str | None,
    permissions: dict[str, str],
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> Group:
    # Check name uniqueness within company
    existing = await db.execute(
        select(Group).where(Group.company_id == company_id, Group.name == name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A role with this name already exists")

    validated_perms = validate_permissions(permissions) if permissions else {}

    group = Group(
        company_id=company_id,
        name=name,
        description=description,
        permissions=validated_perms,
        created_by=user_id,
    )
    db.add(group)
    await db.flush()
    await log_action(
        db,
        company_id=company_id,
        table_name="groups",
        record_id=group.id,
        action="CREATE",
        user_id=user_id,
        ip_address=ip_address,
    )
    return group


async def update_group(
    db: AsyncSession,
    group_id: UUID,
    company_id: UUID,
    name: str | None = None,
    description: str | None = None,
    permissions: dict[str, str] | None = None,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> Group:
    group = await get_group(db, group_id, company_id)

    # Build update dict for audit diff
    update_data: dict = {}
    if name is not None:
        update_data["name"] = name
    if description is not None:
        update_data["description"] = description
    if permissions is not None:
        update_data["permissions"] = str(permissions)

    diff = compute_diff(group, update_data)

    if name is not None and name != group.name:
        existing = await db.execute(
            select(Group).where(Group.company_id == company_id, Group.name == name, Group.id != group_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A role with this name already exists")
        group.name = name

    if description is not None:
        group.description = description

    if permissions is not None:
        group.permissions = validate_permissions(permissions)
        # Sync updated permissions to all members of this role
        members = await db.execute(select(User).where(User.group_id == group_id))
        for user in members.scalars().all():
            user.permissions = group.permissions

    group.updated_by = user_id
    await db.flush()

    if diff:
        await log_action(
            db,
            company_id=company_id,
            table_name="groups",
            record_id=group.id,
            action="UPDATE",
            changed_fields=diff,
            user_id=user_id,
            ip_address=ip_address,
        )
    return group


async def delete_group(
    db: AsyncSession,
    group_id: UUID,
    company_id: UUID,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> None:
    group = await get_group(db, group_id, company_id)

    # Prevent deleting a role that still has users assigned
    member_count = await db.execute(
        select(sa_func.count(User.id)).where(User.group_id == group_id)
    )
    count = member_count.scalar() or 0
    if count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete this role — {count} user(s) are still assigned. Reassign them first.",
        )

    record_id = group.id
    await db.delete(group)
    await db.flush()
    await log_action(
        db,
        company_id=company_id,
        table_name="groups",
        record_id=record_id,
        action="DELETE",
        user_id=user_id,
        ip_address=ip_address,
    )


async def add_members(db: AsyncSession, group_id: UUID, company_id: UUID, user_ids: list[UUID]) -> Group:
    group = await get_group(db, group_id, company_id)

    result = await db.execute(
        select(User).where(User.id.in_(user_ids), User.company_id == company_id)
    )
    users = result.scalars().all()

    if len(users) != len(user_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more users not found")

    for user in users:
        user.group_id = group_id
        user.permissions = group.permissions

    await db.flush()
    return await get_group(db, group_id, company_id)


async def remove_members(db: AsyncSession, group_id: UUID, company_id: UUID, user_ids: list[UUID]) -> Group:
    """Remove members is no longer allowed — every user must have a role.
    Use add_members to reassign users to a different role instead."""
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Cannot remove users from a role. Reassign them to a different role instead.",
    )
