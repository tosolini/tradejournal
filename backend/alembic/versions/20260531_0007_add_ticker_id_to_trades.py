"""add ticker_id to trades

Revision ID: 20260531_0007
Revises: 20260525_0006
Create Date: 2026-05-31
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260531_0007"
down_revision: str | None = "20260525_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("trades", sa.Column("ticker_id", sa.Integer(), nullable=True))
    op.create_index("ix_trades_ticker_id", "trades", ["ticker_id"])
    op.create_foreign_key(
        "trades_ticker_id_fkey", "trades", "tickers", ["ticker_id"], ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("trades_ticker_id_fkey", "trades", type_="foreignkey")
    op.drop_index("ix_trades_ticker_id", table_name="trades")
    op.drop_column("trades", "ticker_id")
