from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.models.user import User
from app.schemas.schemas import (
    LanguageUpdate,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth import authenticate_user, generate_tokens, refresh_access_token, register_user
from app.services.login_sessions import list_sessions, record_login
from app.schemas.login_session import LoginHistoryResponse
from app.utils.dependencies import get_current_user
from app.utils.request_context import get_client_ip

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
    return generate_tokens(user)


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
    return generate_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    tokens = await refresh_access_token(db, request.refresh_token)
    if tokens is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")
    return tokens


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


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
