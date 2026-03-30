from __future__ import annotations
from datetime import datetime
from decimal import Decimal
from typing import Optional
import uuid

from sqlalchemy import Integer, Numeric, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from database import Base


class TaxBracket(Base):
    __tablename__ = "tax_brackets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False
    )
    lower_bound: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    upper_bound: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    rate_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    company = relationship("Company", back_populates="tax_brackets")
