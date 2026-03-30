"""Budget service — CRUD + grid operations."""
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import select, delete, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.budget_line import BudgetLine


async def get_budget_grid(
    db: AsyncSession,
    company_id: UUID,
    year: int,
    line_type: str,
) -> list[BudgetLine]:
    """Return all budget lines for a company/year/line_type."""
    result = await db.execute(
        select(BudgetLine)
        .where(
            BudgetLine.company_id == company_id,
            BudgetLine.year == year,
            BudgetLine.line_type == line_type,
        )
        .order_by(BudgetLine.category, BudgetLine.month)
    )
    return list(result.scalars().all())


async def bulk_upsert(
    db: AsyncSession,
    company_id: UUID,
    user_id: UUID,
    year: int,
    line_type: str,
    cells: list[dict],
) -> int:
    """Upsert budget cells. Returns count of upserted rows."""
    count = 0
    for cell in cells:
        category = cell["category"]
        month = cell["month"]
        amount = Decimal(str(cell["amount"]))
        notes = cell.get("notes")

        result = await db.execute(
            select(BudgetLine).where(
                BudgetLine.company_id == company_id,
                BudgetLine.year == year,
                BudgetLine.month == month,
                BudgetLine.category == category,
                BudgetLine.line_type == line_type,
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.amount = amount
            existing.notes = notes
            existing.updated_by = user_id
        else:
            db.add(BudgetLine(
                company_id=company_id,
                year=year,
                month=month,
                category=category,
                line_type=line_type,
                amount=amount,
                notes=notes,
                created_by=user_id,
            ))
        count += 1

    await db.flush()
    return count


async def delete_budget_line(
    db: AsyncSession,
    company_id: UUID,
    budget_id: UUID,
) -> bool:
    """Delete a single budget line. Returns True if found and deleted."""
    result = await db.execute(
        select(BudgetLine).where(
            BudgetLine.id == budget_id,
            BudgetLine.company_id == company_id,
        )
    )
    line = result.scalar_one_or_none()
    if line is None:
        return False
    await db.delete(line)
    await db.flush()
    return True


async def clear_budget(
    db: AsyncSession,
    company_id: UUID,
    year: int,
    line_type: str,
) -> int:
    """Delete all budget lines for a year/type. Returns count deleted."""
    result = await db.execute(
        delete(BudgetLine).where(
            BudgetLine.company_id == company_id,
            BudgetLine.year == year,
            BudgetLine.line_type == line_type,
        )
    )
    await db.flush()
    return result.rowcount
