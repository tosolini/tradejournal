"""add brokers table and account broker_id

Revision ID: 20260523_0002
Revises: 20260523_0001
Create Date: 2026-05-23
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260523_0002"
down_revision: str | None = "20260523_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "brokers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_brokers_user_id"), "brokers", ["user_id"], unique=False)

    op.add_column("accounts", sa.Column("broker_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_accounts_broker_id_brokers",
        "accounts",
        "brokers",
        ["broker_id"],
        ["id"],
    )
    op.create_index(op.f("ix_accounts_broker_id"), "accounts", ["broker_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_accounts_broker_id"), table_name="accounts")
    op.drop_constraint("fk_accounts_broker_id_brokers", "accounts", type_="foreignkey")
    op.drop_column("accounts", "broker_id")

    op.drop_index(op.f("ix_brokers_user_id"), table_name="brokers")
    op.drop_table("brokers")
