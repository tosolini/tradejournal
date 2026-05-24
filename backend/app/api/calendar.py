from datetime import UTC, date, datetime, time

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import DailyNote, Trade, TradeExecution, User
from app.services.calendar import EuronextCalendarProvider

router = APIRouter(prefix="/api/market-calendar", tags=["market-calendar"])


@router.get("/today")
def market_calendar_today():
    provider = EuronextCalendarProvider()
    now = datetime.now()
    today = now.date()
    return {
        "timezone": provider.timezone,
        "date": today.isoformat(),
        "is_trading_day": provider.is_trading_day(today),
        "is_after_cutoff": provider.is_after_cutoff(now),
        "cutoff": provider.cutoff,
    }


@router.get("/journal-month")
def journal_month(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    month_start = date(year, month, 1)
    if month == 12:
        next_month_start = date(year + 1, 1, 1)
    else:
        next_month_start = date(year, month + 1, 1)

    notes = db.execute(
        select(DailyNote)
        .where(
            DailyNote.user_id == current_user.id,
            DailyNote.note_date >= month_start,
            DailyNote.note_date < next_month_start,
        )
        .order_by(DailyNote.note_date.asc())
    ).scalars().all()

    exec_rows = db.execute(
        select(TradeExecution, Trade.symbol)
        .join(Trade, Trade.id == TradeExecution.trade_id)
        .where(
            Trade.user_id == current_user.id,
            TradeExecution.executed_at >= datetime.combine(month_start, time.min, tzinfo=UTC),
            TradeExecution.executed_at < datetime.combine(next_month_start, time.min, tzinfo=UTC),
        )
        .order_by(TradeExecution.executed_at.desc())
    ).all()

    days: dict[str, dict] = {}
    for note in notes:
        key = note.note_date.isoformat()
        day_bucket = days.setdefault(key, {"date": key, "notes": [], "executions": []})
        day_bucket["notes"].append(
            {
                "id": note.id,
                "mood": note.mood,
                "summary": note.short_summary,
                "text": note.rich_text,
                "market_condition": note.market_condition,
            }
        )

    for execution, symbol in exec_rows:
        key = execution.executed_at.date().isoformat()
        day_bucket = days.setdefault(key, {"date": key, "notes": [], "executions": []})
        # Keep only latest executions per day for calendar readability.
        if len(day_bucket["executions"]) >= 5:
            continue
        day_bucket["executions"].append(
            {
                "id": execution.id,
                "trade_id": execution.trade_id,
                "symbol": symbol,
                "action": execution.action,
                "executed_at": execution.executed_at.isoformat(),
                "quantity": float(execution.quantity),
                "price": float(execution.price),
                "fee": float(execution.fee),
                "currency": execution.currency,
            }
        )

    sorted_days = sorted(days.values(), key=lambda item: item["date"])
    return {
        "year": year,
        "month": month,
        "days": sorted_days,
    }
