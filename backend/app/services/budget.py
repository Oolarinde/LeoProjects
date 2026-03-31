"""Budget service — CRUD + grid operations."""
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import select, delete, and_
from sqlalchemy.orm import Session

from app.models.budget_line import BudgetLine


def get_budget_grid(
    db: Session,
    company_id: UUID,
    year: int,
    line_type: str,
) -> list[BudgetLine]:
    """Return all budget lines for a company/year/line_type."""
    result = db.execute(
        select(BudgetLine)
        .where(
            BudgetLine.company_id == company_id,
            BudgetLine.year == year,
            BudgetLine.line_type == line_type,
        )
        .order_by(BudgetLine.category, BudgetLine.month)
    )
    return list(result.scalars().all())


def bulk_upsert(
    db: Session,
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

        result = db.execute(
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

    db.flush()
    return count


def delete_budget_line(
    db: Session,
    company_id: UUID,
    budget_id: UUID,
) -> bool:
    """Delete a single budget line. Returns True if found and deleted."""
    result = db.execute(
        select(BudgetLine).where(
            BudgetLine.id == budget_id,
            BudgetLine.company_id == company_id,
        )
    )
    line = result.scalar_one_or_none()
    if line is None:
        return False
    db.delete(line)
    db.flush()
    return True


def clear_budget(
    db: Session,
    company_id: UUID,
    year: int,
    line_type: str,
) -> int:
    """Delete all budget lines for a year/type. Returns count deleted."""
    result = db.execute(
        delete(BudgetLine).where(
            BudgetLine.company_id == company_id,
            BudgetLine.year == year,
            BudgetLine.line_type == line_type,
        )
    )
    db.flush()
    return result.rowcount
