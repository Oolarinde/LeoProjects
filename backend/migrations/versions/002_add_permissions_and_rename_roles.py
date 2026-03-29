"""Add permissions JSONB column to users and rename roles

Revision ID: 002
Revises: 001
Create Date: 2026-03-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ALL_WRITE = (
    '{"dashboard":"write","revenue":"write","expenses":"write","payroll":"write",'
    '"budget":"write","analysis":"write","ledger":"write","pnl":"write",'
    '"cashflow":"write","balance_sheet":"write","trial_balance":"write",'
    '"accounts":"write","employees":"write","locations":"write","reference":"write"}'
)

ALL_READ = (
    '{"dashboard":"read","revenue":"read","expenses":"read","payroll":"read",'
    '"budget":"read","analysis":"read","ledger":"read","pnl":"read",'
    '"cashflow":"read","balance_sheet":"read","trial_balance":"read",'
    '"accounts":"read","employees":"read","locations":"read","reference":"read"}'
)


def upgrade() -> None:
    # Add permissions column with proper JSONB default
    op.add_column("users", sa.Column("permissions", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")))

    # Add index on company_id for multi-tenant queries
    op.create_index("ix_users_company_id", "users", ["company_id"])

    # Rename roles: OWNER -> SUPER_ADMIN, VIEWER -> STAFF
    op.execute(sa.text("UPDATE users SET role = 'SUPER_ADMIN' WHERE role = 'OWNER'"))
    op.execute(sa.text("UPDATE users SET role = 'STAFF' WHERE role = 'VIEWER'"))

    # Backfill permissions based on role
    op.execute(sa.text(f"UPDATE users SET permissions = '{ALL_WRITE}'::jsonb WHERE role IN ('SUPER_ADMIN', 'ADMIN')"))
    op.execute(sa.text(f"UPDATE users SET permissions = '{ALL_READ}'::jsonb WHERE role = 'STAFF'"))

    # Update the server default for role column
    op.alter_column("users", "role", server_default="STAFF")


def downgrade() -> None:
    # Revert role names
    op.execute(sa.text("UPDATE users SET role = 'OWNER' WHERE role = 'SUPER_ADMIN'"))
    op.execute(sa.text("UPDATE users SET role = 'VIEWER' WHERE role = 'STAFF'"))

    # Revert server default
    op.alter_column("users", "role", server_default="VIEWER")

    # Drop index and column
    op.drop_index("ix_users_company_id", "users")
    op.drop_column("users", "permissions")
