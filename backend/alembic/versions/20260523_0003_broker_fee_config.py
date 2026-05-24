"""add broker fee configuration fields

Revision ID: 20260523_0003
Revises: 20260523_0002
Create Date: 2026-05-23
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260523_0003"
down_revision: str | None = "20260523_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("brokers", sa.Column("fee_mode", sa.String(length=16), nullable=False, server_default="fixed"))
    op.add_column(
        "brokers",
        sa.Column("fee_value", sa.Numeric(precision=18, scale=6), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("brokers", "fee_value")
    op.drop_column("brokers", "fee_mode")
