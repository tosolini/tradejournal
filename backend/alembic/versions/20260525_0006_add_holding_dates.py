"""add entry_date and exit_date to holdings

Revision ID: 20260525_0006
Revises: 20260525_0005
Create Date: 2026-05-25
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260525_0006"
down_revision: str | None = "20260525_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("holdings", sa.Column("entry_date", sa.Date(), nullable=True))
    op.add_column("holdings", sa.Column("exit_date", sa.Date(), nullable=True))
    op.execute("UPDATE holdings SET entry_date = created_at::date WHERE entry_date IS NULL")
    op.alter_column("holdings", "entry_date", nullable=False)


def downgrade() -> None:
    op.drop_column("holdings", "exit_date")
    op.drop_column("holdings", "entry_date")
