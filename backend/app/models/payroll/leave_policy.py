from __future__ import annotations
from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy import Boolean, Integer, String, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from database import Base


class LeavePolicy(Base):
    __tablename__ = "leave_policies"
    __table_args__ = (UniqueConstraint("company_id", "leave_type", name="uq_leave_policies_company_type"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True
    )
    leave_type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # ANNUAL, SICK, CASUAL, MATERNITY, PATERNITY, UNPAID, COMPASSIONATE
    days_per_year: Mapped[int] = mapped_column(Integer, nullable=False)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=True)
    carry_over_allowed: Mapped[bool] = mapped_column(Boolean, default=False)
    max_carry_over_days: Mapped[Optional[int]] = mapped_column(Integer)
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    company = relationship("Company", back_populates="leave_policies")
