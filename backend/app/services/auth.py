from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Company
from app.models.user import User
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.utils.permissions import SUPER_ADMIN, get_default_permissions


async def register_user(
    db: AsyncSession, email: str, password: str, full_name: str, company_name: str
) -> tuple[User, Company]:
    company = Company(name=company_name)
    db.add(company)
    await db.flush()

    user = User(
        company_id=company.id,
        email=email.lower().strip(),
        hashed_password=hash_password(password),
        full_name=full_name,
        role=SUPER_ADMIN,
        permissions=get_default_permissions(SUPER_ADMIN),
    )
    db.add(user)
    await db.flush()
    return user, company


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email.lower().strip()))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
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
