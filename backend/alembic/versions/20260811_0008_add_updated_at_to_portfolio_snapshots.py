"""add updated_at to portfolio_snapshots

Revision ID: 20260811_0008
Revises: 20260531_0007
Create Date: 2026-08-11
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260811_0008"
down_revision: str | None = "20260531_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # portfolio_snapshots was created in 20260525_0005 without updated_at while
    # the TimestampMixin model selects it, so every query failed with
    # "column portfolio_snapshots.updated_at does not exist". server_default
    # backfills existing rows.
    op.add_column(
        "portfolio_snapshots",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("portfolio_snapshots", "updated_at")