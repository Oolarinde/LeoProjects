from __future__ import annotations
from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

from app.routes import auth, users, groups
from app.routes import config as config_routes
from app.routes import dashboard as dashboard_routes
from app.routes import reference as reference_routes
from app.routes import audit as audit_routes
from app.routes import revenue as revenue_routes
from app.routes import expenses as expenses_routes
from app.routes.payroll import router as payroll_router
from app.routes.settings import accounts as accounts_routes
from app.routes.settings import locations as locations_routes
from app.routes.settings import units as units_routes
from app.routes.settings import employees as employees_routes
from app.routes.settings import reference_data as reference_data_routes
from app.utils.config import settings
from app.utils.audit_context import set_audit_context
from app.utils.request_context import get_client_ip
from app.utils.security import decode_token


class AuditContextMiddleware(BaseHTTPMiddleware):
    """Extract user_id and company_id from JWT and set audit context per request."""

    async def dispatch(self, request: Request, call_next):
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            payload = decode_token(token)
            if payload and payload.get("type") == "access":
                user_id = payload.get("sub")
                company_id = payload.get("company_id")
                set_audit_context(
                    company_id=UUID(company_id) if company_id else None,
                    user_id=UUID(user_id) if user_id else None,
                    ip_address=get_client_ip(request),
                )
        response = await call_next(request)
        set_audit_context(None, None, None)
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.utils.audit_listener import register_audit_listeners
    register_audit_listeners()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    lifespan=lifespan,
)

# Share the limiter instance created in auth routes with the app
app.state.limiter = auth.limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Audit context — extracts user from JWT on every request
app.add_middleware(AuditContextMiddleware)

# Serve uploaded files (avatars, etc.)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(groups.router, prefix="/api/groups", tags=["groups"])
app.include_router(payroll_router, prefix="/api/payroll", tags=["payroll"])
app.include_router(config_routes.router, prefix="/api/config", tags=["config"])
app.include_router(dashboard_routes.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(reference_routes.router, prefix="/api/reference", tags=["reference"])
app.include_router(revenue_routes.router, prefix="/api/revenue", tags=["revenue"])
app.include_router(expenses_routes.router, prefix="/api/expenses", tags=["expenses"])
app.include_router(audit_routes.router, prefix="/api/audit", tags=["audit"])
app.include_router(accounts_routes.router, prefix="/api/settings/accounts", tags=["settings"])
app.include_router(locations_routes.router, prefix="/api/settings/locations", tags=["settings"])
app.include_router(units_routes.router, prefix="/api/settings/units", tags=["settings"])
app.include_router(employees_routes.router, prefix="/api/settings/employees", tags=["settings"])
app.include_router(reference_data_routes.router, prefix="/api/settings/reference-data", tags=["settings"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
