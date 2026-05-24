from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import PositionDailySnapshot, User
from app.schemas import SnapshotResponse
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
