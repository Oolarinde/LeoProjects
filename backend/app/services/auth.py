from __future__ import annotations
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Company
from app.models.group import Group
from app.models.user import User
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


def generate_tokens(user: User) -> dict:
    token_data = {
        "sub": str(user.id),
        "company_id": str(user.company_id),
        "role": user.role,
        "permissions": user.permissions or {},
    }
    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "token_type": "bearer",
    }


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

    return generate_tokens(user)
