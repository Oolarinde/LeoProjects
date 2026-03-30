from __future__ import annotations
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.routes import auth, users, groups
from app.routes import config as config_routes
from app.routes import dashboard as dashboard_routes
from app.routes import reference as reference_routes
from app.routes import audit as audit_routes
from app.routes.payroll import router as payroll_router
from app.utils.config import settings

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    lifespan=lifespan,
)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(groups.router, prefix="/api/groups", tags=["groups"])
app.include_router(payroll_router, prefix="/api/payroll", tags=["payroll"])
app.include_router(config_routes.router, prefix="/api/config", tags=["config"])
app.include_router(dashboard_routes.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(reference_routes.router, prefix="/api/reference", tags=["reference"])
app.include_router(audit_routes.router, prefix="/api/audit", tags=["audit"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
