from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.api import accounts, assets, auth, brokers, calendar, dashboard, holdings, notes, portfolio, snapshots, trades, uploads
from app.bootstrap import ensure_seed_admin
from app.config import settings
from app.database import Base, engine
from app.scheduler import start_scheduler, stop_scheduler


def ensure_runtime_schema_compatibility() -> None:
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())

    if "users" in table_names:
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        with engine.begin() as conn:
            if "preferences" not in user_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}'::jsonb"))
                conn.execute(text("UPDATE users SET preferences = '{}'::jsonb WHERE preferences IS NULL"))
                conn.execute(text("ALTER TABLE users ALTER COLUMN preferences SET NOT NULL"))

    if "accounts" not in table_names:
        return

    account_columns = {column["name"] for column in inspector.get_columns("accounts")}
    if "broker_id" in account_columns:
        pass
    else:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE accounts ADD COLUMN broker_id INTEGER"))

    if "brokers" not in table_names:
        return

    broker_columns = {column["name"] for column in inspector.get_columns("brokers")}
    with engine.begin() as conn:
        if "fee_mode" not in broker_columns:
            conn.execute(text("ALTER TABLE brokers ADD COLUMN fee_mode VARCHAR(16) DEFAULT 'fixed'"))
            conn.execute(text("UPDATE brokers SET fee_mode = 'fixed' WHERE fee_mode IS NULL"))
            conn.execute(text("ALTER TABLE brokers ALTER COLUMN fee_mode SET NOT NULL"))
        if "fee_value" not in broker_columns:
            conn.execute(text("ALTER TABLE brokers ADD COLUMN fee_value NUMERIC(18, 6) DEFAULT 0"))
            conn.execute(text("UPDATE brokers SET fee_value = 0 WHERE fee_value IS NULL"))
            conn.execute(text("ALTER TABLE brokers ALTER COLUMN fee_value SET NOT NULL"))
        if "fee_currency" not in broker_columns:
            conn.execute(text("ALTER TABLE brokers ADD COLUMN fee_currency VARCHAR(8) DEFAULT 'EUR'"))
            conn.execute(text("UPDATE brokers SET fee_currency = 'EUR' WHERE fee_currency IS NULL"))
            conn.execute(text("ALTER TABLE brokers ALTER COLUMN fee_currency SET NOT NULL"))
        if "capital_gain_mode" not in broker_columns:
            conn.execute(text("ALTER TABLE brokers ADD COLUMN capital_gain_mode VARCHAR(16) DEFAULT 'immediate'"))
            conn.execute(text("UPDATE brokers SET capital_gain_mode = 'immediate' WHERE capital_gain_mode IS NULL"))
            conn.execute(text("ALTER TABLE brokers ALTER COLUMN capital_gain_mode SET NOT NULL"))
        if "capital_gain_rate" not in broker_columns:
            conn.execute(text("ALTER TABLE brokers ADD COLUMN capital_gain_rate NUMERIC(5, 2) DEFAULT 26"))
            conn.execute(text("UPDATE brokers SET capital_gain_rate = 26 WHERE capital_gain_rate IS NULL"))
            conn.execute(text("ALTER TABLE brokers ALTER COLUMN capital_gain_rate SET NOT NULL"))

    if "trades" not in table_names:
        return

    trade_columns = {column["name"] for column in inspector.get_columns("trades")}
    with engine.begin() as conn:
        if "close_reason" not in trade_columns:
            conn.execute(text("ALTER TABLE trades ADD COLUMN close_reason VARCHAR(32)"))
        if "closed_at" not in trade_columns:
            conn.execute(text("ALTER TABLE trades ADD COLUMN closed_at TIMESTAMP WITH TIME ZONE"))


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_runtime_schema_compatibility()
    ensure_seed_admin()
    start_scheduler()
    try:
        yield
    finally:
        stop_scheduler()


app = FastAPI(title="TradeJournal API", lifespan=lifespan)

allowed_origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(brokers.router)
app.include_router(assets.router)
app.include_router(holdings.router)
app.include_router(portfolio.router)
app.include_router(trades.router)
app.include_router(notes.router)
app.include_router(uploads.router)
app.include_router(dashboard.router)
app.include_router(calendar.router)
app.include_router(snapshots.router)
