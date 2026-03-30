from __future__ import annotations
from datetime import datetime
from decimal import Decimal
from typing import Optional
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from database import Base


class EmployeeDeduction(Base):
    __tablename__ = "employee_deductions"
    __table_args__ = (UniqueConstraint("employee_id", "deduction_type_id", name="uq_emp_deduction"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    deduction_type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("deduction_types.id", ondelete="CASCADE"), nullable=False)
    override_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    employee = relationship("Employee")
    deduction_type = relationship("DeductionType")
    profile = relationship(
        "EmployeePayrollProfile",
        foreign_keys=[employee_id],
        primaryjoin="EmployeeDeduction.employee_id == EmployeePayrollProfile.employee_id",
        back_populates="deductions",
    )
