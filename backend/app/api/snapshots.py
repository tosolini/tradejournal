from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import PortfolioSnapshot, PositionDailySnapshot, User
from app.schemas import PortfolioSnapshotResponse, SnapshotResponse
from app.services.portfolio import recompute_portfolio_snapshot
from app.services.snapshot import recompute_daily_snapshots

router = APIRouter(prefix="/api/snapshots", tags=["snapshots"])


@router.post("/recompute")
def recompute_snapshots(
    snapshot_date: date = Query(default_factory=date.today),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    count = recompute_daily_snapshots(db, snapshot_date)
    return {"upserts": count, "snapshot_date": snapshot_date.isoformat()}


@router.get("", response_model=list[SnapshotResponse])
def list_snapshots(
    db: Session = Depends(get_db), _current_user: User = Depends(get_current_user)
):
    return db.execute(
        select(PositionDailySnapshot).order_by(PositionDailySnapshot.snapshot_date.desc())
    ).scalars().all()


@router.post("/portfolio/recompute")
def recompute_portfolio_snapshots(
    snapshot_date: date = Query(default_factory=date.today),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = recompute_portfolio_snapshot(db, snapshot_date, current_user.id)
    return {"upserts": count, "snapshot_date": snapshot_date.isoformat()}


@router.get("/portfolio", response_model=list[PortfolioSnapshotResponse])
def list_portfolio_snapshots(
    db: Session = Depends(get_db), _current_user: User = Depends(get_current_user)
):
    return db.execute(
        select(PortfolioSnapshot).order_by(PortfolioSnapshot.snapshot_date.desc())
    ).scalars().all()
