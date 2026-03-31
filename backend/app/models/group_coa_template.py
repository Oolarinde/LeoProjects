from __future__ import annotations
from typing import Optional
import uuid

from sqlalchemy import (
    Boolean, CheckConstraint, String, Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey

from database import Base


class GroupCoATemplate(Base):
    __tablename__ = "group_coa_template"
    __table_args__ = (
        UniqueConstraint("company_group_id", "code", name="uq_gcoa_group_code"),
        CheckConstraint(
            "type IN ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense')",
            name="ck_gcoa_type",
        ),
        CheckConstraint(
            "normal_balance IN ('Dr', 'Cr')",
            name="ck_gcoa_normal_balance",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("company_groups.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    code: Mapped[str] = mapped_column(String(10), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    normal_balance: Mapped[str] = mapped_column(String(2), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    is_intercompany: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    cost_centre: Mapped[Optional[str]] = mapped_column(String(10))

    company_group = relationship("CompanyGroup", back_populates="coa_template")
