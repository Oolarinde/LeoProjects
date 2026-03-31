from __future__ import annotations
from decimal import Decimal
from typing import Optional
import uuid

from sqlalchemy import (
    CheckConstraint, DateTime, ForeignKey, Index, Numeric,
    String, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from database import Base


class EmployeeCostAllocation(Base):
    """Maps an employee's salary cost to one or more subsidiaries by percentage.

    Example: Accountant → TAM 40%, TSP 30%, THM 30%
    Example: TAM cleaner → TAM 100%

    Percentages for a given employee must sum to 100%.
    Enforced at the application layer (cross-row constraint).
    """
    __tablename__ = "employee_cost_allocations"
    __table_args__ = (
        UniqueConstraint("employee_id", "company_id", name="uq_eca_employee_company"),
        CheckConstraint("percentage > 0 AND percentage <= 100", name="ck_eca_percentage_range"),
        Index("ix_eca_employee", "employee_id"),
        Index("ix_eca_company", "company_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False,
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="RESTRICT"), nullable=False,
    )
    percentage: Mapped[Decimal] = mapped_column(Numeric(7, 4), nullable=False)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())

    employee = relationship("Employee")
    company = relationship("Company")
