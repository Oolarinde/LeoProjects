"""Add payroll configuration tables: payroll_settings, allowance_types, deduction_types, tax_brackets, leave_policies

Revision ID: 004
Revises: 003
Create Date: 2026-03-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- payroll_settings (one per company) ---
    op.create_table(
        "payroll_settings",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False, unique=True),
        sa.Column("pay_period", sa.String(20), server_default="MONTHLY"),
        sa.Column("pension_employee_pct", sa.Numeric(5, 2), server_default="8.00"),
        sa.Column("pension_employer_pct", sa.Numeric(5, 2), server_default="10.00"),
        sa.Column("nhf_pct", sa.Numeric(5, 2), server_default="2.50"),
        sa.Column("nsitf_employee_pct", sa.Numeric(5, 2), server_default="1.00"),
        sa.Column("tax_method", sa.String(30), server_default="PAYE_PROGRESSIVE"),
        sa.Column("enable_13th_month", sa.Boolean, server_default="false"),
        sa.Column("fiscal_year_start_month", sa.Integer, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- allowance_types ---
    op.create_table(
        "allowance_types",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column("is_taxable", sa.Boolean, server_default="true"),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("sort_order", sa.Integer, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("company_id", "code", name="uq_allowance_types_company_code"),
    )
    op.create_index("ix_allowance_types_company_id", "allowance_types", ["company_id"])

    # --- deduction_types ---
    op.create_table(
        "deduction_types",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column("is_statutory", sa.Boolean, server_default="false"),
        sa.Column("calculation_method", sa.String(30), server_default="FIXED"),
        sa.Column("default_value", sa.Numeric(15, 2), nullable=True),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("sort_order", sa.Integer, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("company_id", "code", name="uq_deduction_types_company_code"),
    )
    op.create_index("ix_deduction_types_company_id", "deduction_types", ["company_id"])

    # --- tax_brackets ---
    op.create_table(
        "tax_brackets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("lower_bound", sa.Numeric(15, 2), nullable=False),
        sa.Column("upper_bound", sa.Numeric(15, 2), nullable=True),
        sa.Column("rate_pct", sa.Numeric(5, 2), nullable=False),
        sa.Column("sort_order", sa.Integer, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_tax_brackets_company_id", "tax_brackets", ["company_id"])

    # --- leave_policies ---
    op.create_table(
        "leave_policies",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("leave_type", sa.String(30), nullable=False),
        sa.Column("days_per_year", sa.Integer, nullable=False),
        sa.Column("is_paid", sa.Boolean, server_default="true"),
        sa.Column("carry_over_allowed", sa.Boolean, server_default="false"),
        sa.Column("max_carry_over_days", sa.Integer, nullable=True),
        sa.Column("requires_approval", sa.Boolean, server_default="true"),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("company_id", "leave_type", name="uq_leave_policies_company_type"),
    )
    op.create_index("ix_leave_policies_company_id", "leave_policies", ["company_id"])


def downgrade() -> None:
    op.drop_table("leave_policies")
    op.drop_table("tax_brackets")
    op.drop_table("deduction_types")
    op.drop_table("allowance_types")
    op.drop_table("payroll_settings")
