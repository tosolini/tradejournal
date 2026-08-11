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
    # Signed position: positive = long, negative = short. A leg that matches
    # the current position's direction (or finds a flat book) opens/augments;
    # an opposite leg closes it (realizing pnl), and if it over-closes, the
    # remainder flips the position and opens the other direction at that price.
    position = Decimal("0")
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
        action = ex.action.upper()
        if action not in ("BUY", "SELL"):
            raise ValueError(f"Unsupported action: {ex.action}")

        signed_qty = ex_qty if action == "BUY" else -ex_qty
        closing = position != 0 and (position > 0) != (signed_qty > 0)

        if not closing:
            # Opening/augmenting leg — fee folds into the average basis.
            new_position = position + signed_qty
            basis = average_cost * abs(position) + ex_price * ex_qty + ex_fee
            average_cost = basis / abs(new_position) if new_position != 0 else Decimal("0")
            position = new_position
        else:
            close_qty = min(ex_qty, abs(position))
            if position > 0:  # long close (SELL)
                realized += (ex_price - average_cost) * close_qty - ex_fee
            else:  # short close (BUY)
                realized += (average_cost - ex_price) * close_qty - ex_fee
            position += signed_qty
            if position == 0:
                average_cost = Decimal("0")
            elif (position > 0) != ((position - signed_qty) > 0):
                # Over-closed: the remainder opens the opposite direction here.
                average_cost = ex_price

        if action == "BUY":
            invested += ex_price * ex_qty
        else:
            proceeds += ex_price * ex_qty

    reference_market_price = Decimal(str(market_price)) if market_price is not None else average_cost
    market_value = reference_market_price * abs(position)
    unrealized = (reference_market_price - average_cost) * position
    pnl_base = invested if invested != 0 else Decimal("1")
    return_pct = (realized + unrealized) / pnl_base * Decimal("100")

    return PnLSummary(
        position_qty=quantize(position),
        average_entry_price=quantize(average_cost),
        gross_invested_amount=quantize(invested),
        gross_proceeds=quantize(proceeds),
        total_fees=quantize(fees),
        net_realized_pnl=quantize(realized),
        unrealized_pnl=quantize(unrealized),
        market_value=quantize(market_value),
        return_pct=quantize(return_pct),
    )