from __future__ import annotations
"""Role-based access control: module registry, access levels, and permission helpers."""

from enum import Enum


class Module(str, Enum):
    DASHBOARD = "dashboard"
    REVENUE = "revenue"
    EXPENSES = "expenses"
    PAYROLL = "payroll"
    BUDGET = "budget"
    ANALYSIS = "analysis"
    LEDGER = "ledger"
    PNL = "pnl"
    CASHFLOW = "cashflow"
    BALANCE_SHEET = "balance_sheet"
    TRIAL_BALANCE = "trial_balance"
    ACCOUNTS = "accounts"
    EMPLOYEES = "employees"
    LOCATIONS = "locations"
    REFERENCE = "reference"
    GROUP = "group"


class AccessLevel(str, Enum):
    NONE = "none"
    READ = "read"
    WRITE = "write"


# Role constants — legacy (kept for backward compatibility)
SUPER_ADMIN = "SUPER_ADMIN"
ADMIN = "ADMIN"
STAFF = "STAFF"

# New group-aware roles
GROUP_ADMIN = "GROUP_ADMIN"
COMPANY_ADMIN = "COMPANY_ADMIN"
VIEWER = "VIEWER"

ALL_WRITE = {m.value: AccessLevel.WRITE.value for m in Module}
ALL_READ = {m.value: AccessLevel.READ.value for m in Module}

VALID_MODULE_SLUGS = {m.value for m in Module}
VALID_ACCESS_LEVELS = {a.value for a in AccessLevel}


def get_default_permissions(role: str) -> dict[str, str]:
    """Return default permissions dict for a given role."""
    if role in (SUPER_ADMIN, ADMIN, GROUP_ADMIN, COMPANY_ADMIN):
        return dict(ALL_WRITE)
    if role == VIEWER:
        return dict(ALL_READ)
    return {}  # STAFF gets nothing by default


def has_access(user, module: Module, required: AccessLevel) -> bool:
    """Check if user has at least the required access level for a module."""
    # Full-access roles
    if user.role in (SUPER_ADMIN, GROUP_ADMIN, COMPANY_ADMIN, ADMIN):
        return True
    # VIEWER / STAFF get read-only access
    if user.role in (VIEWER, STAFF):
        if required == AccessLevel.READ:
            return True
        return False
    # Fallback: check explicit permissions
    perm = (user.permissions or {}).get(module.value, "none")
    if required == AccessLevel.READ:
        return perm in ("read", "write")
    if required == AccessLevel.WRITE:
        return perm == "write"
    return False


def validate_permissions(permissions: dict[str, str]) -> dict[str, str]:
    """Validate and normalize a permissions dict. Raises ValueError on bad input."""
    cleaned = {}
    for key, value in permissions.items():
        if key not in VALID_MODULE_SLUGS:
            raise ValueError(f"Unknown module: {key}")
        if value not in VALID_ACCESS_LEVELS:
            raise ValueError(f"Invalid access level '{value}' for module '{key}'")
        if value != "none":
            cleaned[key] = value
    return cleaned
