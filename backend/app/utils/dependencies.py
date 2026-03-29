from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.models.user import User
from app.utils.security import decode_token
from app.utils.permissions import Module, AccessLevel, has_access, SUPER_ADMIN, ADMIN

security_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_token(token)

    if payload is None or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    return user


def require_role(*roles: str):
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user

    return role_checker


def require_permission(module: Module, level: AccessLevel):
    """FastAPI dependency that checks module-level permission."""
    async def checker(current_user: User = Depends(get_current_user)) -> User:
        if not has_access(current_user, module, level):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No {level.value} access to {module.value}",
            )
        return current_user

    return checker


def require_admin():
    """Only SUPER_ADMIN and ADMIN can access (for user management)."""
    async def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in (SUPER_ADMIN, ADMIN):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
        return current_user

    return checker
