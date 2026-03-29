import uuid

from sqlalchemy import String, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class ReferenceData(Base):
    __tablename__ = "reference_data"
    __table_args__ = (UniqueConstraint("company_id", "category", "value", name="uq_ref_company_cat_val"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # payment_method, expense_category, department, staff_status
    value: Mapped[str] = mapped_column(String(100), nullable=False)

    company = relationship("Company", back_populates="reference_data")
