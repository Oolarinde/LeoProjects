from __future__ import annotations
from datetime import datetime
from decimal import Decimal
from typing import Optional
import uuid

from sqlalchemy import Date, String, Text, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from sqlalchemy import DateTime
from datetime import date

from database import Base


class Employee(Base):
    __tablename__ = "employees"
    __table_args__ = (
        UniqueConstraint("company_id", "employee_ref", name="uq_employees_company_employee_ref"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True)
    employee_ref: Mapped[str] = mapped_column(String(20), nullable=False)  # E001, E002, etc.
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    designation: Mapped[Optional[str]] = mapped_column(String(100))
    gender: Mapped[Optional[str]] = mapped_column(String(20))
    phone: Mapped[Optional[str]] = mapped_column(String(30))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    monthly_salary: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    status: Mapped[str] = mapped_column(String(20), default="Active")  # Active, Non Active

    # Extended profile fields
    photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    next_of_kin_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    next_of_kin_phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    next_of_kin_relationship: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    hire_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    supervisor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, unique=True)
    bank_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    bank_account_no: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    company = relationship("Company", back_populates="employees")
    supervisor = relationship("Employee", remote_side="Employee.id", foreign_keys=[supervisor_id])
    linked_user = relationship("User", foreign_keys=[user_id])
    cost_allocations = relationship("EmployeeCostAllocation", back_populates="employee", cascade="all, delete-orphan")
