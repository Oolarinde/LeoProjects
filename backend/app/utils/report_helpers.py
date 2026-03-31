"""Shared helpers for all report and dashboard SQL queries."""
from decimal import Decimal
from typing import Optional
from uuid import UUID


def loc_filter(alias: str, location_id: Optional[UUID]) -> str:
    """Return an extra AND clause if location_id is set, else empty string."""
    return f" AND {alias}.location_id = :loc_id" if location_id else ""


def not_voided(alias: str) -> str:
    """Return AND clause to exclude voided transactions."""
    return f" AND {alias}.is_voided = false"


def base_params(company_id: UUID, year: int, location_id: Optional[UUID]) -> dict:
    """Return base parameter dict for all report queries."""
    p: dict = {"cid": company_id, "year": year}
    if location_id:
        p["loc_id"] = location_id
    return p


def to_number(value) -> Decimal:
    """Coerce None / string DB results to Decimal safely."""
    if value is None:
        return Decimal(0)
    return Decimal(str(value))
