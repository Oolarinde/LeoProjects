from __future__ import annotations
from decimal import Decimal
import uuid

from sqlalchemy import CheckConstraint, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class PayrollItemLine(Base):
    __tablename__ = "payroll_item_lines"
    __table_args__ = (
        CheckConstraint("line_type IN ('ALLOWANCE','DEDUCTION')", name="ck_item_line_type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payroll_item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("payroll_items.id", ondelete="CASCADE"), nullable=False, index=True)
    line_type: Mapped[str] = mapped_column(String(20), nullable=False)  # ALLOWANCE or DEDUCTION
    type_code: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal(0))

    # Relationships
    item: Mapped["PayrollItem"] = relationship("PayrollItem", back_populates="lines")
