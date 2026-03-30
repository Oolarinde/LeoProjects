"""Add transaction tables, unique constraints, CHECK constraints on enum fields.

- revenue_transactions, expense_transactions, budget_lines, payroll_records
- Unique constraint on groups(company_id, name)
- Unique constraint on units(company_id, location_id, name)
- CHECK constraints on users.role, accounts.type, accounts.normal_balance

Revision ID: 008
Revises: 007
Create Date: 2026-03-30
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB
from alembic import op

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Unique constraints on groups and units ─────────────────────────
    op.create_unique_constraint("uq_groups_company_name", "groups", ["company_id", "name"])
    op.create_unique_constraint("uq_units_company_location_name", "units", ["company_id", "location_id", "name"])

    # ── CHECK constraints on enum-like fields ──────────────────────────
    op.create_check_constraint(
        "ck_users_role_valid",
        "users",
        "role IN ('SUPER_ADMIN', 'ADMIN', 'STAFF')",
    )
    op.create_check_constraint(
        "ck_accounts_type_valid",
        "accounts",
        "type IN ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense')",
    )
    op.create_check_constraint(
        "ck_accounts_normal_balance_valid",
        "accounts",
        "normal_balance IN ('Dr', 'Cr')",
    )

    # ── revenue_transactions ───────────────────────────────────────────
    op.create_table(
        "revenue_transactions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("location_id", UUID(as_uuid=True), sa.ForeignKey("locations.id"), nullable=False),
        sa.Column("unit_id", UUID(as_uuid=True), sa.ForeignKey("units.id"), nullable=True),
        sa.Column("account_id", UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("fiscal_year", sa.Integer, nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("payment_method", sa.String(30), nullable=True),
        sa.Column("reference_no", sa.String(50), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("tenant_name", sa.String(200), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.CheckConstraint("amount > 0", name="ck_revenue_amount_positive"),
    )
    op.create_index("ix_revenue_transactions_company_id", "revenue_transactions", ["company_id"])
    op.create_index("ix_revenue_transactions_location_id", "revenue_transactions", ["location_id"])
    op.create_index("ix_revenue_company_year", "revenue_transactions", ["company_id", "fiscal_year"])
    op.create_index("ix_revenue_date", "revenue_transactions", ["date"])

    # ── expense_transactions ───────────────────────────────────────────
    op.create_table(
        "expense_transactions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("location_id", UUID(as_uuid=True), sa.ForeignKey("locations.id"), nullable=False),
        sa.Column("account_id", UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("fiscal_year", sa.Integer, nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("payment_method", sa.String(30), nullable=True),
        sa.Column("reference_no", sa.String(50), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("vendor_name", sa.String(200), nullable=True),
        sa.Column("approved_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.CheckConstraint("amount > 0", name="ck_expense_amount_positive"),
    )
    op.create_index("ix_expense_transactions_company_id", "expense_transactions", ["company_id"])
    op.create_index("ix_expense_transactions_location_id", "expense_transactions", ["location_id"])
    op.create_index("ix_expense_company_year", "expense_transactions", ["company_id", "fiscal_year"])
    op.create_index("ix_expense_date", "expense_transactions", ["date"])

    # ── budget_lines ───────────────────────────────────────────────────
    op.create_table(
        "budget_lines",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("year", sa.Integer, nullable=False),
        sa.Column("month", sa.Integer, nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("line_type", sa.String(20), nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.UniqueConstraint("company_id", "year", "month", "category", "line_type", name="uq_budget_company_year_month_cat_type"),
        sa.CheckConstraint("amount >= 0", name="ck_budget_amount_non_negative"),
        sa.CheckConstraint("month >= 1 AND month <= 12", name="ck_budget_month_range"),
    )
    op.create_index("ix_budget_lines_company_id", "budget_lines", ["company_id"])

    # ── payroll_records ────────────────────────────────────────────────
    op.create_table(
        "payroll_records",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("year", sa.Integer, nullable=False),
        sa.Column("month", sa.Integer, nullable=False),
        sa.Column("employee_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("gross_total", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("tax_total", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("pension_total", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("nhf_total", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("other_deductions_total", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("net_total", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="DRAFT"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.UniqueConstraint("company_id", "year", "month", name="uq_payroll_company_year_month"),
        sa.CheckConstraint("month >= 1 AND month <= 12", name="ck_payroll_month_range"),
        sa.CheckConstraint("gross_total >= 0", name="ck_payroll_gross_non_negative"),
    )
    op.create_index("ix_payroll_records_company_id", "payroll_records", ["company_id"])


def downgrade() -> None:
    op.drop_table("payroll_records")
    op.drop_table("budget_lines")
    op.drop_table("expense_transactions")
    op.drop_table("revenue_transactions")

    op.drop_constraint("ck_accounts_normal_balance_valid", "accounts", type_="check")
    op.drop_constraint("ck_accounts_type_valid", "accounts", type_="check")
    op.drop_constraint("ck_users_role_valid", "users", type_="check")

    op.drop_constraint("uq_units_company_location_name", "units", type_="unique")
    op.drop_constraint("uq_groups_company_name", "groups", type_="unique")
