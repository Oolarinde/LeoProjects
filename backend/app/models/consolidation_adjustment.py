from __future__ import annotations
from datetime import datetime
from decimal import Decimal
from typing import Optional
import uuid

from sqlalchemy import (
    Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer,
    Numeric, String, Text, TIMESTAMP,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from database import Base


class ConsolidationAdjustment(Base):
    __tablename__ = "consolidation_adjustments"
    __table_args__ = (
        CheckConstraint("debit_amount >= 0", name="ck_ca_debit_non_negative"),
        CheckConstraint("credit_amount >= 0", name="ck_ca_credit_non_negative"),
        CheckConstraint("debit_amount > 0 OR credit_amount > 0", name="ck_ca_not_both_zero"),
        CheckConstraint("debit_amount = 0 OR credit_amount = 0", name="ck_ca_not_both_nonzero"),
        CheckConstraint(
            "adjustment_type IN ('IC_ELIMINATION', 'POLICY_ALIGNMENT', 'MINORITY_INTEREST', "
            "'GOODWILL', 'UNREALISED_PROFIT', 'OTHER')",
            name="ck_ca_adjustment_type",
        ),
        Index("ix_ca_group_year", "company_group_id", "fiscal_year"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("company_groups.id", ondelete="RESTRICT"), nullable=False,
    )
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False)
    adjustment_type: Mapped[str] = mapped_column(String(50), nullable=False)
    account_code: Mapped[str] = mapped_column(String(10), nullable=False)
    debit_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    credit_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True,
    )
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Void instead of delete (LEDGER's sacred rule)
    is_voided: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    void_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    voided_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    voided_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    company_group = relationship("CompanyGroup")
