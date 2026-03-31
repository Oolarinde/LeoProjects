"""Extended employee profile fields — photo, DOB, address, next of kin, supervisor, department, hire date, user link, bank details.

Revision ID: 018
Revises: 017
Create Date: 2026-03-31
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from alembic import op

revision: str = "018"
down_revision: Union[str, None] = "017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("employees", sa.Column("photo_url", sa.String(500), nullable=True))
    op.add_column("employees", sa.Column("date_of_birth", sa.Date, nullable=True))
    op.add_column("employees", sa.Column("address", sa.Text, nullable=True))
    op.add_column("employees", sa.Column("next_of_kin_name", sa.String(200), nullable=True))
    op.add_column("employees", sa.Column("next_of_kin_phone", sa.String(30), nullable=True))
    op.add_column("employees", sa.Column("next_of_kin_relationship", sa.String(50), nullable=True))
    op.add_column("employees", sa.Column("department", sa.String(100), nullable=True))
    op.add_column("employees", sa.Column("hire_date", sa.Date, nullable=True))
    op.add_column("employees", sa.Column("supervisor_id", UUID(as_uuid=True), sa.ForeignKey("employees.id"), nullable=True))
    op.add_column("employees", sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True))
    op.add_column("employees", sa.Column("bank_name", sa.String(100), nullable=True))
    op.add_column("employees", sa.Column("bank_account_no", sa.String(20), nullable=True))

    op.create_unique_constraint("uq_employee_user", "employees", ["user_id"])


def downgrade() -> None:
    op.drop_constraint("uq_employee_user", "employees", type_="unique")
    op.drop_column("employees", "bank_account_no")
    op.drop_column("employees", "bank_name")
    op.drop_column("employees", "user_id")
    op.drop_column("employees", "supervisor_id")
    op.drop_column("employees", "hire_date")
    op.drop_column("employees", "department")
    op.drop_column("employees", "next_of_kin_relationship")
    op.drop_column("employees", "next_of_kin_phone")
    op.drop_column("employees", "next_of_kin_name")
    op.drop_column("employees", "address")
    op.drop_column("employees", "date_of_birth")
    op.drop_column("employees", "photo_url")
