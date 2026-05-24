from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str = Field(min_length=8)


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    username: str
    role: str

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    username_or_email: str
    password: str


class UserPreferencesResponse(BaseModel):
    preferences: dict[str, Any] = Field(default_factory=dict)


class UserPreferencesUpdate(BaseModel):
    preferences: dict[str, Any] = Field(default_factory=dict)


class AccountCreate(BaseModel):
    name: str
    broker_id: int | None = None
    base_currency: str = "EUR"
    cash_balance: Decimal = Decimal("0")


class AccountUpdate(BaseModel):
    name: str | None = None
    broker_id: int | None = None
    base_currency: str | None = None
    cash_balance: Decimal | None = None


class AccountResponse(BaseModel):
    id: int
    name: str
    broker_id: int | None
    broker_name: str | None = None
    base_currency: str
    cash_balance: Decimal

    model_config = ConfigDict(from_attributes=True)


class BrokerCreate(BaseModel):
    name: str
    fee_mode: str = "fixed"
    fee_value: Decimal = Decimal("0")
    fee_currency: str = "EUR"
    capital_gain_mode: str = "immediate"
    capital_gain_rate: Decimal = Decimal("26")


class BrokerUpdate(BaseModel):
    name: str | None = None
    fee_mode: str | None = None
    fee_value: Decimal | None = None
    fee_currency: str | None = None
    capital_gain_mode: str | None = None
    capital_gain_rate: Decimal | None = None


class BrokerResponse(BaseModel):
    id: int
    name: str
    fee_mode: str
    fee_value: Decimal
    fee_currency: str
    capital_gain_mode: str
    capital_gain_rate: Decimal

    model_config = ConfigDict(from_attributes=True)


class TradeCreate(BaseModel):
    account_id: int
    market: str = "Euronext"
    symbol: str
    isin: Optional[str] = None
    instrument_type: str = "stock"
    side: str = "long"
    status: str = "open"
    strategy_name: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    target_price: Optional[Decimal] = None
    stop_loss: Optional[Decimal] = None
    confidence_score: Optional[int] = None
    journal_notes: Optional[str] = None


class TradeUpdate(BaseModel):
    account_id: Optional[int] = None
    market: Optional[str] = None
    symbol: Optional[str] = None
    isin: Optional[str] = None
    instrument_type: Optional[str] = None
    side: Optional[str] = None
    status: Optional[str] = None
    strategy_name: Optional[str] = None
    tags: Optional[list[str]] = None
    target_price: Optional[Decimal] = None
    stop_loss: Optional[Decimal] = None
    confidence_score: Optional[int] = None
    journal_notes: Optional[str] = None


class TradeResponse(BaseModel):
    id: int
    account_id: int
    market: str
    symbol: str
    side: str
    status: str
    strategy_name: Optional[str]
    tags: list[str]
    target_price: Optional[Decimal]
    stop_loss: Optional[Decimal]
    confidence_score: Optional[int]
    journal_notes: Optional[str]
    account_currency: Optional[str] = None
    close_reason: Optional[str] = None
    closed_at: Optional[datetime] = None
    created_at: datetime
    average_entry_price: Optional[Decimal] = None
    average_exit_price: Optional[Decimal] = None
    entry_total: Optional[Decimal] = None
    exit_total: Optional[Decimal] = None
    open_position_qty: Optional[Decimal] = None
    hold_duration_hours: Optional[Decimal] = None
    net_return: Optional[Decimal] = None
    return_pct: Optional[Decimal] = None

    model_config = ConfigDict(from_attributes=True)


class ExecutionCreate(BaseModel):
    action: str
    executed_at: datetime
    quantity: Decimal
    price: Decimal
    fee: Decimal = Decimal("0")
    currency: str = "EUR"
    venue: Optional[str] = None
    note: Optional[str] = None


class ExecutionUpdate(BaseModel):
    action: Optional[str] = None
    executed_at: Optional[datetime] = None
    quantity: Optional[Decimal] = None
    price: Optional[Decimal] = None
    fee: Optional[Decimal] = None
    currency: Optional[str] = None
    venue: Optional[str] = None
    note: Optional[str] = None


class ExecutionResponse(BaseModel):
    id: int
    trade_id: int
    action: str
    executed_at: datetime
    quantity: Decimal
    price: Decimal
    fee: Decimal
    currency: str

    model_config = ConfigDict(from_attributes=True)


class TradeCloseRequest(BaseModel):
    executed_at: datetime
    price: Decimal
    close_reason: str = "manual"
    note: Optional[str] = None


class TradeClosureSummary(BaseModel):
    closed_at: datetime
    close_reason: Optional[str]
    exit_action: str
    exit_price: Decimal
    exit_fee: Decimal
    exit_currency: str
    gross_pnl: Decimal
    net_pnl: Decimal
    capital_gain_mode: str
    capital_gain_rate: Decimal
    capital_gain_tax_estimate: Optional[Decimal] = None
    tax_note: Optional[str] = None
    total_fees: Decimal


class TradeImageResponse(BaseModel):
    id: int
    trade_id: int
    original_path: str
    annotated_path: Optional[str]
    mime_type: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class RecentExecutionResponse(BaseModel):
    id: int
    trade_id: int
    trade_symbol: str
    action: str
    executed_at: datetime
    quantity: Decimal
    price: Decimal
    fee: Decimal
    currency: str


class TradeDetailResponse(BaseModel):
    trade: TradeResponse
    executions: list[ExecutionResponse]
    images: list[TradeImageResponse]
    pnl: dict | None
    closure: TradeClosureSummary | None = None


class DailyNoteCreate(BaseModel):
    note_date: date
    mood: Optional[str] = None
    market_condition: Optional[str] = None
    market_volatility: Optional[str] = None
    short_summary: Optional[str] = None
    rich_text: Optional[str] = None


class DailyNoteUpdate(BaseModel):
    note_date: Optional[date] = None
    mood: Optional[str] = None
    market_condition: Optional[str] = None
    market_volatility: Optional[str] = None
    short_summary: Optional[str] = None
    rich_text: Optional[str] = None


class MarketConditionTagRenameRequest(BaseModel):
    old_tag: str
    new_tag: str


class MarketConditionTagDeleteRequest(BaseModel):
    tag: str


class DailyNoteResponse(BaseModel):
    id: int
    note_date: date
    mood: Optional[str]
    market_condition: Optional[str]
    market_volatility: Optional[str]
    short_summary: Optional[str]
    rich_text: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class SnapshotResponse(BaseModel):
    id: int
    account_id: int
    symbol: str
    snapshot_date: date
    position_qty: Decimal
    close_price: Decimal
    market_value: Decimal
    realized_pnl: Decimal
    unrealized_pnl: Decimal

    model_config = ConfigDict(from_attributes=True)
