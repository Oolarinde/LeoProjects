from __future__ import annotations
from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

import logging
from sqlalchemy.exc import IntegrityError as SAIntegrityError
from pydantic import ValidationError as PydanticValidationError
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

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
from app.routes.reports import router as reports_router
from app.routes import ledger as ledger_routes
from app.routes import budget as budget_routes
from app.routes import analysis as analysis_routes
from app.routes import tenants as tenant_routes
from app.routes import company_groups as company_group_routes
from app.routes import intercompany as intercompany_routes
from app.routes import staff as staff_routes
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

_logger = logging.getLogger("app.errors")


@app.exception_handler(SAIntegrityError)
def integrity_error_handler(request: Request, exc: SAIntegrityError):
    """Convert SQLAlchemy IntegrityError into user-friendly 409 responses."""
    detail = str(exc.orig) if exc.orig else str(exc)
    _logger.warning("IntegrityError: %s", detail)
    # Extract the constraint name for a readable message
    if "unique" in detail.lower() or "duplicate" in detail.lower():
        # Try to extract the field from "Key (field)=(value) already exists"
        msg = "A record with this value already exists."
        if "entity_prefix" in detail:
            msg = "This entity prefix is already in use."
        elif "company_id" in detail and "name" in detail:
            msg = "This name is already taken."
        elif "email" in detail:
            msg = "This email address is already registered."
        elif "code" in detail:
            msg = "This code is already in use."
        return JSONResponse(status_code=409, content={"detail": msg})
    if "foreign key" in detail.lower() or "violates foreign key" in detail.lower():
        return JSONResponse(status_code=409, content={"detail": "Cannot complete this action — related records exist."})
    if "not-null" in detail.lower() or "null value" in detail.lower():
        return JSONResponse(status_code=422, content={"detail": "A required field is missing."})
    return JSONResponse(status_code=409, content={"detail": "Data conflict — please check your input."})


@app.exception_handler(RequestValidationError)
def validation_error_handler(request: Request, exc: RequestValidationError):
    """Convert Pydantic validation errors into readable 422 responses."""
    errors = exc.errors()
    messages = []
    for err in errors[:5]:  # Limit to 5 errors
        field = " → ".join(str(loc) for loc in err.get("loc", []) if str(loc) != "body")
        msg = err.get("msg", "Invalid value")
        messages.append(f"{field}: {msg}" if field else msg)
    return JSONResponse(status_code=422, content={"detail": "; ".join(messages) if messages else "Validation error"})


@app.exception_handler(500)
def internal_error_handler(request: Request, exc: Exception):
    """Catch unhandled 500 errors and return structured JSON instead of HTML."""
    _logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error. Please try again or contact support."})

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response


app.add_middleware(SecurityHeadersMiddleware)

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
app.include_router(reports_router, prefix="/api/reports", tags=["reports"])
app.include_router(ledger_routes.router, prefix="/api/ledger", tags=["ledger"])
app.include_router(budget_routes.router, prefix="/api/budget", tags=["budget"])
app.include_router(analysis_routes.router, prefix="/api/analysis", tags=["analysis"])
app.include_router(tenant_routes.router, prefix="/api/tenants", tags=["tenants"])
app.include_router(company_group_routes.router, prefix="/api/company-groups", tags=["company-groups"])
app.include_router(intercompany_routes.router, prefix="/api/intercompany", tags=["intercompany"])
app.include_router(staff_routes.router, prefix="/api/staff", tags=["staff"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
