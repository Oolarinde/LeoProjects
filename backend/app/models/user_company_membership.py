from __future__ import annotations
from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy import DateTime, ForeignKey, String, Boolean, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func, text

from database import Base


class UserCompanyMembership(Base):
    __tablename__ = "user_company_memberships"
    __table_args__ = (
        UniqueConstraint("user_id", "company_id", name="uq_ucm_user_company"),
        Index("ix_ucm_user", "user_id"),
        Index("ix_ucm_company", "company_id"),
        # Only one default company per user — enforced at DB level
        Index("uq_ucm_user_default", "user_id", unique=True, postgresql_where=text("is_default = true")),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False,
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="STAFF")
    permissions: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("groups.id", ondelete="RESTRICT"), nullable=False,
    )
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True,
    )

    user = relationship("User", back_populates="company_memberships")
    company = relationship("Company")
    group = relationship("Group")
