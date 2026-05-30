from datetime import datetime
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler

from app.config import settings
from app.database import SessionLocal
from app.services.calendar import EuronextCalendarProvider
from app.models import User
from app.services.portfolio import recompute_portfolio_snapshot
from app.services.snapshot import recompute_daily_snapshots

scheduler = BackgroundScheduler(timezone=settings.app_timezone)


def run_daily_snapshot_job() -> None:
    provider = EuronextCalendarProvider()
    now = datetime.now(ZoneInfo(settings.app_timezone))
    if not provider.is_trading_day(now.date()) or not provider.is_after_cutoff(now):
        return

    with SessionLocal() as db:
        recompute_daily_snapshots(db, now.date())
        for user in db.execute(select(User)).scalars().all():
            recompute_portfolio_snapshot(db, now.date(), user.id)


def start_scheduler() -> None:
    scheduler.add_job(
        run_daily_snapshot_job,
        trigger="cron",
        day_of_week="mon-fri",
        hour=17,
        minute=35,
        id="daily_mtm_snapshots",
        replace_existing=True,
    )
    scheduler.start()


def stop_scheduler() -> None:
    scheduler.shutdown(wait=False)
