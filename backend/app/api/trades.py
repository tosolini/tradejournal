from datetime import UTC, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Account, Broker, Trade, TradeExecution, TradeImage, User
from app.schemas import (
    ExecutionCreate,
    ExecutionResponse,
    ExecutionUpdate,
    TradeCloseRequest,
    TradeClosureSummary,
    RecentExecutionResponse,
    TradeCreate,
    TradeDetailResponse,
    TradeResponse,
    TradeUpdate,
    TradeImageResponse,
)
from app.services.pnl import compute_weighted_average_pnl

router = APIRouter(prefix="/api/trades", tags=["trades"])


def _quantize(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.000001"))


def _compute_execution_fee(trade: Trade, quantity: Decimal, price: Decimal) -> Decimal:
    broker = trade.account.broker if trade.account else None
    if not broker:
        return Decimal("0")

    fee_mode = str(broker.fee_mode or "fixed").lower()
    fee_value = Decimal(str(broker.fee_value or Decimal("0")))
    if fee_value < 0:
        fee_value = Decimal("0")

    if fee_mode == "percent":
        notional = Decimal(str(quantity)) * Decimal(str(price))
        return _quantize((notional * fee_value) / Decimal("100"))
    return _quantize(fee_value)


def _trade_currency(trade: Trade) -> str:
    return trade.account.base_currency if trade.account and trade.account.base_currency else "EUR"


def _close_action(side: str) -> str:
    return "SELL" if side == "long" else "BUY"


def _capital_gain_tax(net_pnl: Decimal, broker: Broker | None) -> tuple[str, Decimal, Decimal | None, str | None]:
    mode = str(broker.capital_gain_mode or "immediate").lower() if broker else "immediate"
    rate = Decimal(str(broker.capital_gain_rate or Decimal("26"))) if broker else Decimal("26")
    if mode == "year_end":
        return mode, rate, None, "Calcolo fiscale rinviato a fine anno nel dashboard"
    taxable = net_pnl if net_pnl > 0 else Decimal("0")
    tax = _quantize((taxable * rate) / Decimal("100"))
    return mode, rate, tax, None


def _trade_closure_summary(trade: Trade, executions: list[TradeExecution]) -> TradeClosureSummary | None:
    if not executions or trade.status != "close":
        return None

    pnl = compute_weighted_average_pnl(executions)
    exit_execution = sorted(executions, key=lambda item: item.executed_at)[-1]
    broker = trade.account.broker if trade.account and trade.account.broker else None
    capital_gain_mode, capital_gain_rate, capital_gain_tax_estimate, tax_note = _capital_gain_tax(
        pnl.net_realized_pnl, broker
    )
    gross_pnl = _quantize(pnl.net_realized_pnl + pnl.total_fees)

    return TradeClosureSummary(
        closed_at=trade.closed_at or exit_execution.executed_at,
        close_reason=trade.close_reason,
        exit_action=exit_execution.action,
        exit_price=_quantize(Decimal(str(exit_execution.price))),
        exit_fee=_quantize(Decimal(str(exit_execution.fee))),
        exit_currency=exit_execution.currency,
        gross_pnl=gross_pnl,
        net_pnl=_quantize(pnl.net_realized_pnl),
        capital_gain_mode=capital_gain_mode,
        capital_gain_rate=_quantize(capital_gain_rate),
        capital_gain_tax_estimate=capital_gain_tax_estimate,
        tax_note=tax_note,
        total_fees=_quantize(pnl.total_fees),
    )


def _trade_response_with_metrics(trade: Trade, executions: list[TradeExecution]) -> TradeResponse:
    if not executions:
        response = TradeResponse.model_validate(trade)
        payload = response.model_dump()
        payload["account_currency"] = trade.account.base_currency if trade.account else "EUR"
        payload["close_reason"] = trade.close_reason
        payload["closed_at"] = trade.closed_at
        return TradeResponse.model_validate(payload)

    buys = [ex for ex in executions if ex.action.upper() == "BUY"]
    sells = [ex for ex in executions if ex.action.upper() == "SELL"]

    buy_qty = sum((Decimal(str(ex.quantity)) for ex in buys), Decimal("0"))
    sell_qty = sum((Decimal(str(ex.quantity)) for ex in sells), Decimal("0"))
    entry_total = sum((Decimal(str(ex.price)) * Decimal(str(ex.quantity)) for ex in buys), Decimal("0"))
    exit_total = sum((Decimal(str(ex.price)) * Decimal(str(ex.quantity)) for ex in sells), Decimal("0"))

    avg_entry = entry_total / buy_qty if buy_qty > 0 else None
    avg_exit = exit_total / sell_qty if sell_qty > 0 else None

    earliest_exec = min(ex.executed_at for ex in executions)
    latest_exec = max(ex.executed_at for ex in executions)

    if earliest_exec.tzinfo is None:
        earliest_exec = earliest_exec.replace(tzinfo=UTC)
    if latest_exec.tzinfo is None:
        latest_exec = latest_exec.replace(tzinfo=UTC)

    hold_end = latest_exec if sells else datetime.now(UTC)
    hold_hours = Decimal(str((hold_end - earliest_exec).total_seconds() / 3600))

    pnl = compute_weighted_average_pnl(executions)
    net_return = pnl.net_realized_pnl + pnl.unrealized_pnl

    payload = {
        "id": trade.id,
        "account_id": trade.account_id,
        "market": trade.market,
        "symbol": trade.symbol,
        "side": trade.side,
        "status": trade.status,
        "strategy_name": trade.strategy_name,
        "tags": trade.tags,
        "target_price": trade.target_price,
        "stop_loss": trade.stop_loss,
        "confidence_score": trade.confidence_score,
        "journal_notes": trade.journal_notes,
        "account_currency": trade.account.base_currency if trade.account else "EUR",
        "created_at": trade.created_at,
        "average_entry_price": _quantize(avg_entry) if avg_entry is not None else None,
        "average_exit_price": _quantize(avg_exit) if avg_exit is not None else None,
        "entry_total": _quantize(entry_total),
        "exit_total": _quantize(exit_total),
        "open_position_qty": pnl.position_qty,
        "hold_duration_hours": _quantize(hold_hours),
        "net_return": _quantize(net_return),
        "return_pct": pnl.return_pct,
    }
    return TradeResponse.model_validate(payload)


@router.post("", response_model=TradeResponse)
def create_trade(
    payload: TradeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = db.get(Account, payload.account_id)
    if not account or account.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Account not found")

    trade = Trade(user_id=current_user.id, **payload.model_dump())
    db.add(trade)
    db.commit()
    db.refresh(trade)
    return TradeResponse.model_validate(trade)


@router.get("", response_model=list[TradeResponse])
def list_trades(
    account_id: int | None = Query(default=None),
    symbol: str | None = Query(default=None),
    status: str | None = Query(default=None),
    side: str | None = Query(default=None),
    from_date: datetime | None = Query(default=None),
    to_date: datetime | None = Query(default=None),
    limit: int = Query(default=100, le=200),
    offset: int = Query(default=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Trade).where(Trade.user_id == current_user.id)
    if account_id is not None:
        stmt = stmt.where(Trade.account_id == account_id)
    if symbol:
        stmt = stmt.where(Trade.symbol == symbol)
    if status:
        stmt = stmt.where(Trade.status == status)
    if side:
        stmt = stmt.where(Trade.side == side)
    if from_date:
        stmt = stmt.where(Trade.created_at >= from_date)
    if to_date:
        stmt = stmt.where(Trade.created_at <= to_date)
    stmt = stmt.order_by(Trade.created_at.desc()).limit(limit).offset(offset)
    trades = db.execute(stmt).scalars().all()

    responses: list[TradeResponse] = []
    for trade in trades:
        executions = db.execute(
            select(TradeExecution).where(TradeExecution.trade_id == trade.id)
        ).scalars().all()
        responses.append(_trade_response_with_metrics(trade, executions))
    return responses


@router.get("/{trade_id}", response_model=TradeDetailResponse)
def trade_detail(
    trade_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trade = db.get(Trade, trade_id)
    if not trade or trade.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Trade not found")
    executions = db.execute(
        select(TradeExecution).where(TradeExecution.trade_id == trade.id)
    ).scalars().all()
    images = db.execute(select(TradeImage).where(TradeImage.trade_id == trade.id)).scalars().all()
    pnl = compute_weighted_average_pnl(executions) if executions else None
    closure = _trade_closure_summary(trade, executions)
    return {
        "trade": _trade_response_with_metrics(trade, executions),
        "executions": [ExecutionResponse.model_validate(ex) for ex in executions],
        "images": [TradeImageResponse.model_validate(image) for image in images],
        "pnl": pnl.__dict__ if pnl else None,
        "closure": closure.model_dump() if closure else None,
    }


@router.post("/{trade_id}/executions", response_model=ExecutionResponse)
def add_execution(
    trade_id: int,
    payload: ExecutionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trade = db.get(Trade, trade_id)
    if not trade or trade.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Trade not found")

    data = payload.model_dump()
    quantity = Decimal(str(data["quantity"]))
    price = Decimal(str(data["price"]))
    data["fee"] = _compute_execution_fee(trade, quantity, price)

    execution = TradeExecution(trade_id=trade.id, **data)
    db.add(execution)
    db.commit()
    db.refresh(execution)
    return execution


@router.post("/{trade_id}/close", response_model=TradeDetailResponse)
def close_trade(
    trade_id: int,
    payload: TradeCloseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trade = db.get(Trade, trade_id)
    if not trade or trade.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Trade not found")
    if trade.status == "close":
        raise HTTPException(status_code=400, detail="Trade already closed")

    executions = db.execute(
        select(TradeExecution).where(TradeExecution.trade_id == trade.id)
    ).scalars().all()
    pnl = compute_weighted_average_pnl(executions) if executions else None
    if not pnl or pnl.position_qty <= 0:
        raise HTTPException(status_code=400, detail="No open position to close")

    closing_quantity = pnl.position_qty
    closing_action = _close_action(trade.side)
    closing_fee = _compute_execution_fee(trade, closing_quantity, payload.price)
    closing_execution = TradeExecution(
        trade_id=trade.id,
        action=closing_action,
        executed_at=payload.executed_at,
        quantity=closing_quantity,
        price=payload.price,
        fee=closing_fee,
        currency=_trade_currency(trade),
        note=payload.note or payload.close_reason,
    )
    trade.status = "close"
    trade.close_reason = payload.close_reason
    trade.closed_at = payload.executed_at

    db.add(closing_execution)
    db.commit()
    db.refresh(trade)
    db.refresh(closing_execution)

    return trade_detail(trade_id, db=db, current_user=current_user)


@router.patch("/{trade_id}", response_model=TradeResponse)
def update_trade(
    trade_id: int,
    payload: TradeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trade = db.get(Trade, trade_id)
    if not trade or trade.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Trade not found")

    updates = payload.model_dump(exclude_unset=True)
    if "account_id" in updates and updates["account_id"] is not None:
        account = db.get(Account, updates["account_id"])
        if not account or account.user_id != current_user.id:
            raise HTTPException(status_code=400, detail="Account not found")

    for field, value in updates.items():
        setattr(trade, field, value)

    db.commit()
    db.refresh(trade)
    executions = db.execute(
        select(TradeExecution).where(TradeExecution.trade_id == trade.id)
    ).scalars().all()
    return _trade_response_with_metrics(trade, executions)


@router.patch("/{trade_id}/executions/{execution_id}", response_model=ExecutionResponse)
def update_execution(
    trade_id: int,
    execution_id: int,
    payload: ExecutionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trade = db.get(Trade, trade_id)
    if not trade or trade.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Trade not found")

    execution = db.get(TradeExecution, execution_id)
    if not execution or execution.trade_id != trade.id:
        raise HTTPException(status_code=404, detail="Execution not found")

    updates = payload.model_dump(exclude_unset=True)

    next_quantity = Decimal(str(updates.get("quantity", execution.quantity)))
    next_price = Decimal(str(updates.get("price", execution.price)))
    updates["fee"] = _compute_execution_fee(trade, next_quantity, next_price)

    for field, value in updates.items():
        setattr(execution, field, value)

    db.commit()
    db.refresh(execution)
    return execution


@router.get("/executions/recent", response_model=list[RecentExecutionResponse])
def recent_executions(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = db.execute(
        select(TradeExecution, Trade.symbol)
        .join(Trade, Trade.id == TradeExecution.trade_id)
        .where(Trade.user_id == current_user.id)
        .order_by(TradeExecution.executed_at.desc())
        .limit(limit)
    ).all()

    return [
        RecentExecutionResponse(
            id=execution.id,
            trade_id=execution.trade_id,
            trade_symbol=symbol,
            action=execution.action,
            executed_at=execution.executed_at,
            quantity=execution.quantity,
            price=execution.price,
            fee=execution.fee,
            currency=execution.currency,
        )
        for execution, symbol in rows
    ]


@router.delete("/{trade_id}")
def delete_trade(
    trade_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trade = db.get(Trade, trade_id)
    if not trade or trade.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Trade not found")

    db.delete(trade)
    db.commit()
    return {"deleted": True, "trade_id": trade_id}
