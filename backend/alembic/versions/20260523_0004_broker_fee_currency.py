"""add broker fee currency

Revision ID: 20260523_0004
Revises: 20260523_0003
Create Date: 2026-05-23
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260523_0004"
down_revision: str | None = "20260523_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "brokers",
        sa.Column("fee_currency", sa.String(length=8), nullable=False, server_default="EUR"),
    )


def downgrade() -> None:
    op.drop_column("brokers", "fee_currency")
