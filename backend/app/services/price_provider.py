from datetime import date
from decimal import Decimal


def get_mock_close_price(symbol: str, snapshot_date: date) -> Decimal:
    seed = (sum(ord(ch) for ch in symbol) + snapshot_date.toordinal()) % 150
    return Decimal("90") + Decimal(seed) / Decimal("10")
