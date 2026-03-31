from __future__ import annotations
import logging
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from app.models.user import User
from app.models.user_company_membership import UserCompanyMembership
from app.utils.security import decode_token
from app.utils.permissions import Module, AccessLevel, has_access, SUPER_ADMIN, ADMIN

logger = logging.getLogger(__name__)
security_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_token(token)

    if payload is None or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    result = db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    # Company context override — enables multi-company switching.
    # If the JWT contains a company_id different from the user's default,
    # validate against user_company_memberships and override the context.
    # CRITICAL: We expunge the user from the session BEFORE mutating to
    # prevent SQLAlchemy from flushing the override back to the users table.
    active_company_id = payload.get("company_id")
    if active_company_id and str(active_company_id) != str(user.company_id):
        active_cid = UUID(active_company_id)
        membership = (db.execute(
            select(UserCompanyMembership)
            .where(UserCompanyMembership.user_id == user.id)
            .where(UserCompanyMembership.company_id == active_cid)
        )).scalar_one_or_none()
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No access to this company",
            )
        # Detach from session to prevent accidental DB writes
        db.expunge(user)
        # Override user context for this request only (in-memory, not persisted)
        user.company_id = membership.company_id
        user.role = membership.role
        user.permissions = membership.permissions
        user.group_id = membership.group_id

    return user


def require_role(*roles: str):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user

    return role_checker


def require_permission(module: Module, level: AccessLevel):
    """FastAPI dependency that checks module-level permission."""
    def checker(current_user: User = Depends(get_current_user)) -> User:
        if not has_access(current_user, module, level):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No {level.value} access to {module.value}",
            )
        return current_user

    return checker


def require_admin():
    """Only SUPER_ADMIN and ADMIN can access (for user management)."""
    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in (SUPER_ADMIN, ADMIN):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
        return current_user

    return checker
