from __future__ import annotations
"""CRUD services for allowance types, deduction types, tax brackets, and leave policies."""

import uuid
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payroll.allowance_type import AllowanceType
from app.models.payroll.deduction_type import DeductionType
from app.models.payroll.tax_bracket import TaxBracket
from app.models.payroll.leave_policy import LeavePolicy


# ── Allowance Types ──────────────────────────────────────────────


async def list_allowance_types(db: AsyncSession, company_id: UUID) -> list[AllowanceType]:
    result = await db.execute(
        select(AllowanceType)
        .where(AllowanceType.company_id == company_id)
        .order_by(AllowanceType.sort_order, AllowanceType.name)
    )
    return list(result.scalars().all())


async def create_allowance_type(
    db: AsyncSession, company_id: UUID, data: dict
) -> AllowanceType:
    existing = await db.execute(
        select(AllowanceType).where(
            AllowanceType.company_id == company_id,
            AllowanceType.code == data["code"],
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Allowance type with code '{data['code']}' already exists",
        )
    item = AllowanceType(id=uuid.uuid4(), company_id=company_id, **data)
    db.add(item)
    await db.flush()
    return item


async def update_allowance_type(
    db: AsyncSession, item_id: UUID, company_id: UUID, data: dict
) -> AllowanceType:
    result = await db.execute(
        select(AllowanceType).where(
            AllowanceType.id == item_id, AllowanceType.company_id == company_id
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allowance type not found")
    if "code" in data and data["code"] is not None and data["code"] != item.code:
        dup = await db.execute(
            select(AllowanceType).where(
                AllowanceType.company_id == company_id,
                AllowanceType.code == data["code"],
                AllowanceType.id != item_id,
            )
        )
        if dup.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Allowance type with code '{data['code']}' already exists",
            )
    for key, value in data.items():
        if value is not None and hasattr(item, key):
            setattr(item, key, value)
    await db.flush()
    return item


async def delete_allowance_type(db: AsyncSession, item_id: UUID, company_id: UUID) -> None:
    result = await db.execute(
        select(AllowanceType).where(
            AllowanceType.id == item_id, AllowanceType.company_id == company_id
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allowance type not found")
    await db.delete(item)
    await db.flush()


# ── Deduction Types ──────────────────────────────────────────────


async def list_deduction_types(db: AsyncSession, company_id: UUID) -> list[DeductionType]:
    result = await db.execute(
        select(DeductionType)
        .where(DeductionType.company_id == company_id)
        .order_by(DeductionType.sort_order, DeductionType.name)
    )
    return list(result.scalars().all())


async def create_deduction_type(
    db: AsyncSession, company_id: UUID, data: dict
) -> DeductionType:
    existing = await db.execute(
        select(DeductionType).where(
            DeductionType.company_id == company_id,
            DeductionType.code == data["code"],
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Deduction type with code '{data['code']}' already exists",
        )
    item = DeductionType(id=uuid.uuid4(), company_id=company_id, **data)
    db.add(item)
    await db.flush()
    return item


async def update_deduction_type(
    db: AsyncSession, item_id: UUID, company_id: UUID, data: dict
) -> DeductionType:
    result = await db.execute(
        select(DeductionType).where(
            DeductionType.id == item_id, DeductionType.company_id == company_id
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deduction type not found")
    if "code" in data and data["code"] is not None and data["code"] != item.code:
        dup = await db.execute(
            select(DeductionType).where(
                DeductionType.company_id == company_id,
                DeductionType.code == data["code"],
                DeductionType.id != item_id,
            )
        )
        if dup.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Deduction type with code '{data['code']}' already exists",
            )
    for key, value in data.items():
        if value is not None and hasattr(item, key):
            setattr(item, key, value)
    await db.flush()
    return item


async def delete_deduction_type(db: AsyncSession, item_id: UUID, company_id: UUID) -> None:
    result = await db.execute(
        select(DeductionType).where(
            DeductionType.id == item_id, DeductionType.company_id == company_id
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deduction type not found")
    await db.delete(item)
    await db.flush()


# ── Tax Brackets ─────────────────────────────────────────────────


async def list_tax_brackets(db: AsyncSession, company_id: UUID) -> list[TaxBracket]:
    result = await db.execute(
        select(TaxBracket)
        .where(TaxBracket.company_id == company_id)
        .order_by(TaxBracket.sort_order, TaxBracket.lower_bound)
    )
    return list(result.scalars().all())


async def replace_tax_brackets(
    db: AsyncSession, company_id: UUID, brackets: list[dict]
) -> list[TaxBracket]:
    """Replace all tax brackets for a company (atomic swap)."""
    await db.execute(
        delete(TaxBracket).where(TaxBracket.company_id == company_id)
    )
    new_items = []
    for i, b in enumerate(brackets):
        item = TaxBracket(
            id=uuid.uuid4(),
            company_id=company_id,
            lower_bound=b["lower_bound"],
            upper_bound=b.get("upper_bound"),
            rate_pct=b["rate_pct"],
            sort_order=b.get("sort_order", i),
        )
        db.add(item)
        new_items.append(item)
    await db.flush()
    return new_items


# ── Leave Policies ───────────────────────────────────────────────


async def list_leave_policies(db: AsyncSession, company_id: UUID) -> list[LeavePolicy]:
    result = await db.execute(
        select(LeavePolicy)
        .where(LeavePolicy.company_id == company_id)
        .order_by(LeavePolicy.leave_type)
    )
    return list(result.scalars().all())


async def create_leave_policy(
    db: AsyncSession, company_id: UUID, data: dict
) -> LeavePolicy:
    existing = await db.execute(
        select(LeavePolicy).where(
            LeavePolicy.company_id == company_id,
            LeavePolicy.leave_type == data["leave_type"],
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Leave policy for '{data['leave_type']}' already exists",
        )
    item = LeavePolicy(id=uuid.uuid4(), company_id=company_id, **data)
    db.add(item)
    await db.flush()
    return item


async def update_leave_policy(
    db: AsyncSession, item_id: UUID, company_id: UUID, data: dict
) -> LeavePolicy:
    result = await db.execute(
        select(LeavePolicy).where(
            LeavePolicy.id == item_id, LeavePolicy.company_id == company_id
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave policy not found")
    for key, value in data.items():
        if value is not None and hasattr(item, key):
            setattr(item, key, value)
    await db.flush()
    return item


async def delete_leave_policy(db: AsyncSession, item_id: UUID, company_id: UUID) -> None:
    result = await db.execute(
        select(LeavePolicy).where(
            LeavePolicy.id == item_id, LeavePolicy.company_id == company_id
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave policy not found")
    await db.delete(item)
    await db.flush()


# ── Seed Nigerian Defaults ───────────────────────────────────────


async def seed_payroll_defaults(db: AsyncSession, company_id: UUID) -> None:
    """Seed default allowance types, deduction types, tax brackets, and leave policies
    for a newly registered company. Called during company registration."""

    # Default allowance types
    allowances = [
        {"name": "Housing Allowance", "code": "HSG", "is_taxable": True, "sort_order": 1},
        {"name": "Transport Allowance", "code": "TRN", "is_taxable": True, "sort_order": 2},
        {"name": "Meal Allowance", "code": "MEL", "is_taxable": True, "sort_order": 3},
        {"name": "Medical Allowance", "code": "MED", "is_taxable": False, "sort_order": 4},
        {"name": "Utility Allowance", "code": "UTL", "is_taxable": True, "sort_order": 5},
        {"name": "Leave Allowance", "code": "LVA", "is_taxable": True, "sort_order": 6},
    ]
    for a in allowances:
        db.add(AllowanceType(id=uuid.uuid4(), company_id=company_id, **a))

    # Default deduction types
    deductions = [
        {"name": "PAYE Tax", "code": "PAYE", "is_statutory": True, "calculation_method": "TAX_TABLE", "sort_order": 1},
        {"name": "Employee Pension", "code": "PEN_EE", "is_statutory": True, "calculation_method": "PERCENTAGE_BASIC", "default_value": 8.00, "sort_order": 2},
        {"name": "National Housing Fund", "code": "NHF", "is_statutory": True, "calculation_method": "PERCENTAGE_BASIC", "default_value": 2.50, "sort_order": 3},
        {"name": "NSITF", "code": "NSITF", "is_statutory": True, "calculation_method": "PERCENTAGE_BASIC", "default_value": 1.00, "sort_order": 4},
        {"name": "Loan Repayment", "code": "LOAN", "is_statutory": False, "calculation_method": "FIXED", "sort_order": 5},
    ]
    for d in deductions:
        db.add(DeductionType(id=uuid.uuid4(), company_id=company_id, **d))

    # Nigerian PAYE progressive tax brackets (annual)
    brackets = [
        {"lower_bound": 0, "upper_bound": 300_000, "rate_pct": 7, "sort_order": 1},
        {"lower_bound": 300_000, "upper_bound": 600_000, "rate_pct": 11, "sort_order": 2},
        {"lower_bound": 600_000, "upper_bound": 1_100_000, "rate_pct": 15, "sort_order": 3},
        {"lower_bound": 1_100_000, "upper_bound": 1_600_000, "rate_pct": 19, "sort_order": 4},
        {"lower_bound": 1_600_000, "upper_bound": 3_200_000, "rate_pct": 21, "sort_order": 5},
        {"lower_bound": 3_200_000, "upper_bound": None, "rate_pct": 24, "sort_order": 6},
    ]
    for b in brackets:
        db.add(TaxBracket(id=uuid.uuid4(), company_id=company_id, **b))

    # Default leave policies
    policies = [
        {"leave_type": "ANNUAL", "days_per_year": 15, "is_paid": True, "carry_over_allowed": True, "max_carry_over_days": 5},
        {"leave_type": "SICK", "days_per_year": 10, "is_paid": True},
        {"leave_type": "CASUAL", "days_per_year": 5, "is_paid": True},
        {"leave_type": "MATERNITY", "days_per_year": 84, "is_paid": True},
        {"leave_type": "PATERNITY", "days_per_year": 14, "is_paid": True},
        {"leave_type": "UNPAID", "days_per_year": 365, "is_paid": False},
    ]
    for p in policies:
        db.add(LeavePolicy(id=uuid.uuid4(), company_id=company_id, **p))

    await db.flush()
