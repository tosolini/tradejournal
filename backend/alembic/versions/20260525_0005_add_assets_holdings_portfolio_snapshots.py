"""add assets, holdings, portfolio_snapshots

Revision ID: 20260525_0005
Revises: 20260523_0004
Create Date: 2026-05-25
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision: str = "20260525_0005"
down_revision: str | None = "20260523_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "assets",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("symbol", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("isin", sa.String(length=32), nullable=True),
        sa.Column("instrument_type", sa.String(length=32), nullable=False, server_default="etf"),
        sa.Column("exchange", sa.String(length=80), nullable=True),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="EUR"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_assets_user_id")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_assets")),
        sa.UniqueConstraint("user_id", "symbol", name="uq_asset_user_symbol"),
    )
    op.create_index(op.f("ix_assets_symbol"), "assets", ["symbol"])
    op.create_index(op.f("ix_assets_user_id"), "assets", ["user_id"])

    op.create_table(
        "holdings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("asset_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Numeric(18, 6), nullable=False, server_default=sa.text("0")),
        sa.Column("avg_cost", sa.Numeric(18, 6), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_holdings_user_id")),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], name=op.f("fk_holdings_account_id")),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], name=op.f("fk_holdings_asset_id")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_holdings")),
        sa.UniqueConstraint("account_id", "asset_id", name="uq_holding_account_asset"),
    )
    op.create_index(op.f("ix_holdings_user_id"), "holdings", ["user_id"])
    op.create_index(op.f("ix_holdings_account_id"), "holdings", ["account_id"])
    op.create_index(op.f("ix_holdings_asset_id"), "holdings", ["asset_id"])

    op.create_table(
        "portfolio_snapshots",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("total_value", sa.Numeric(18, 2), nullable=False, server_default=sa.text("0")),
        sa.Column("total_cost", sa.Numeric(18, 2), nullable=False, server_default=sa.text("0")),
        sa.Column("total_return", sa.Numeric(18, 2), nullable=False, server_default=sa.text("0")),
        sa.Column("total_return_pct", sa.Numeric(18, 4), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["account_id"], ["accounts.id"], name=op.f("fk_portfolio_snapshots_account_id")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_portfolio_snapshots")),
        sa.UniqueConstraint("account_id", "snapshot_date", name="uq_portfolio_snapshot_key"),
    )
    op.create_index(op.f("ix_portfolio_snapshots_account_id"), "portfolio_snapshots", ["account_id"])
    op.create_index(op.f("ix_portfolio_snapshots_snapshot_date"), "portfolio_snapshots", ["snapshot_date"])


def downgrade() -> None:
    op.drop_table("portfolio_snapshots")
    op.drop_table("holdings")
    op.drop_table("assets")
