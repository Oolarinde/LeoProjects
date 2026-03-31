"""Group of companies — multi-entity, company switching, IC transactions, consolidated reports.

New tables: company_groups, company_group_members, user_company_memberships,
intercompany_transactions, allocation_rules, allocation_rule_lines,
group_coa_template, consolidation_adjustments.

Modified: companies (add group FK + legal/statutory fields).
Backfill: user_company_memberships from existing users.

Revision ID: 015
Revises: 014
Create Date: 2026-03-30
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB
from alembic import op

revision: str = "015"
down_revision: Union[str, None] = "014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Step 1: company_groups ────────────────────────────────────────────
    op.create_table(
        "company_groups",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("fiscal_year_end", sa.Integer, nullable=False, server_default="12"),
        sa.Column("base_currency", sa.String(3), nullable=False, server_default="NGN"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
    )
    op.create_index("ix_company_groups_name", "company_groups", ["name"])

    # ── Step 2: Add group FK + legal fields to companies ─────────────────
    op.add_column("companies", sa.Column("company_group_id", UUID(as_uuid=True), sa.ForeignKey("company_groups.id", ondelete="SET NULL"), nullable=True))
    op.add_column("companies", sa.Column("rc_number", sa.String(20), nullable=True))
    op.add_column("companies", sa.Column("tin", sa.String(20), nullable=True))
    op.add_column("companies", sa.Column("vat_number", sa.String(20), nullable=True))
    op.add_column("companies", sa.Column("entity_type", sa.String(20), nullable=True))
    op.add_column("companies", sa.Column("incorporation_date", sa.Date, nullable=True))
    op.add_column("companies", sa.Column("entity_prefix", sa.String(5), nullable=True))

    op.create_index("ix_companies_group", "companies", ["company_group_id"], postgresql_where=sa.text("company_group_id IS NOT NULL"))
    op.create_index(
        "uq_company_group_prefix", "companies",
        ["company_group_id", "entity_prefix"], unique=True,
        postgresql_where=sa.text("company_group_id IS NOT NULL AND entity_prefix IS NOT NULL"),
    )

    # ── Step 3: company_group_members ────────────────────────────────────
    op.create_table(
        "company_group_members",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_group_id", UUID(as_uuid=True), sa.ForeignKey("company_groups.id", ondelete="CASCADE"), nullable=False),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("parent_company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_parent", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("ownership_pct", sa.Numeric(5, 2), nullable=False, server_default="100.00"),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("company_group_id", "company_id", name="uq_cgm_group_company"),
        sa.CheckConstraint("ownership_pct > 0 AND ownership_pct <= 100", name="ck_cgm_ownership_pct"),
    )
    op.create_index("uq_company_single_group", "company_group_members", ["company_id"], unique=True)
    op.create_index("ix_cgm_group", "company_group_members", ["company_group_id"])

    # ── Step 4: user_company_memberships ─────────────────────────────────
    op.create_table(
        "user_company_memberships",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="STAFF"),
        sa.Column("permissions", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("group_id", UUID(as_uuid=True), sa.ForeignKey("groups.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("is_default", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.UniqueConstraint("user_id", "company_id", name="uq_ucm_user_company"),
    )
    op.create_index("ix_ucm_user", "user_company_memberships", ["user_id"])
    op.create_index("ix_ucm_company", "user_company_memberships", ["company_id"])
    op.create_index(
        "uq_ucm_user_default", "user_company_memberships", ["user_id"],
        unique=True, postgresql_where=sa.text("is_default = true"),
    )

    # ── Step 5: Backfill memberships from existing users ─────────────────
    op.execute(sa.text("""
        INSERT INTO user_company_memberships (id, user_id, company_id, role, permissions, group_id, is_default)
        SELECT gen_random_uuid(), id, company_id, role, permissions, group_id, true
        FROM users
    """))

    # ── Step 6: intercompany_transactions ────────────────────────────────
    op.create_table(
        "intercompany_transactions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_group_id", UUID(as_uuid=True), sa.ForeignKey("company_groups.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("source_company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("target_company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("transaction_type", sa.String(50), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("fiscal_year", sa.Integer, nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("reference_no", sa.String(50), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("source_expense_id", UUID(as_uuid=True), sa.ForeignKey("expense_transactions.id"), nullable=True),
        sa.Column("source_revenue_id", UUID(as_uuid=True), sa.ForeignKey("revenue_transactions.id"), nullable=True),
        sa.Column("target_expense_id", UUID(as_uuid=True), sa.ForeignKey("expense_transactions.id"), nullable=True),
        sa.Column("target_revenue_id", UUID(as_uuid=True), sa.ForeignKey("revenue_transactions.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("confirmed_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("voided_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("voided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("void_reason", sa.Text, nullable=True),
        sa.CheckConstraint("source_company_id != target_company_id", name="ck_ic_different_companies"),
        sa.CheckConstraint("amount > 0", name="ck_ic_amount_positive"),
        sa.CheckConstraint(
            "transaction_type IN ('LOAN', 'EXPENSE_RECHARGE', 'MANAGEMENT_FEE', "
            "'DIVIDEND', 'CAPITAL_INJECTION', 'SHARED_EXPENSE')",
            name="ck_ic_transaction_type",
        ),
        sa.CheckConstraint(
            "status IN ('PENDING', 'CONFIRMED', 'ELIMINATED', 'VOIDED')",
            name="ck_ic_status",
        ),
    )
    op.create_index("ix_ic_txn_group_year", "intercompany_transactions", ["company_group_id", "fiscal_year"])
    op.create_index("ix_ic_txn_source", "intercompany_transactions", ["source_company_id"])
    op.create_index("ix_ic_txn_target", "intercompany_transactions", ["target_company_id"])
    op.create_index("ix_ic_txn_status", "intercompany_transactions", ["status"])

    # ── Step 7: allocation_rules + allocation_rule_lines ─────────────────
    op.create_table(
        "allocation_rules",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_group_id", UUID(as_uuid=True), sa.ForeignKey("company_groups.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("allocation_type", sa.String(20), nullable=False, server_default="PERCENTAGE"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.UniqueConstraint("company_group_id", "name", name="uq_allocation_rule_group_name"),
        sa.CheckConstraint(
            "allocation_type IN ('PERCENTAGE', 'EQUAL', 'CUSTOM')",
            name="ck_allocation_type",
        ),
    )
    op.create_index("ix_allocation_rules_group", "allocation_rules", ["company_group_id"])

    op.create_table(
        "allocation_rule_lines",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("rule_id", UUID(as_uuid=True), sa.ForeignKey("allocation_rules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("percentage", sa.Numeric(7, 4), nullable=False),
        sa.UniqueConstraint("rule_id", "company_id", name="uq_arl_rule_company"),
        sa.CheckConstraint("percentage >= 0 AND percentage <= 100", name="ck_arl_percentage_range"),
    )
    op.create_index("ix_arl_rule", "allocation_rule_lines", ["rule_id"])

    # ── Step 8: group_coa_template ───────────────────────────────────────
    op.create_table(
        "group_coa_template",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_group_id", UUID(as_uuid=True), sa.ForeignKey("company_groups.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code", sa.String(10), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("normal_balance", sa.String(2), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_intercompany", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("cost_centre", sa.String(10), nullable=True),
        sa.UniqueConstraint("company_group_id", "code", name="uq_gcoa_group_code"),
        sa.CheckConstraint("type IN ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense')", name="ck_gcoa_type"),
        sa.CheckConstraint("normal_balance IN ('Dr', 'Cr')", name="ck_gcoa_normal_balance"),
    )
    op.create_index("ix_gcoa_group", "group_coa_template", ["company_group_id"])

    # ── Step 9: consolidation_adjustments ────────────────────────────────
    op.create_table(
        "consolidation_adjustments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_group_id", UUID(as_uuid=True), sa.ForeignKey("company_groups.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("fiscal_year", sa.Integer, nullable=False),
        sa.Column("adjustment_type", sa.String(50), nullable=False),
        sa.Column("account_code", sa.String(10), nullable=False),
        sa.Column("debit_amount", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("credit_amount", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.CheckConstraint("debit_amount >= 0", name="ck_ca_debit_non_negative"),
        sa.CheckConstraint("credit_amount >= 0", name="ck_ca_credit_non_negative"),
        sa.CheckConstraint("debit_amount > 0 OR credit_amount > 0", name="ck_ca_not_both_zero"),
        sa.CheckConstraint("debit_amount = 0 OR credit_amount = 0", name="ck_ca_not_both_nonzero"),
        sa.CheckConstraint(
            "adjustment_type IN ('IC_ELIMINATION', 'POLICY_ALIGNMENT', 'MINORITY_INTEREST', "
            "'GOODWILL', 'UNREALISED_PROFIT', 'OTHER')",
            name="ck_ca_adjustment_type",
        ),
    )
    op.create_index("ix_ca_group_year", "consolidation_adjustments", ["company_group_id", "fiscal_year"])


def downgrade() -> None:
    op.drop_table("consolidation_adjustments")
    op.drop_table("group_coa_template")
    op.drop_table("allocation_rule_lines")
    op.drop_table("allocation_rules")
    op.drop_table("intercompany_transactions")
    op.drop_table("user_company_memberships")
    op.drop_table("company_group_members")

    op.drop_index("uq_company_group_prefix", table_name="companies")
    op.drop_index("ix_companies_group", table_name="companies")
    op.drop_column("companies", "entity_prefix")
    op.drop_column("companies", "incorporation_date")
    op.drop_column("companies", "entity_type")
    op.drop_column("companies", "vat_number")
    op.drop_column("companies", "tin")
    op.drop_column("companies", "rc_number")
    op.drop_column("companies", "company_group_id")

    op.drop_table("company_groups")
