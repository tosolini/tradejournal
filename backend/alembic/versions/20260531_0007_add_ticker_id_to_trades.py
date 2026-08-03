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
    # The tickers table was introduced alongside this migration but its
    # create_table step was originally omitted. No database can have 0007
    # applied without it (the FK below fails otherwise), so creating it here is
    # safe; the inspector guard also covers dev databases that already have the
    # table via Base.metadata.create_all.
    conn = op.get_bind()
    if "tickers" not in sa.inspect(conn).get_table_names():
        op.create_table(
            "tickers",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("isin", sa.String(length=20), nullable=True),
            sa.Column("symbol", sa.String(length=32), nullable=False),
            sa.Column("market", sa.String(length=128), nullable=False),
            sa.Column("currency", sa.String(length=8), nullable=True),
            sa.UniqueConstraint("symbol", "market", name="uq_ticker_symbol_market"),
        )
        op.create_index("ix_tickers_name", "tickers", ["name"])
        op.create_index("ix_tickers_isin", "tickers", ["isin"])
        op.create_index("ix_tickers_symbol", "tickers", ["symbol"])
        op.create_index("ix_tickers_market", "tickers", ["market"])
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
