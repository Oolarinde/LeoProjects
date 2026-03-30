"""Budget schemas."""
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class BudgetCell(BaseModel):
    """A single month's budget amount for a category."""
    category: str
    month: int  # 1–12
    amount: Decimal = Decimal(0)
    notes: Optional[str] = None


class BudgetBulkUpsert(BaseModel):
    """Bulk upsert: set all budget cells for a year + line_type."""
    year: int
    line_type: str  # REVENUE or EXPENSE
    cells: List[BudgetCell]


class BudgetLineResponse(BaseModel):
    id: UUID
    year: int
    month: int
    category: str
    line_type: str
    amount: Decimal
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class BudgetGridRow(BaseModel):
    """One row in the budget grid = one category with 12 monthly amounts."""
    category: str
    monthly: List[Decimal]  # index 0 = Jan … 11 = Dec
    total: Decimal


class BudgetGridResponse(BaseModel):
    year: int
    line_type: str
    rows: List[BudgetGridRow]
    grand_total: Decimal
    categories: List[str]
