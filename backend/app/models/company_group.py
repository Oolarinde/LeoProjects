from __future__ import annotations
from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy import (
    Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer,
    Numeric, String, Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from database import Base


class CompanyGroup(Base):
    __tablename__ = "company_groups"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    fiscal_year_end: Mapped[int] = mapped_column(Integer, nullable=False, default=12)
    base_currency: Mapped[str] = mapped_column(String(3), nullable=False, default="NGN")
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True,
    )
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    members = relationship("CompanyGroupMember", back_populates="company_group", cascade="all, delete-orphan")
    companies = relationship("Company", back_populates="company_group")
    allocation_rules = relationship("AllocationRule", back_populates="company_group", cascade="all, delete-orphan")
    coa_template = relationship("GroupCoATemplate", back_populates="company_group", cascade="all, delete-orphan")


class CompanyGroupMember(Base):
    __tablename__ = "company_group_members"
    __table_args__ = (
        UniqueConstraint("company_group_id", "company_id", name="uq_cgm_group_company"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("company_groups.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, unique=True, index=True,
    )
    parent_company_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True,
    )
    is_parent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    ownership_pct: Mapped[Numeric] = mapped_column(
        Numeric(5, 2), nullable=False, default=100.00,
    )
    joined_at = mapped_column(DateTime(timezone=True), server_default=func.now())

    company_group = relationship("CompanyGroup", back_populates="members")
    company = relationship("Company", foreign_keys=[company_id])
    parent_company = relationship("Company", foreign_keys=[parent_company_id])
