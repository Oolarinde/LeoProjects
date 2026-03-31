from __future__ import annotations
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
import uuid

from sqlalchemy import (
    ForeignKey, Numeric, UniqueConstraint, TIMESTAMP,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from database import Base


class PayrollItem(Base):
    __tablename__ = "payroll_items"
    __table_args__ = (
        UniqueConstraint("payroll_run_id", "employee_id", name="uq_payroll_item_run_employee"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payroll_run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("payroll_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)

    # Pay breakdown
    basic_salary: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal(0))
    total_allowances: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal(0))
    gross_pay: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal(0))
    cra: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal(0))
    taxable_income_annual: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal(0))

    # Deductions
    paye_tax: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal(0))
    pension_employee: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal(0))
    pension_employer: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal(0))
    nhf: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal(0))
    nsitf: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal(0))
    other_deductions: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal(0))
    total_deductions: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal(0))
    net_pay: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal(0))

    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    run: Mapped["PayrollRun"] = relationship("PayrollRun", back_populates="items")
    employee = relationship("Employee")
    company = relationship("Company", foreign_keys=[company_id])
    lines: Mapped[List["PayrollItemLine"]] = relationship("PayrollItemLine", back_populates="item", cascade="all, delete-orphan")
