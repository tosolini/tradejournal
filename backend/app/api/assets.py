from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Asset, User
from app.schemas import AssetCreate, AssetResponse, AssetUpdate

router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.post("/", response_model=AssetResponse)
def create_asset(
    payload: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.execute(
        select(Asset).where(
            Asset.user_id == current_user.id, Asset.symbol == payload.symbol
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Asset with this symbol already exists")

    asset = Asset(user_id=current_user.id, **payload.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.get("/", response_model=list[AssetResponse])
def list_assets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assets = db.execute(
        select(Asset).where(Asset.user_id == current_user.id).order_by(Asset.symbol)
    ).scalars().all()
    return assets


@router.patch("/{asset_id}", response_model=AssetResponse)
def update_asset(
    asset_id: int,
    payload: AssetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = db.execute(
        select(Asset).where(Asset.id == asset_id, Asset.user_id == current_user.id)
    ).scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(asset, key, value)
    db.commit()
    db.refresh(asset)
    return asset


@router.delete("/{asset_id}")
def delete_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = db.execute(
        select(Asset).where(Asset.id == asset_id, Asset.user_id == current_user.id)
    ).scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    from app.models import Holding
    holding_count = db.execute(
        select(Holding).where(Holding.asset_id == asset_id)
    ).scalar()
    if holding_count:
        raise HTTPException(status_code=409, detail="Cannot delete asset with active holdings")

    db.delete(asset)
    db.commit()
    return {"ok": True}
