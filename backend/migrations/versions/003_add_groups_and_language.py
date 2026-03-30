"""Add groups table, user.group_id, user.preferred_language; seed default roles

Revision ID: 003
Revises: 002
Create Date: 2026-03-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision: str = "003"
down_revision: Union[str, None] = "002"
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
    # 1. Create groups table
    op.create_table(
        "groups",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("permissions", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_groups_company_id", "groups", ["company_id"])

    # 2. Add group_id FK to users (nullable first, will make NOT NULL after backfill)
    op.add_column("users", sa.Column("group_id", UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_users_group_id", "users", "groups", ["group_id"], ["id"], ondelete="RESTRICT",
    )
    op.create_index("ix_users_group_id", "users", ["group_id"])

    # 3. Add preferred_language to users
    op.add_column(
        "users",
        sa.Column("preferred_language", sa.String(5), nullable=False, server_default="en"),
    )

    # 4. Seed default roles per company and assign all users
    conn = op.get_bind()

    companies = conn.execute(sa.text("SELECT id FROM companies")).fetchall()
    for (company_id,) in companies:
        # Create "Administrator" role (full write)
        conn.execute(sa.text(
            "INSERT INTO groups (id, company_id, name, description, permissions) "
            "VALUES (gen_random_uuid(), :cid, 'Administrator', 'Full access to all modules', :perms)"
        ), {"cid": company_id, "perms": ALL_WRITE})

        # Create "Staff" role (read only)
        conn.execute(sa.text(
            "INSERT INTO groups (id, company_id, name, description, permissions) "
            "VALUES (gen_random_uuid(), :cid, 'Staff', 'Read-only access to all modules', :perms)"
        ), {"cid": company_id, "perms": ALL_READ})

        # Get the role IDs we just created
        admin_role = conn.execute(sa.text(
            "SELECT id FROM groups WHERE company_id = :cid AND name = 'Administrator'"
        ), {"cid": company_id}).fetchone()

        staff_role = conn.execute(sa.text(
            "SELECT id FROM groups WHERE company_id = :cid AND name = 'Staff'"
        ), {"cid": company_id}).fetchone()

        # Assign SUPER_ADMIN and ADMIN users to Administrator role
        conn.execute(sa.text(
            "UPDATE users SET group_id = :gid WHERE company_id = :cid AND role IN ('SUPER_ADMIN', 'ADMIN')"
        ), {"gid": admin_role[0], "cid": company_id})

        # Assign STAFF users to Staff role
        conn.execute(sa.text(
            "UPDATE users SET group_id = :gid WHERE company_id = :cid AND role = 'STAFF'"
        ), {"gid": staff_role[0], "cid": company_id})

    # 5. Make group_id NOT NULL now that all users are assigned
    op.alter_column("users", "group_id", nullable=False)


def downgrade() -> None:
    op.alter_column("users", "group_id", nullable=True)
    op.drop_column("users", "preferred_language")
    op.drop_index("ix_users_group_id", "users")
    op.drop_constraint("fk_users_group_id", "users", type_="foreignkey")
    op.drop_column("users", "group_id")
    op.drop_index("ix_groups_company_id", "groups")
    op.drop_table("groups")
