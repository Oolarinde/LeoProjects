"""Accounting compliance fixes (LEDGER audit).

- Soft-delete (void) columns on revenue_transactions + expense_transactions
- is_deposit flag on revenue_transactions (caution deposits ≠ earned revenue)
- WHT columns on expense_transactions
- Seed statutory liability accounts (PAYE Payable, Pension Payable, NHF, NSITF, VAT)

Revision ID: 014
Revises: 013
Create Date: 2026-03-30
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from alembic import op

revision: str = "014"
down_revision: Union[str, None] = "013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Soft-delete (void) columns on revenue_transactions ───────────────
    op.add_column("revenue_transactions", sa.Column("is_voided", sa.Boolean, nullable=False, server_default=sa.text("false")))
    op.add_column("revenue_transactions", sa.Column("void_reason", sa.Text, nullable=True))
    op.add_column("revenue_transactions", sa.Column("voided_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True))
    op.add_column("revenue_transactions", sa.Column("voided_at", sa.TIMESTAMP(timezone=True), nullable=True))

    # ── is_deposit flag on revenue_transactions ──────────────────────────
    op.add_column("revenue_transactions", sa.Column("is_deposit", sa.Boolean, nullable=False, server_default=sa.text("false")))

    # ── Soft-delete (void) columns on expense_transactions ───────────────
    op.add_column("expense_transactions", sa.Column("is_voided", sa.Boolean, nullable=False, server_default=sa.text("false")))
    op.add_column("expense_transactions", sa.Column("void_reason", sa.Text, nullable=True))
    op.add_column("expense_transactions", sa.Column("voided_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True))
    op.add_column("expense_transactions", sa.Column("voided_at", sa.TIMESTAMP(timezone=True), nullable=True))

    # ── WHT columns on expense_transactions ──────────────────────────────
    op.add_column("expense_transactions", sa.Column("wht_rate", sa.Numeric(5, 2), nullable=True))
    op.add_column("expense_transactions", sa.Column("wht_amount", sa.Numeric(15, 2), nullable=True))

    # ── Indexes for void filtering ───────────────────────────────────────
    op.create_index("ix_rev_txn_voided", "revenue_transactions", ["is_voided"])
    op.create_index("ix_exp_txn_voided", "expense_transactions", ["is_voided"])

    # ── Seed statutory liability accounts (for all existing companies) ───
    op.execute("""
        INSERT INTO accounts (id, company_id, code, name, type, normal_balance, description, created_at, updated_at)
        SELECT gen_random_uuid(), c.id, acct.code, acct.name, acct.type, acct.normal_balance, acct.description, NOW(), NOW()
        FROM companies c
        CROSS JOIN (VALUES
            ('2050', 'PAYE Tax Payable',       'Liability', 'Cr', 'Monthly PAYE liability to State IRS'),
            ('2060', 'Pension Payable',         'Liability', 'Cr', 'Employee + employer pension contributions payable to PFAs'),
            ('2070', 'NHF Payable',             'Liability', 'Cr', 'National Housing Fund contributions payable'),
            ('2080', 'NSITF Payable',           'Liability', 'Cr', 'NSITF contributions payable'),
            ('2090', 'VAT Payable',             'Liability', 'Cr', 'Output VAT collected, payable to FIRS'),
            ('7010', 'Interest Income',         'Revenue',   'Cr', 'Bank interest and investment income'),
            ('8010', 'CIT Provision',           'Expense',   'Dr', 'Company Income Tax provision'),
            ('1050', 'Fixed Assets',            'Asset',     'Dr', 'Property, furniture, equipment at cost'),
            ('1060', 'Accumulated Depreciation', 'Asset',    'Cr', 'Cumulative depreciation on fixed assets')
        ) AS acct(code, name, type, normal_balance, description)
        WHERE NOT EXISTS (
            SELECT 1 FROM accounts a WHERE a.company_id = c.id AND a.code = acct.code
        )
    """)

    # ── Mark existing caution fee revenue as deposits ────────────────────
    op.execute("""
        UPDATE revenue_transactions r
        SET is_deposit = true
        FROM accounts a
        WHERE r.account_id = a.id AND a.code = '4030'
    """)


def downgrade() -> None:
    op.drop_index("ix_exp_txn_voided", table_name="expense_transactions")
    op.drop_index("ix_rev_txn_voided", table_name="revenue_transactions")
    op.drop_column("expense_transactions", "wht_amount")
    op.drop_column("expense_transactions", "wht_rate")
    op.drop_column("expense_transactions", "voided_at")
    op.drop_column("expense_transactions", "voided_by")
    op.drop_column("expense_transactions", "void_reason")
    op.drop_column("expense_transactions", "is_voided")
    op.drop_column("revenue_transactions", "is_deposit")
    op.drop_column("revenue_transactions", "voided_at")
    op.drop_column("revenue_transactions", "voided_by")
    op.drop_column("revenue_transactions", "void_reason")
    op.drop_column("revenue_transactions", "is_voided")
    # Note: seeded accounts are not removed on downgrade
