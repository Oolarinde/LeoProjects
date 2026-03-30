"""Fix employee_ref unique constraint to compound (company_id, employee_ref),
add missing indexes on company_id foreign keys for locations, accounts, employees, reference_data.

Note: ondelete CASCADE on units.location_id FK is documented but not applied here —
changing FK on-delete behavior requires careful data review and should be done as a
separate migration after confirming no orphan-cleanup concerns.

Revision ID: 005
Revises: 004
Create Date: 2026-03-29
"""
from typing import Sequence, Union

from alembic import op

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Fix employee_ref: drop global unique, add compound unique (company_id, employee_ref) ---
    op.drop_constraint("employees_employee_ref_key", "employees", type_="unique")
    op.create_unique_constraint(
        "uq_employees_company_employee_ref", "employees", ["company_id", "employee_ref"]
    )

    # --- Add missing indexes on company_id FKs ---
    op.create_index("ix_locations_company_id", "locations", ["company_id"])
    op.create_index("ix_accounts_company_id", "accounts", ["company_id"])
    op.create_index("ix_employees_company_id", "employees", ["company_id"])
    op.create_index("ix_reference_data_company_id", "reference_data", ["company_id"])


def downgrade() -> None:
    # --- Remove indexes ---
    op.drop_index("ix_reference_data_company_id", "reference_data")
    op.drop_index("ix_employees_company_id", "employees")
    op.drop_index("ix_accounts_company_id", "accounts")
    op.drop_index("ix_locations_company_id", "locations")

    # --- Restore original employee_ref constraint ---
    op.drop_constraint("uq_employees_company_employee_ref", "employees", type_="unique")
    op.create_unique_constraint("employees_employee_ref_key", "employees", ["employee_ref"])
