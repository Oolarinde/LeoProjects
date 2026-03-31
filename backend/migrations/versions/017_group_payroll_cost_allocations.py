"""Group payroll — employee cost allocations to subsidiaries.

New table: employee_cost_allocations (employee → subsidiary → percentage).
Allows shared staff costs to be split across group companies.

Revision ID: 017
Revises: 016
Create Date: 2026-03-30
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from alembic import op

revision: str = "017"
down_revision: Union[str, None] = "016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "employee_cost_allocations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("employee_id", UUID(as_uuid=True), sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("percentage", sa.Numeric(7, 4), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("employee_id", "company_id", name="uq_eca_employee_company"),
        sa.CheckConstraint("percentage > 0 AND percentage <= 100", name="ck_eca_percentage_range"),
    )
    op.create_index("ix_eca_employee", "employee_cost_allocations", ["employee_id"])
    op.create_index("ix_eca_company", "employee_cost_allocations", ["company_id"])

    # Backfill: every existing employee gets 100% allocation to their current company
    op.execute(sa.text("""
        INSERT INTO employee_cost_allocations (id, employee_id, company_id, percentage)
        SELECT gen_random_uuid(), id, company_id, 100.0000
        FROM employees
    """))


def downgrade() -> None:
    op.drop_table("employee_cost_allocations")
