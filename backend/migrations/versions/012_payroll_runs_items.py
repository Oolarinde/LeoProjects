"""Payroll Sprint 3: payroll_runs, payroll_items, payroll_item_lines tables.

Revision ID: 012
Revises: 011
Create Date: 2026-03-30
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from alembic import op

revision: str = "012"
down_revision: Union[str, None] = "011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── payroll_runs ─────────────────────────────────────────────────────
    op.create_table(
        "payroll_runs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("year", sa.Integer, nullable=False),
        sa.Column("month", sa.Integer, nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="DRAFT"),
        sa.Column("run_date", sa.Date, nullable=True),
        sa.Column("employee_count", sa.Integer, nullable=False, server_default="0"),
        # Totals (computed on calculate, stored for fast display)
        sa.Column("total_gross", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total_net", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total_paye", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total_pension_ee", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total_pension_er", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total_deductions", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text, nullable=True),
        # Audit
        sa.Column("approved_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("approved_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.UniqueConstraint("company_id", "year", "month", name="uq_payroll_run_company_period"),
        sa.CheckConstraint("month >= 1 AND month <= 12", name="ck_payroll_run_month"),
        sa.CheckConstraint("status IN ('DRAFT','CALCULATED','APPROVED','PAID','CANCELLED')", name="ck_payroll_run_status"),
    )
    op.create_index("ix_payroll_runs_company", "payroll_runs", ["company_id"])
    op.create_index("ix_payroll_runs_company_year", "payroll_runs", ["company_id", "year"])

    # ── payroll_items (one per employee per run) ─────────────────────────
    op.create_table(
        "payroll_items",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("payroll_run_id", UUID(as_uuid=True), sa.ForeignKey("payroll_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("employee_id", UUID(as_uuid=True), sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        # Pay breakdown
        sa.Column("basic_salary", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total_allowances", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("gross_pay", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("cra", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("taxable_income_annual", sa.Numeric(15, 2), nullable=False, server_default="0"),
        # Deductions
        sa.Column("paye_tax", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("pension_employee", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("pension_employer", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("nhf", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("nsitf", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("other_deductions", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total_deductions", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("net_pay", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.UniqueConstraint("payroll_run_id", "employee_id", name="uq_payroll_item_run_employee"),
    )
    op.create_index("ix_payroll_items_run", "payroll_items", ["payroll_run_id"])
    op.create_index("ix_payroll_items_employee", "payroll_items", ["employee_id"])

    # ── payroll_item_lines (allowance/deduction breakdown per employee) ──
    op.create_table(
        "payroll_item_lines",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("payroll_item_id", UUID(as_uuid=True), sa.ForeignKey("payroll_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("line_type", sa.String(20), nullable=False),  # ALLOWANCE or DEDUCTION
        sa.Column("type_code", sa.String(20), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.CheckConstraint("line_type IN ('ALLOWANCE','DEDUCTION')", name="ck_item_line_type"),
    )
    op.create_index("ix_payroll_item_lines_item", "payroll_item_lines", ["payroll_item_id"])


def downgrade() -> None:
    op.drop_index("ix_payroll_item_lines_item", table_name="payroll_item_lines")
    op.drop_table("payroll_item_lines")
    op.drop_index("ix_payroll_items_employee", table_name="payroll_items")
    op.drop_index("ix_payroll_items_run", table_name="payroll_items")
    op.drop_table("payroll_items")
    op.drop_index("ix_payroll_runs_company_year", table_name="payroll_runs")
    op.drop_index("ix_payroll_runs_company", table_name="payroll_runs")
    op.drop_table("payroll_runs")
