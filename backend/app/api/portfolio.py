from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import PortfolioSnapshot, User
from app.schemas import HoldingDetailResponse, PortfolioHistoryPoint, PortfolioSummaryResponse
from app.services.portfolio import get_holding_details, get_portfolio_summary

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.get("/details", response_model=list[HoldingDetailResponse])
def portfolio_details(
    account_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_holding_details(db, current_user.id, account_id)


@router.get("/summary", response_model=list[PortfolioSummaryResponse])
def portfolio_summary(
    account_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_portfolio_summary(db, current_user.id, account_id)


@router.get("/history", response_model=list[PortfolioHistoryPoint])
def portfolio_history(
    account_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(PortfolioSnapshot).order_by(PortfolioSnapshot.snapshot_date)
    if account_id is not None:
        query = query.where(
            PortfolioSnapshot.account_id == account_id,
        )

    snapshots = db.execute(query).scalars().all()

    return [
        PortfolioHistoryPoint(
            date=s.snapshot_date.isoformat(),
            value=float(s.total_value),
            cost=float(s.total_cost),
            return_pct=float(s.total_return_pct),
        )
        for s in snapshots
    ]
