from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
import uuid

from sqlalchemy import (
    Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, Integer,
    Numeric, String, Text, TIMESTAMP,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from database import Base


class RevenueTransaction(Base):
    __tablename__ = "revenue_transactions"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_revenue_amount_positive"),
        Index("ix_revenue_company_year", "company_id", "fiscal_year"),
        Index("ix_revenue_date", "date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True)
    location_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("locations.id"), nullable=False, index=True)
    unit_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("units.id"), nullable=True)
    account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    payment_method: Mapped[Optional[str]] = mapped_column(String(30))
    reference_no: Mapped[Optional[str]] = mapped_column(String(50))
    description: Mapped[Optional[str]] = mapped_column(Text)
    tenant_name: Mapped[Optional[str]] = mapped_column(String(200))
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Audit: void instead of delete (LEDGER P0)
    is_voided: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    void_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    voided_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    voided_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    # Deposit flag: caution deposits are liabilities, not earned revenue (LEDGER P2)
    is_deposit: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    company = relationship("Company")
    location = relationship("Location")
    unit = relationship("Unit")
    account = relationship("Account")
