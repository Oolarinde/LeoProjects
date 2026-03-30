"""Add audit columns (updated_at, created_by, updated_by) to 13 tables,
create audit_log and login_sessions tables.

Revision ID: 006
Revises: 005
Create Date: 2026-03-29
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

from alembic import op

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Tables that get all three columns (updated_at, created_by, updated_by)
TABLES_FULL = [
    "companies",
    "users",
    "groups",
    "locations",
    "units",
    "accounts",
    "employees",
    "allowance_types",
    "deduction_types",
    "tax_brackets",
    "leave_policies",
]

# payroll_settings already has updated_at — only add created_by, updated_by
TABLES_PARTIAL = ["payroll_settings"]


def upgrade() -> None:
    # --- 1. Add audit columns to existing tables ---

    for table in TABLES_FULL:
        op.add_column(
            table,
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=True,
            ),
        )
        op.add_column(
            table,
            sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        )
        op.add_column(
            table,
            sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        )

    for table in TABLES_PARTIAL:
        op.add_column(
            table,
            sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        )
        op.add_column(
            table,
            sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        )

    # reference_data: add created_at (missing), updated_at, created_by, updated_by
    op.add_column(
        "reference_data",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
    )
    op.add_column(
        "reference_data",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
    )
    op.add_column(
        "reference_data",
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
    )
    op.add_column(
        "reference_data",
        sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
    )

    # --- 2. Create audit_log table ---
    op.create_table(
        "audit_log",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("table_name", sa.String(100), nullable=False),
        sa.Column("record_id", UUID(as_uuid=True), nullable=False),
        sa.Column("action", sa.String(10), nullable=False),
        sa.Column("changed_fields", JSONB, nullable=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_audit_log_company_id", "audit_log", ["company_id"])
    op.create_index("ix_audit_log_table_record", "audit_log", ["table_name", "record_id"])
    op.create_index("ix_audit_log_user_id", "audit_log", ["user_id"])
    op.create_index("ix_audit_log_created_at", "audit_log", ["created_at"])

    # --- 3. Create login_sessions table ---
    op.create_table(
        "login_sessions",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=False),
        sa.Column("user_agent", sa.Text, nullable=True),
        sa.Column("browser", sa.String(100), nullable=True),
        sa.Column("os", sa.String(100), nullable=True),
        sa.Column("device_type", sa.String(20), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("region", sa.String(100), nullable=True),
        sa.Column("country", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_login_sessions_company_id", "login_sessions", ["company_id"])
    op.create_index("ix_login_sessions_user_id", "login_sessions", ["user_id"])
    op.create_index("ix_login_sessions_created_at", "login_sessions", ["created_at"])


def downgrade() -> None:
    # --- Drop tables first ---
    op.drop_table("login_sessions")
    op.drop_table("audit_log")

    # --- Drop columns from reference_data ---
    op.drop_column("reference_data", "updated_by")
    op.drop_column("reference_data", "created_by")
    op.drop_column("reference_data", "updated_at")
    op.drop_column("reference_data", "created_at")

    # --- Drop columns from partial tables ---
    for table in TABLES_PARTIAL:
        op.drop_column(table, "updated_by")
        op.drop_column(table, "created_by")

    # --- Drop columns from full tables ---
    for table in TABLES_FULL:
        op.drop_column(table, "updated_by")
        op.drop_column(table, "created_by")
        op.drop_column(table, "updated_at")
