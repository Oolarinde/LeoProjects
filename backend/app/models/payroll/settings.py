from __future__ import annotations
from datetime import datetime
from decimal import Decimal
from typing import Optional
import uuid

from sqlalchemy import Boolean, Integer, Numeric, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from database import Base


class PayrollSettings(Base):
    __tablename__ = "payroll_settings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, unique=True
    )
    pay_period: Mapped[str] = mapped_column(String(20), default="MONTHLY")
    pension_employee_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=8.00)
    pension_employer_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=10.00)
    nhf_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=2.50)
    nsitf_employee_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=1.00)
    tax_method: Mapped[str] = mapped_column(String(30), default="PAYE_PROGRESSIVE")
    enable_13th_month: Mapped[bool] = mapped_column(Boolean, default=False)
    fiscal_year_start_month: Mapped[int] = mapped_column(Integer, default=1)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    company = relationship("Company", back_populates="payroll_settings")
