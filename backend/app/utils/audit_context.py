"""Session-scoped audit context for automatic audit logging.

Routes set the context via `set_audit_context(db, user_id, ip)`.
ORM event listeners pick it up and write to `audit_log` automatically.
"""
from __future__ import annotations

from contextvars import ContextVar
from uuid import UUID

_audit_user_id: ContextVar[UUID | None] = ContextVar("audit_user_id", default=None)
_audit_ip: ContextVar[str | None] = ContextVar("audit_ip", default=None)
_audit_company_id: ContextVar[UUID | None] = ContextVar("audit_company_id", default=None)


def set_audit_context(
    company_id: UUID | None = None,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> None:
    _audit_company_id.set(company_id)
    _audit_user_id.set(user_id)
    _audit_ip.set(ip_address)


def get_audit_context() -> tuple:
    return _audit_company_id.get(), _audit_user_id.get(), _audit_ip.get()
