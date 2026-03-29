from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.models.user import User
from app.schemas.schemas import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth import authenticate_user, generate_tokens, refresh_access_token, register_user
from app.utils.dependencies import get_current_user

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/15minutes")
async def register(request: RegisterRequest, req: Request, db: AsyncSession = Depends(get_db)):
    user, _company = await register_user(
        db,
        email=request.email,
        password=request.password,
        full_name=request.full_name,
        company_name=request.company_name,
    )
    return generate_tokens(user)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/15minutes")
async def login(request: LoginRequest, req: Request, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, request.email, request.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
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
