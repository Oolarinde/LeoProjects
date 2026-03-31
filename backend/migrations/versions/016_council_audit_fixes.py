"""Council audit fixes — add void fields to consolidation_adjustments, updated_by to allocation_rules.

Revision ID: 016
Revises: 015
Create Date: 2026-03-30
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from alembic import op

revision: str = "016"
down_revision: Union[str, None] = "015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ConsolidationAdjustment — void/audit fields (LEDGER requirement)
    op.add_column("consolidation_adjustments", sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True))
    op.add_column("consolidation_adjustments", sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True))
    op.add_column("consolidation_adjustments", sa.Column("is_voided", sa.Boolean, nullable=False, server_default="false"))
    op.add_column("consolidation_adjustments", sa.Column("void_reason", sa.Text, nullable=True))
    op.add_column("consolidation_adjustments", sa.Column("voided_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True))
    op.add_column("consolidation_adjustments", sa.Column("voided_at", sa.DateTime(timezone=True), nullable=True))

    # AllocationRule — updated_by field (audit traceability)
    op.add_column("allocation_rules", sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True))


def downgrade() -> None:
    op.drop_column("allocation_rules", "updated_by")
    op.drop_column("consolidation_adjustments", "voided_at")
    op.drop_column("consolidation_adjustments", "voided_by")
    op.drop_column("consolidation_adjustments", "void_reason")
    op.drop_column("consolidation_adjustments", "is_voided")
    op.drop_column("consolidation_adjustments", "updated_by")
    op.drop_column("consolidation_adjustments", "updated_at")
