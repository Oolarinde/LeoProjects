from __future__ import annotations
from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy import Date, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from sqlalchemy import DateTime

from database import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[Optional[str]] = mapped_column(Text)

    # Group accounting fields
    company_group_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("company_groups.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    rc_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    tin: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    vat_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    entity_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    incorporation_date: Mapped[Optional[datetime]] = mapped_column(Date, nullable=True)
    entity_prefix: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)

    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    company_group = relationship("CompanyGroup", back_populates="companies", foreign_keys=[company_group_id])
    locations = relationship("Location", back_populates="company", cascade="all, delete-orphan")
    users = relationship("User", back_populates="company", cascade="all, delete-orphan", foreign_keys="[User.company_id]")
    accounts = relationship("Account", back_populates="company", cascade="all, delete-orphan")
    employees = relationship("Employee", back_populates="company", cascade="all, delete-orphan")
    reference_data = relationship("ReferenceData", back_populates="company", cascade="all, delete-orphan")
    groups = relationship("Group", back_populates="company", cascade="all, delete-orphan")
    payroll_settings = relationship("PayrollSettings", back_populates="company", uselist=False, cascade="all, delete-orphan")
    allowance_types = relationship("AllowanceType", back_populates="company", cascade="all, delete-orphan")
    deduction_types = relationship("DeductionType", back_populates="company", cascade="all, delete-orphan")
    tax_brackets = relationship("TaxBracket", back_populates="company", cascade="all, delete-orphan")
    leave_policies = relationship("LeavePolicy", back_populates="company", cascade="all, delete-orphan")
