import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select
from uuid import UUID

from database import get_db
from app.models.user import User
from app.models.company_group import CompanyGroup
from app.schemas.schemas import (
    LanguageUpdate,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    SwitchCompanyRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth import (
    authenticate_user, generate_tokens_with_context, get_user_companies,
    refresh_access_token, register_user, switch_company,
)
from app.services.login_sessions import list_sessions, record_login
from app.schemas.login_session import LoginHistoryResponse
from app.utils.dependencies import get_current_user
from app.utils.request_context import get_client_ip

logger = logging.getLogger(__name__)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/15minutes")
async def register(request: Request, body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user, _company = await register_user(
        db,
        email=body.email,
        password=body.password,
        full_name=body.full_name,
        company_name=body.company_name,
    )
    return await generate_tokens_with_context(db, user)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("30/15minutes")
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, body.email, body.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    await record_login(
        db,
        user=user,
        ip_address=get_client_ip(request),
        user_agent_str=request.headers.get("user-agent", ""),
    )
    return await generate_tokens_with_context(db, user)


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("30/15minutes")
async def refresh(request: Request, body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    tokens = await refresh_access_token(db, body.refresh_token)
    if tokens is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")
    return tokens


@router.post("/switch-company", response_model=TokenResponse)
@limiter.limit("10/minute")
async def switch_company_endpoint(
    request: Request,
    body: SwitchCompanyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    logger.info(
        "Company switch",
        extra={
            "user_id": str(current_user.id),
            "from_company": str(current_user.company_id),
            "to_company": str(body.company_id),
        },
    )
    return await switch_company(db, current_user, body.company_id)


@router.get("/me")
async def me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from app.models.company_group import CompanyGroupMember

    companies = await get_user_companies(db, current_user.id)
    user_data = UserResponse.model_validate(current_user).model_dump()
    user_data["companies"] = companies if len(companies) > 1 else []
    # Find the group ID from the active company
    company_group_id = None
    for c in companies:
        if c["id"] == str(current_user.company_id) and c.get("company_group_id"):
            company_group_id = c["company_group_id"]
            break
    user_data["company_group_id"] = company_group_id
    # Also load the group name so the frontend can display it
    company_group_name = None
    if company_group_id:
        group = (await db.execute(
            select(CompanyGroup).where(CompanyGroup.id == UUID(company_group_id))
        )).scalar_one_or_none()
        if group:
            company_group_name = group.name
    user_data["company_group_name"] = company_group_name

    # Determine if current company is the parent in its group
    is_parent = False
    if company_group_id:
        parent_check = (await db.execute(
            select(CompanyGroupMember).where(
                CompanyGroupMember.company_id == current_user.company_id,
                CompanyGroupMember.is_parent == True,
            )
        )).scalar_one_or_none()
        is_parent = parent_check is not None

    # Derive effective_role for frontend menu/routing
    if current_user.role in ("SUPER_ADMIN", "GROUP_ADMIN"):
        effective_role = "GROUP_ADMIN" if is_parent else "COMPANY_ADMIN"
    elif current_user.role in ("ADMIN", "COMPANY_ADMIN"):
        effective_role = "COMPANY_ADMIN"
    else:
        effective_role = "VIEWER"

    user_data["effective_role"] = effective_role
    user_data["is_parent_company"] = is_parent
    return user_data


@router.get("/me/login-history", response_model=LoginHistoryResponse)
async def login_history(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await list_sessions(db, current_user.id, current_user.company_id, limit=limit, offset=offset)
    return LoginHistoryResponse(items=items, total=total)


@router.patch("/me/language", response_model=UserResponse)
async def update_language(
    body: LanguageUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.preferred_language = body.preferred_language
    await db.flush()
    return current_user


@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import os
    import uuid as _uuid
    from app.utils.config import settings as app_settings

    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" not in content_type:
        raise HTTPException(status_code=400, detail="Expected multipart/form-data")

    form = await request.form()
    file = form.get("avatar")
    if file is None:
        raise HTTPException(status_code=400, detail="No avatar file provided")

    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are allowed")

    data = await file.read()
    MAX_SIZE = 2 * 1024 * 1024  # 2 MB
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File size must be under 2 MB")

    ext = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}[file.content_type]
    filename = f"avatar_{current_user.id}_{_uuid.uuid4().hex[:8]}{ext}"
    avatar_dir = os.path.join(app_settings.UPLOAD_DIR, "avatars")
    os.makedirs(avatar_dir, exist_ok=True)
    filepath = os.path.join(avatar_dir, filename)

    # Remove old avatar file if it exists (path traversal safe)
    if current_user.avatar_url:
        old_filename = os.path.basename(current_user.avatar_url)
        old_path = os.path.join(avatar_dir, old_filename)
        if os.path.isfile(old_path):
            os.remove(old_path)

    with open(filepath, "wb") as f:
        f.write(data)

    current_user.avatar_url = f"/uploads/avatars/{filename}"
    await db.flush()
    return current_user
