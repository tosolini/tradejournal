from collections import defaultdict
from datetime import UTC, date, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import PositionDailySnapshot, Trade, TradeExecution, User
from app.services.pnl import compute_weighted_average_pnl

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/kpis")
def dashboard_kpis(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    trades = db.execute(select(Trade).where(Trade.user_id == current_user.id)).scalars().all()
    currencies: set[str] = set()
    yearly_tax_currency: set[str] = set()
    wins = 0
    losses = 0
    realized = Decimal("0")
    unrealized = Decimal("0")
    open_positions = 0
    current_year = date.today().year
    year_start = datetime(current_year, 1, 1, tzinfo=UTC)
    immediate_tax = Decimal("0")
    year_end_buckets: dict[int, Decimal] = defaultdict(lambda: Decimal("0"))
    year_end_rates: dict[int, Decimal] = {}
    loss_offset = Decimal("0")

    for trade in trades:
        if trade.account and trade.account.base_currency:
            currencies.add(str(trade.account.base_currency).upper())
        executions = db.execute(
            select(TradeExecution).where(TradeExecution.trade_id == trade.id)
        ).scalars().all()
        if not executions:
            continue
        if trade.status == "close":
            closed_at = trade.closed_at or max(execution.executed_at for execution in executions)
            if closed_at.tzinfo is None:
                closed_at = closed_at.replace(tzinfo=UTC)
            if closed_at >= year_start:
                pnl = compute_weighted_average_pnl(executions)
                broker = trade.account.broker if trade.account and trade.account.broker else None
                broker_id = broker.id if broker else trade.account_id
                mode = str(broker.capital_gain_mode if broker else "immediate").lower()
                rate = Decimal(str(broker.capital_gain_rate if broker else Decimal("26")))
                yearly_tax_currency.add((trade.account.base_currency if trade.account else "EUR").upper())
                if mode == "year_end":
                    year_end_buckets[broker_id] += pnl.net_realized_pnl
                    year_end_rates[broker_id] = rate
                else:
                    taxable = pnl.net_realized_pnl if pnl.net_realized_pnl > 0 else Decimal("0")
                    immediate_tax += taxable * rate / Decimal("100")
                    if pnl.net_realized_pnl < 0:
                        loss_offset += abs(pnl.net_realized_pnl)
        pnl = compute_weighted_average_pnl(executions)
        realized += pnl.net_realized_pnl
        unrealized += pnl.unrealized_pnl
        if pnl.net_realized_pnl > 0:
            wins += 1
        elif pnl.net_realized_pnl < 0:
            losses += 1
        if pnl.position_qty > 0:
            open_positions += 1

    for broker_id, net_pnl in year_end_buckets.items():
        rate = year_end_rates.get(broker_id, Decimal("26"))
        if net_pnl > 0:
            immediate_tax += net_pnl * rate / Decimal("100")
        else:
            loss_offset += abs(net_pnl)

    snapshots = db.execute(select(PositionDailySnapshot)).scalars().all()
    equity_curve = [
        {
            "date": s.snapshot_date.isoformat(),
            "value": float(s.market_value + s.realized_pnl + s.unrealized_pnl),
        }
        for s in snapshots
    ]

    kpi_currency = "EUR"
    if len(currencies) == 1:
        kpi_currency = next(iter(currencies))
    elif len(currencies) > 1:
        kpi_currency = "MIX"

    tax_currency = next(iter(yearly_tax_currency), kpi_currency)

    return {
        "trade_count": len(trades),
        "wins": wins,
        "losses": losses,
        "open_positions": open_positions,
        "realized_pnl": str(realized),
        "unrealized_pnl": str(unrealized),
        "total_pnl": str(realized + unrealized),
        "kpi_currency": kpi_currency,
        "capital_gain_tax_estimate": str(immediate_tax),
        "capital_gain_loss_offset": str(loss_offset),
        "capital_gain_currency": tax_currency,
        "equity_curve": equity_curve,
    }
