from datetime import datetime, timezone
from decimal import Decimal

from app.services.pnl import compute_weighted_average_pnl


class DummyExecution:
    def __init__(self, action, quantity, price, fee, executed_at):
        self.action = action
        self.quantity = Decimal(quantity)
        self.price = Decimal(price)
        self.fee = Decimal(fee)
        self.executed_at = executed_at


def dt(day: int):
    return datetime(2026, 1, day, 10, 0, tzinfo=timezone.utc)


def test_single_buy_then_sell():
    executions = [
        DummyExecution("BUY", "10", "100", "1", dt(1)),
        DummyExecution("SELL", "10", "110", "1", dt(2)),
    ]
    result = compute_weighted_average_pnl(executions, market_price=Decimal("110"))
    assert result.position_qty == Decimal("0.000000")
    assert result.net_realized_pnl == Decimal("98.000000")
    assert result.unrealized_pnl == Decimal("0.000000")


def test_two_buys_partial_sell():
    executions = [
        DummyExecution("BUY", "10", "100", "0", dt(1)),
        DummyExecution("BUY", "10", "120", "0", dt(2)),
        DummyExecution("SELL", "5", "130", "0", dt(3)),
    ]
    result = compute_weighted_average_pnl(executions, market_price=Decimal("125"))
    assert result.position_qty == Decimal("15.000000")
    assert result.average_entry_price == Decimal("110.000000")
    assert result.net_realized_pnl == Decimal("100.000000")
    assert result.unrealized_pnl == Decimal("225.000000")


def test_fees_on_buy_and_sell():
    executions = [
        DummyExecution("BUY", "10", "100", "5", dt(1)),
        DummyExecution("SELL", "10", "100", "5", dt(2)),
    ]
    result = compute_weighted_average_pnl(executions)
    assert result.net_realized_pnl == Decimal("-10.000000")
    assert result.total_fees == Decimal("10.000000")


def test_open_residual_after_partial_exit():
    executions = [
        DummyExecution("BUY", "20", "50", "0", dt(1)),
        DummyExecution("SELL", "8", "55", "0", dt(2)),
    ]
    result = compute_weighted_average_pnl(executions, market_price=Decimal("53"))
    assert result.position_qty == Decimal("12.000000")
    assert result.net_realized_pnl == Decimal("40.000000")
    assert result.unrealized_pnl == Decimal("36.000000")


def test_realized_separate_from_unrealized():
    executions = [
        DummyExecution("BUY", "5", "200", "0", dt(1)),
        DummyExecution("SELL", "2", "210", "0", dt(2)),
    ]
    result = compute_weighted_average_pnl(executions, market_price=Decimal("190"))
    assert result.net_realized_pnl == Decimal("20.000000")
    assert result.unrealized_pnl == Decimal("-30.000000")


def test_sell_first_opens_short_and_buy_closes():
    executions = [
        DummyExecution("SELL", "10", "14", "0", dt(1)),
        DummyExecution("BUY", "10", "12.30", "0", dt(2)),
    ]
    result = compute_weighted_average_pnl(executions)
    assert result.position_qty == Decimal("0.000000")
    assert result.net_realized_pnl == Decimal("17.000000")
    assert result.gross_proceeds == Decimal("140.000000")
    assert result.gross_invested_amount == Decimal("123.000000")


def test_short_partial_close_keeps_short_entry_price():
    executions = [
        DummyExecution("SELL", "10", "14", "0", dt(1)),
        DummyExecution("BUY", "6", "12", "0", dt(2)),
    ]
    result = compute_weighted_average_pnl(executions, market_price=Decimal("13"))
    assert result.position_qty == Decimal("-4.000000")
    assert result.average_entry_price == Decimal("14.000000")
    assert result.net_realized_pnl == Decimal("12.000000")
    assert result.unrealized_pnl == Decimal("4.000000")


def test_over_close_flips_position_and_opens_opposite():
    executions = [
        DummyExecution("SELL", "10", "14", "0", dt(1)),
        DummyExecution("BUY", "16", "12", "0", dt(2)),
    ]
    result = compute_weighted_average_pnl(executions)
    assert result.position_qty == Decimal("6.000000")
    assert result.average_entry_price == Decimal("12.000000")
    assert result.net_realized_pnl == Decimal("20.000000")
