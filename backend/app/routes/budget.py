"""Budget routes — grid view + bulk upsert."""
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from app.models.user import User
from app.schemas.budget import (
    BudgetBulkUpsert,
    BudgetGridResponse,
    BudgetGridRow,
    BudgetLineResponse,
)
from app.services.budget import (
    bulk_upsert,
    clear_budget,
    delete_budget_line,
    get_budget_grid,
)
from app.utils.dependencies import get_current_user, require_permission
from app.utils.permissions import Module, AccessLevel

_budget_write = Depends(require_permission(Module.BUDGET, AccessLevel.WRITE))

router = APIRouter()

EXPENSE_CATEGORIES = [
    "Salaries", "Construction", "Maintenance", "Utilities",
    "Inventory", "Administrative", "Loans & Advances",
    "Transportation", "IT & Communications", "Other",
]
REVENUE_CATEGORIES = [
    "Room Revenue", "Shop Rent", "Caution Fee Income",
    "Extra Charges", "Form & Legal Fees", "Other Income",
]


def _build_grid(
    lines: list, year: int, line_type: str, categories: list[str]
) -> BudgetGridResponse:
    """Transform flat budget lines into a category × month grid."""
    # Build lookup: (category, month) → amount
    lookup: dict[tuple[str, int], Decimal] = {}
    for line in lines:
        lookup[(line.category, line.month)] = line.amount

    rows: list[BudgetGridRow] = []
    grand_total = Decimal(0)

    for cat in categories:
        monthly = [lookup.get((cat, m + 1), Decimal(0)) for m in range(12)]
        total = sum(monthly)
        grand_total += total
        rows.append(BudgetGridRow(category=cat, monthly=monthly, total=total))

    # Include any extra categories not in the default list
    extra_cats = {line.category for line in lines} - set(categories)
    for cat in sorted(extra_cats):
        monthly = [lookup.get((cat, m + 1), Decimal(0)) for m in range(12)]
        total = sum(monthly)
        grand_total += total
        rows.append(BudgetGridRow(category=cat, monthly=monthly, total=total))
        categories.append(cat)

    return BudgetGridResponse(
        year=year,
        line_type=line_type,
        rows=rows,
        grand_total=grand_total,
        categories=categories,
    )


@router.get("/grid", response_model=BudgetGridResponse)
def get_grid(
    year: int = Query(...),
    line_type: str = Query("EXPENSE"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the budget grid for a year and line type."""
    lt = line_type.upper()
    if lt not in ("REVENUE", "EXPENSE"):
        raise HTTPException(status_code=422, detail="line_type must be REVENUE or EXPENSE")

    lines = get_budget_grid(db, current_user.company_id, year, lt)
    cats = EXPENSE_CATEGORIES if lt == "EXPENSE" else REVENUE_CATEGORIES
    return _build_grid(lines, year, lt, list(cats))


@router.put("/bulk", status_code=200)
def bulk_save(
    body: BudgetBulkUpsert,
    current_user: User = _budget_write,
    db: Session = Depends(get_db),
):
    """Bulk upsert budget cells for a year/line_type."""
    lt = body.line_type.upper()
    if lt not in ("REVENUE", "EXPENSE"):
        raise HTTPException(status_code=422, detail="line_type must be REVENUE or EXPENSE")

    count = bulk_upsert(
        db,
        company_id=current_user.company_id,
        user_id=current_user.id,
        year=body.year,
        line_type=lt,
        cells=[c.model_dump() for c in body.cells],
    )
    db.commit()
    return {"upserted": count}


@router.delete("/{budget_id}", status_code=200)
def delete_line(
    budget_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a single budget line."""
    ok = delete_budget_line(db, current_user.company_id, budget_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Budget line not found")
    db.commit()
    return {"deleted": True}


@router.delete("/clear/", status_code=200)
def clear_all(
    year: int = Query(...),
    line_type: str = Query("EXPENSE"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete all budget lines for a year/type."""
    lt = line_type.upper()
    count = clear_budget(db, current_user.company_id, year, lt)
    db.commit()
    return {"deleted": count}
