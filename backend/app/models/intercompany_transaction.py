from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
import uuid

from sqlalchemy import (
    CheckConstraint, Date, DateTime, ForeignKey, Index, Integer,
    Numeric, String, Text, TIMESTAMP,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from database import Base


class IntercompanyTransaction(Base):
    __tablename__ = "intercompany_transactions"
    __table_args__ = (
        CheckConstraint(
            "source_company_id != target_company_id",
            name="ck_ic_different_companies",
        ),
        CheckConstraint("amount > 0", name="ck_ic_amount_positive"),
        CheckConstraint(
            "transaction_type IN ('LOAN', 'EXPENSE_RECHARGE', 'MANAGEMENT_FEE', "
            "'DIVIDEND', 'CAPITAL_INJECTION', 'SHARED_EXPENSE')",
            name="ck_ic_transaction_type",
        ),
        CheckConstraint(
            "status IN ('PENDING', 'CONFIRMED', 'ELIMINATED', 'VOIDED')",
            name="ck_ic_status",
        ),
        Index("ix_ic_txn_group_year", "company_group_id", "fiscal_year"),
        Index("ix_ic_txn_source", "source_company_id"),
        Index("ix_ic_txn_target", "target_company_id"),
        Index("ix_ic_txn_status", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("company_groups.id", ondelete="RESTRICT"), nullable=False,
    )
    source_company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="RESTRICT"), nullable=False,
    )
    target_company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="RESTRICT"), nullable=False,
    )
    transaction_type: Mapped[str] = mapped_column(String(50), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    reference_no: Mapped[Optional[str]] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")

    # Links to actual entries in each company's books
    source_expense_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("expense_transactions.id"), nullable=True,
    )
    source_revenue_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("revenue_transactions.id"), nullable=True,
    )
    target_expense_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("expense_transactions.id"), nullable=True,
    )
    target_revenue_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("revenue_transactions.id"), nullable=True,
    )

    # Audit
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    confirmed_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    voided_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    voided_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    void_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    company_group = relationship("CompanyGroup")
    source_company = relationship("Company", foreign_keys=[source_company_id])
    target_company = relationship("Company", foreign_keys=[target_company_id])
