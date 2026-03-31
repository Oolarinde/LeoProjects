from __future__ import annotations
import logging
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Company
from app.models.group import Group
from app.models.user import User
from app.models.user_company_membership import UserCompanyMembership
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.utils.permissions import SUPER_ADMIN, ALL_WRITE, ALL_READ
from app.services.payroll.settings import get_or_create_settings
from app.services.payroll.types import seed_payroll_defaults

logger = logging.getLogger(__name__)


async def _ensure_default_roles(db: AsyncSession, company_id) -> tuple[Group, Group]:
    """Create Administrator and Staff default roles for a company if they don't exist."""
    admin_role = (await db.execute(
        select(Group).where(Group.company_id == company_id, Group.name == "Administrator")
    )).scalar_one_or_none()

    if admin_role is None:
        admin_role = Group(
            company_id=company_id,
            name="Administrator",
            description="Full access to all modules",
            permissions=dict(ALL_WRITE),
        )
        db.add(admin_role)

    staff_role = (await db.execute(
        select(Group).where(Group.company_id == company_id, Group.name == "Staff")
    )).scalar_one_or_none()

    if staff_role is None:
        staff_role = Group(
            company_id=company_id,
            name="Staff",
            description="Read-only access to all modules",
            permissions=dict(ALL_READ),
        )
        db.add(staff_role)

    await db.flush()
    return admin_role, staff_role


async def register_user(
    db: AsyncSession, email: str, password: str, full_name: str, company_name: str
) -> tuple[User, Company]:
    company = Company(name=company_name)
    db.add(company)
    await db.flush()

    # Create default roles for the new company
    admin_role, _staff_role = await _ensure_default_roles(db, company.id)

    # Seed payroll defaults for the new company
    await get_or_create_settings(db, company.id)
    await seed_payroll_defaults(db, company.id)

    user = User(
        company_id=company.id,
        email=email.lower().strip(),
        hashed_password=hash_password(password),
        full_name=full_name,
        role=SUPER_ADMIN,
        permissions=admin_role.permissions,
        group_id=admin_role.id,
    )
    db.add(user)
    await db.flush()

    # Create default company membership for the new user
    membership = UserCompanyMembership(
        user_id=user.id,
        company_id=company.id,
        role=SUPER_ADMIN,
        permissions=admin_role.permissions,
        group_id=admin_role.id,
        is_default=True,
    )
    db.add(membership)
    await db.flush()

    return user, company


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    clean_email = email.lower().strip()
    result = await db.execute(select(User).where(User.email == clean_email))
    user = result.scalar_one_or_none()
    if user is None:
        logger.warning("Login failed: unknown email %s", clean_email)
        return None
    if not verify_password(password, user.hashed_password):
        logger.warning("Login failed: wrong password for %s", clean_email)
        return None
    if not user.is_active:
        logger.warning("Login failed: inactive account %s", clean_email)
        return None
    return user


def generate_tokens(
    user: User,
    accessible_companies: list | None = None,
    company_group_id: str | None = None,
    override_company_id: str | None = None,
    override_role: str | None = None,
    override_permissions: dict | None = None,
) -> dict:
    token_data = {
        "sub": str(user.id),
        "company_id": override_company_id or str(user.company_id),
        "role": override_role or user.role,
        "permissions": override_permissions or user.permissions or {},
    }
    if accessible_companies:
        token_data["accessible_companies"] = accessible_companies
    if company_group_id:
        token_data["company_group_id"] = company_group_id
    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "token_type": "bearer",
    }


async def generate_tokens_with_context(db: AsyncSession, user: User) -> dict:
    """Generate tokens with full multi-company context."""
    memberships = (await db.execute(
        select(UserCompanyMembership).where(UserCompanyMembership.user_id == user.id)
    )).scalars().all()
    accessible = [str(m.company_id) for m in memberships]

    company = (await db.execute(
        select(Company).where(Company.id == user.company_id)
    )).scalar_one()
    group_id = str(company.company_group_id) if company.company_group_id else None

    return generate_tokens(user, accessible_companies=accessible, company_group_id=group_id)


async def switch_company(db: AsyncSession, user: User, target_company_id: UUID) -> dict:
    """Switch the user's active company context and return new tokens.
    CRITICAL: We build token data from the membership directly — never
    mutate the persistent User entity to avoid accidental DB writes.
    """
    membership = (await db.execute(
        select(UserCompanyMembership)
        .where(UserCompanyMembership.user_id == user.id)
        .where(UserCompanyMembership.company_id == target_company_id)
    )).scalar_one_or_none()

    if not membership:
        raise HTTPException(status_code=403, detail="No access to this company")

    # Load accessible companies and group context for the TARGET company
    all_memberships = (await db.execute(
        select(UserCompanyMembership).where(UserCompanyMembership.user_id == user.id)
    )).scalars().all()
    accessible = [str(m.company_id) for m in all_memberships]

    company = (await db.execute(
        select(Company).where(Company.id == target_company_id)
    )).scalar_one()
    group_id = str(company.company_group_id) if company.company_group_id else None

    # Build tokens from membership data — do NOT mutate the User object
    return generate_tokens(
        user=user,
        accessible_companies=accessible,
        company_group_id=group_id,
        override_company_id=str(target_company_id),
        override_role=membership.role,
        override_permissions=membership.permissions,
    )


async def get_user_companies(db: AsyncSession, user_id: UUID) -> list[dict]:
    """Load all companies a user has access to, with their role in each."""
    rows = (await db.execute(
        select(UserCompanyMembership, Company)
        .join(Company, UserCompanyMembership.company_id == Company.id)
        .where(UserCompanyMembership.user_id == user_id)
        .order_by(UserCompanyMembership.is_default.desc(), Company.name)
    )).all()
    return [
        {
            "id": str(m.UserCompanyMembership.company_id),
            "name": m.Company.name,
            "role": m.UserCompanyMembership.role,
            "is_default": m.UserCompanyMembership.is_default,
            "entity_prefix": m.Company.entity_prefix,
            "company_group_id": str(m.Company.company_group_id) if m.Company.company_group_id else None,
        }
        for m in rows
    ]


async def refresh_access_token(db: AsyncSession, refresh_token: str) -> dict | None:
    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != "refresh":
        return None

    user_id = payload.get("sub")
    if user_id is None:
        return None

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        return None

    return await generate_tokens_with_context(db, user)
