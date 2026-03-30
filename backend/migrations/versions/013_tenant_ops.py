"""Phase 5: Tenant registry, leases, rent tracking.

Revision ID: 013
Revises: 012
Create Date: 2026-03-30
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from alembic import op

revision: str = "013"
down_revision: Union[str, None] = "012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── tenants ──────────────────────────────────────────────────────────
    op.create_table(
        "tenants",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("email", sa.String(200), nullable=True),
        sa.Column("id_type", sa.String(50), nullable=True),  # NIN, Passport, etc.
        sa.Column("id_number", sa.String(50), nullable=True),
        sa.Column("emergency_contact", sa.String(200), nullable=True),
        sa.Column("emergency_phone", sa.String(30), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
    )
    op.create_index("ix_tenants_company", "tenants", ["company_id"])
    op.create_index("ix_tenants_name", "tenants", ["company_id", "full_name"])

    # ── leases ───────────────────────────────────────────────────────────
    op.create_table(
        "leases",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("location_id", UUID(as_uuid=True), sa.ForeignKey("locations.id"), nullable=False),
        sa.Column("unit_id", UUID(as_uuid=True), sa.ForeignKey("units.id"), nullable=True),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
        sa.Column("monthly_rent", sa.Numeric(15, 2), nullable=False),
        sa.Column("caution_deposit", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="ACTIVE"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.CheckConstraint("end_date >= start_date", name="ck_lease_dates"),
        sa.CheckConstraint("monthly_rent >= 0", name="ck_lease_rent_positive"),
        sa.CheckConstraint("status IN ('ACTIVE','EXPIRED','TERMINATED','RENEWED')", name="ck_lease_status"),
    )
    op.create_index("ix_leases_company", "leases", ["company_id"])
    op.create_index("ix_leases_tenant", "leases", ["tenant_id"])
    op.create_index("ix_leases_unit", "leases", ["unit_id"])

    # ── rent_payments (tracks individual rent payments against leases) ───
    op.create_table(
        "rent_payments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lease_id", UUID(as_uuid=True), sa.ForeignKey("leases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("payment_date", sa.Date, nullable=False),
        sa.Column("period_month", sa.Integer, nullable=False),  # which month this covers
        sa.Column("period_year", sa.Integer, nullable=False),
        sa.Column("payment_method", sa.String(50), nullable=True),
        sa.Column("reference_no", sa.String(50), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.CheckConstraint("amount > 0", name="ck_rent_payment_positive"),
    )
    op.create_index("ix_rent_payments_company", "rent_payments", ["company_id"])
    op.create_index("ix_rent_payments_lease", "rent_payments", ["lease_id"])


def downgrade() -> None:
    op.drop_index("ix_rent_payments_lease", table_name="rent_payments")
    op.drop_index("ix_rent_payments_company", table_name="rent_payments")
    op.drop_table("rent_payments")
    op.drop_index("ix_leases_unit", table_name="leases")
    op.drop_index("ix_leases_tenant", table_name="leases")
    op.drop_index("ix_leases_company", table_name="leases")
    op.drop_table("leases")
    op.drop_index("ix_tenants_name", table_name="tenants")
    op.drop_index("ix_tenants_company", table_name="tenants")
    op.drop_table("tenants")
