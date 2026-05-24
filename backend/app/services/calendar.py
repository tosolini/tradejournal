from dataclasses import dataclass
from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.config import settings


@dataclass
class MarketCalendarProvider:
    timezone: str
    cutoff: str

    def is_trading_day(self, day: date) -> bool:
        raise NotImplementedError

    def is_after_cutoff(self, current_dt: datetime) -> bool:
        hours, minutes = [int(part) for part in self.cutoff.split(":")]
        local_dt = current_dt.astimezone(ZoneInfo(self.timezone))
        return (local_dt.hour, local_dt.minute) >= (hours, minutes)


class EuronextCalendarProvider(MarketCalendarProvider):
    def __init__(self) -> None:
        super().__init__(timezone=settings.app_timezone, cutoff=settings.market_close_cutoff)
        self.fixed_holidays = {
            (1, 1),
            (5, 1),
            (12, 25),
            (12, 26),
        }

    def is_trading_day(self, day: date) -> bool:
        if day.weekday() >= 5:
            return False
        if (day.month, day.day) in self.fixed_holidays:
            return False
        return True
