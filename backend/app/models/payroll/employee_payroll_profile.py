from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
import uuid

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from database import Base


class EmployeePayrollProfile(Base):
    __tablename__ = "employee_payroll_profiles"
    __table_args__ = (UniqueConstraint("employee_id", name="uq_payroll_profile_employee"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    basic_salary: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    pay_grade: Mapped[Optional[str]] = mapped_column(String(20))
    bank_name: Mapped[Optional[str]] = mapped_column(String(100))
    bank_account_no: Mapped[Optional[str]] = mapped_column(String(30))
    bank_sort_code: Mapped[Optional[str]] = mapped_column(String(20))
    tax_id: Mapped[Optional[str]] = mapped_column(String(50))       # TIN
    pension_id: Mapped[Optional[str]] = mapped_column(String(50))   # PFA ID
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    employee = relationship("Employee")
    company = relationship("Company")
    allowances = relationship("EmployeeAllowance", back_populates="profile", cascade="all, delete-orphan", foreign_keys="[EmployeeAllowance.employee_id]", primaryjoin="EmployeePayrollProfile.employee_id == EmployeeAllowance.employee_id")
    deductions = relationship("EmployeeDeduction", back_populates="profile", cascade="all, delete-orphan", foreign_keys="[EmployeeDeduction.employee_id]", primaryjoin="EmployeePayrollProfile.employee_id == EmployeeDeduction.employee_id")
