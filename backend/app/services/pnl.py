from dataclasses import dataclass
from decimal import Decimal

from app.models import TradeExecution


@dataclass
class PnLSummary:
    position_qty: Decimal
    average_entry_price: Decimal
    gross_invested_amount: Decimal
    gross_proceeds: Decimal
    total_fees: Decimal
    net_realized_pnl: Decimal
    unrealized_pnl: Decimal
    market_value: Decimal
    return_pct: Decimal


def quantize(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.000001"))


def compute_weighted_average_pnl(
    executions: list[TradeExecution], market_price: Decimal | None = None
) -> PnLSummary:
    qty = Decimal("0")
    average_cost = Decimal("0")
    invested = Decimal("0")
    proceeds = Decimal("0")
    fees = Decimal("0")
    realized = Decimal("0")

    for ex in sorted(executions, key=lambda item: item.executed_at):
        ex_qty = Decimal(str(ex.quantity))
        ex_price = Decimal(str(ex.price))
        ex_fee = Decimal(str(ex.fee))
        fees += ex_fee

        if ex.action.upper() == "BUY":
            total_cost = average_cost * qty + ex_price * ex_qty + ex_fee
            qty += ex_qty
            average_cost = Decimal("0") if qty == 0 else total_cost / qty
            invested += ex_price * ex_qty
        elif ex.action.upper() == "SELL":
            if ex_qty > qty:
                raise ValueError("Sell quantity exceeds open position")
            proceeds += ex_price * ex_qty
            realized += (ex_price * ex_qty - ex_fee) - (average_cost * ex_qty)
            qty -= ex_qty
            if qty == 0:
                average_cost = Decimal("0")
        else:
            raise ValueError(f"Unsupported action: {ex.action}")

    reference_market_price = Decimal(str(market_price)) if market_price is not None else average_cost
    market_value = reference_market_price * qty
    unrealized = (reference_market_price - average_cost) * qty
    pnl_base = invested if invested != 0 else Decimal("1")
    return_pct = (realized + unrealized) / pnl_base * Decimal("100")

    return PnLSummary(
        position_qty=quantize(qty),
        average_entry_price=quantize(average_cost),
        gross_invested_amount=quantize(invested),
        gross_proceeds=quantize(proceeds),
        total_fees=quantize(fees),
        net_realized_pnl=quantize(realized),
        unrealized_pnl=quantize(unrealized),
        market_value=quantize(market_value),
        return_pct=quantize(return_pct),
    )
