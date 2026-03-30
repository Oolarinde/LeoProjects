"""Add company_id to units, avatar_url to users, sync model indexes.

Revision ID: 007
Revises: 006
Create Date: 2026-03-30
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from alembic import op

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Unit: add company_id column ---
    op.add_column("units", sa.Column("company_id", UUID(as_uuid=True), nullable=True))

    # Backfill company_id from parent location
    op.execute("""
        UPDATE units u
        SET company_id = l.company_id
        FROM locations l
        WHERE u.location_id = l.id
    """)

    # Now make it non-nullable
    op.alter_column("units", "company_id", nullable=False)
    op.create_foreign_key("fk_units_company_id", "units", "companies", ["company_id"], ["id"])
    op.create_index("ix_units_company_id", "units", ["company_id"])
    op.create_index("ix_units_location_id", "units", ["location_id"])

    # --- User: add avatar_url column ---
    op.add_column("users", sa.Column("avatar_url", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "avatar_url")
    op.drop_index("ix_units_location_id", table_name="units")
    op.drop_index("ix_units_company_id", table_name="units")
    op.drop_constraint("fk_units_company_id", "units", type_="foreignkey")
    op.drop_column("units", "company_id")
