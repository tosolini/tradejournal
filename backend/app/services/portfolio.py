from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import Asset, Holding, PortfolioSnapshot
from app.services.price_provider import get_mock_close_price
from app.schemas import HoldingDetailResponse, PortfolioSummaryResponse


def get_holding_details(
    db: Session, user_id: int, account_id: int | None = None
) -> list[HoldingDetailResponse]:
    query = (
        select(Holding)
        .options(joinedload(Holding.asset))
        .options(joinedload(Holding.account))
        .where(Holding.user_id == user_id)
    )
    if account_id is not None:
        query = query.where(Holding.account_id == account_id)

    holdings = db.execute(query).scalars().all()
    today = date.today()
    results: list[HoldingDetailResponse] = []

    for h in holdings:
        current_price = get_mock_close_price(h.asset.symbol, today)
        qty = h.quantity
        mkt_val = current_price * qty
        cost_basis = h.avg_cost * qty
        ret_val = mkt_val - cost_basis
        ret_pct = (ret_val / cost_basis * Decimal("100")) if cost_basis != 0 else Decimal("0")

        if h.exit_date:
            hold_duration_days = (h.exit_date - h.entry_date).days
        else:
            hold_duration_days = (today - h.entry_date).days

        results.append(
            HoldingDetailResponse(
                id=h.id,
                account_id=h.account_id,
                asset_id=h.asset_id,
                asset_symbol=h.asset.symbol,
                asset_name=h.asset.name,
                instrument_type=h.asset.instrument_type,
                asset_currency=h.asset.currency,
                quantity=qty,
                avg_cost=h.avg_cost,
                entry_date=h.entry_date,
                exit_date=h.exit_date,
                hold_duration_days=hold_duration_days,
                current_price=current_price,
                market_value=mkt_val,
                return_value=ret_val,
                return_pct=ret_pct,
            )
        )

    return results


def get_portfolio_summary(
    db: Session, user_id: int, account_id: int | None = None
) -> list[PortfolioSummaryResponse]:
    holdings = get_holding_details(db, user_id, account_id)

    acc_groups: dict[int, dict] = {}
    for h in holdings:
        if h.account_id not in acc_groups:
            acc_group = db.get(Holding, h.id)
            account_name = acc_group.account.name if acc_group and acc_group.account else f"Account {h.account_id}"
            acc_groups[h.account_id] = {
                "account_name": account_name,
                "total_value": Decimal("0"),
                "total_cost": Decimal("0"),
                "total_return": Decimal("0"),
                "holdings_count": 0,
            }
        acc_groups[h.account_id]["total_value"] += h.market_value
        acc_groups[h.account_id]["total_cost"] += h.avg_cost * h.quantity
        acc_groups[h.account_id]["holdings_count"] += 1

    results: list[PortfolioSummaryResponse] = []
    for acc_id, data in acc_groups.items():
        total_cost = data["total_cost"]
        total_return = data["total_value"] - total_cost
        return_pct = (total_return / total_cost * Decimal("100")) if total_cost != 0 else Decimal("0")
        results.append(
            PortfolioSummaryResponse(
                account_id=acc_id,
                account_name=data["account_name"],
                total_value=data["total_value"],
                total_cost=total_cost,
                total_return=total_return,
                total_return_pct=return_pct,
                holdings_count=data["holdings_count"],
            )
        )

    return results


def recompute_portfolio_snapshot(
    db: Session, snapshot_date: date, user_id: int
) -> int:
    summaries = get_portfolio_summary(db, user_id)
    upserts = 0

    for s in summaries:
        snapshot = db.execute(
            select(PortfolioSnapshot).where(
                PortfolioSnapshot.account_id == s.account_id,
                PortfolioSnapshot.snapshot_date == snapshot_date,
            )
        ).scalar_one_or_none()

        if snapshot is None:
            snapshot = PortfolioSnapshot(
                account_id=s.account_id,
                snapshot_date=snapshot_date,
            )
            db.add(snapshot)

        snapshot.total_value = s.total_value
        snapshot.total_cost = s.total_cost
        snapshot.total_return = s.total_return
        snapshot.total_return_pct = s.total_return_pct
        upserts += 1

    db.commit()
    return upserts
