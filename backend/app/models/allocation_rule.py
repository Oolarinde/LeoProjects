from __future__ import annotations
from datetime import datetime
from decimal import Decimal
from typing import Optional
import uuid

from sqlalchemy import (
    Boolean, CheckConstraint, DateTime, ForeignKey, Index, Numeric,
    String, Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from database import Base


class AllocationRule(Base):
    __tablename__ = "allocation_rules"
    __table_args__ = (
        UniqueConstraint("company_group_id", "name", name="uq_allocation_rule_group_name"),
        CheckConstraint(
            "allocation_type IN ('PERCENTAGE', 'EQUAL', 'CUSTOM')",
            name="ck_allocation_type",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("company_groups.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    allocation_type: Mapped[str] = mapped_column(String(20), nullable=False, default="PERCENTAGE")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True,
    )
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    company_group = relationship("CompanyGroup", back_populates="allocation_rules")
    lines = relationship("AllocationRuleLine", back_populates="rule", cascade="all, delete-orphan")


class AllocationRuleLine(Base):
    __tablename__ = "allocation_rule_lines"
    __table_args__ = (
        UniqueConstraint("rule_id", "company_id", name="uq_arl_rule_company"),
        CheckConstraint("percentage >= 0 AND percentage <= 100", name="ck_arl_percentage_range"),
        Index("ix_arl_rule", "rule_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("allocation_rules.id", ondelete="CASCADE"), nullable=False,
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="RESTRICT"), nullable=False,
    )
    percentage: Mapped[Decimal] = mapped_column(Numeric(7, 4), nullable=False)

    rule = relationship("AllocationRule", back_populates="lines")
    company = relationship("Company")
