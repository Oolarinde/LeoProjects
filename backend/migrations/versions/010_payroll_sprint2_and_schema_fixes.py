"""Payroll Sprint 2 tables + schema fixes.

Fixes:
  - expense_transactions.location_id → nullable (was incorrectly NOT NULL)
  - Add missing account_id indexes on revenue_transactions, expense_transactions

New tables:
  - employee_payroll_profiles
  - employee_allowances
  - employee_deductions
  - employee_leave_balances
  - leave_requests

Revision ID: 010
Revises: 009
Create Date: 2026-03-30
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from alembic import op

revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Fix: expense_transactions.location_id should be nullable ──────────
    op.alter_column("expense_transactions", "location_id", nullable=True)

    # ── Fix: add missing account_id indexes for GL/trial balance JOINs ───
    op.create_index(
        "ix_revenue_transactions_account_id",
        "revenue_transactions",
        ["account_id"],
    )
    op.create_index(
        "ix_expense_transactions_account_id",
        "expense_transactions",
        ["account_id"],
    )
    op.create_index(
        "ix_expense_transactions_category",
        "expense_transactions",
        ["category"],
    )

    # ── employee_payroll_profiles ─────────────────────────────────────────
    op.create_table(
        "employee_payroll_profiles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("employee_id", UUID(as_uuid=True), sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("basic_salary", sa.Numeric(15, 2), nullable=False),
        sa.Column("pay_grade", sa.String(20), nullable=True),
        sa.Column("bank_name", sa.String(100), nullable=True),
        sa.Column("bank_account_no", sa.String(30), nullable=True),
        sa.Column("bank_sort_code", sa.String(20), nullable=True),
        sa.Column("tax_id", sa.String(50), nullable=True),
        sa.Column("pension_id", sa.String(50), nullable=True),
        sa.Column("effective_date", sa.Date, nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.UniqueConstraint("employee_id", name="uq_payroll_profile_employee"),
        sa.CheckConstraint("basic_salary >= 0", name="ck_payroll_profile_basic_salary"),
    )
    op.create_index("ix_payroll_profiles_company_id", "employee_payroll_profiles", ["company_id"])
    op.create_index("ix_payroll_profiles_employee_id", "employee_payroll_profiles", ["employee_id"])

    # ── employee_allowances ───────────────────────────────────────────────
    op.create_table(
        "employee_allowances",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("employee_id", UUID(as_uuid=True), sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("allowance_type_id", UUID(as_uuid=True), sa.ForeignKey("allowance_types.id", ondelete="CASCADE"), nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.UniqueConstraint("employee_id", "allowance_type_id", name="uq_emp_allowance"),
        sa.CheckConstraint("amount >= 0", name="ck_emp_allowance_amount"),
    )
    op.create_index("ix_employee_allowances_company_id", "employee_allowances", ["company_id"])
    op.create_index("ix_employee_allowances_employee_id", "employee_allowances", ["employee_id"])

    # ── employee_deductions ───────────────────────────────────────────────
    op.create_table(
        "employee_deductions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("employee_id", UUID(as_uuid=True), sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("deduction_type_id", UUID(as_uuid=True), sa.ForeignKey("deduction_types.id", ondelete="CASCADE"), nullable=False),
        sa.Column("override_value", sa.Numeric(15, 2), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.UniqueConstraint("employee_id", "deduction_type_id", name="uq_emp_deduction"),
    )
    op.create_index("ix_employee_deductions_company_id", "employee_deductions", ["company_id"])
    op.create_index("ix_employee_deductions_employee_id", "employee_deductions", ["employee_id"])

    # ── employee_leave_balances ───────────────────────────────────────────
    op.create_table(
        "employee_leave_balances",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("employee_id", UUID(as_uuid=True), sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("leave_policy_id", UUID(as_uuid=True), sa.ForeignKey("leave_policies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("year", sa.Integer, nullable=False),
        sa.Column("entitled_days", sa.Numeric(5, 1), nullable=False),
        sa.Column("used_days", sa.Numeric(5, 1), nullable=False, server_default="0"),
        sa.Column("carried_over_days", sa.Numeric(5, 1), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.UniqueConstraint("employee_id", "leave_policy_id", "year", name="uq_leave_balance_emp_policy_year"),
        sa.CheckConstraint("used_days >= 0", name="ck_leave_balance_used_days"),
        sa.CheckConstraint("entitled_days >= 0", name="ck_leave_balance_entitled_days"),
    )
    op.create_index("ix_leave_balances_company_id", "employee_leave_balances", ["company_id"])
    op.create_index("ix_leave_balances_employee_id", "employee_leave_balances", ["employee_id"])

    # ── leave_requests ────────────────────────────────────────────────────
    op.create_table(
        "leave_requests",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("employee_id", UUID(as_uuid=True), sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("leave_policy_id", UUID(as_uuid=True), sa.ForeignKey("leave_policies.id"), nullable=False),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
        sa.Column("days_requested", sa.Numeric(5, 1), nullable=False),
        sa.Column("reason", sa.Text, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("approved_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejection_reason", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.CheckConstraint("end_date >= start_date", name="ck_leave_request_dates"),
        sa.CheckConstraint("days_requested > 0", name="ck_leave_request_days_positive"),
        sa.CheckConstraint(
            "status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')",
            name="ck_leave_request_status",
        ),
    )
    op.create_index("ix_leave_requests_company_id", "leave_requests", ["company_id"])
    op.create_index("ix_leave_requests_employee_id", "leave_requests", ["employee_id"])
    op.create_index("ix_leave_requests_status", "leave_requests", ["status"])


def downgrade() -> None:
    op.drop_table("leave_requests")
    op.drop_table("employee_leave_balances")
    op.drop_table("employee_deductions")
    op.drop_table("employee_allowances")
    op.drop_table("employee_payroll_profiles")

    op.drop_index("ix_expense_transactions_category", "expense_transactions")
    op.drop_index("ix_expense_transactions_account_id", "expense_transactions")
    op.drop_index("ix_revenue_transactions_account_id", "revenue_transactions")

    op.alter_column("expense_transactions", "location_id", nullable=False)
