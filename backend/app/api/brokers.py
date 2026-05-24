from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Broker, User
from app.schemas import BrokerCreate, BrokerResponse, BrokerUpdate

router = APIRouter(prefix="/api/brokers", tags=["brokers"])


def _normalize_fee_mode(mode: str | None) -> str:
    value = str(mode or "fixed").strip().lower()
    if value not in {"fixed", "percent"}:
        raise HTTPException(status_code=400, detail="fee_mode deve essere 'fixed' o 'percent'")
    return value


def _normalize_currency(value: str | None) -> str:
    currency = str(value or "EUR").strip().upper()
    if not currency:
        raise HTTPException(status_code=400, detail="fee_currency obbligatoria")
    if len(currency) > 8:
        raise HTTPException(status_code=400, detail="fee_currency troppo lunga")
    return currency


def _normalize_capital_gain_mode(mode: str | None) -> str:
    value = str(mode or "immediate").strip().lower()
    if value not in {"immediate", "year_end"}:
        raise HTTPException(status_code=400, detail="capital_gain_mode deve essere 'immediate' o 'year_end'")
    return value


@router.post("", response_model=BrokerResponse)
def create_broker(
    payload: BrokerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nome broker obbligatorio")

    fee_mode = _normalize_fee_mode(payload.fee_mode)
    fee_value = payload.fee_value
    fee_currency = _normalize_currency(payload.fee_currency)
    capital_gain_mode = _normalize_capital_gain_mode(payload.capital_gain_mode)
    capital_gain_rate = payload.capital_gain_rate
    if fee_value < 0:
        raise HTTPException(status_code=400, detail="fee_value non puo essere negativo")
    if capital_gain_rate < 0:
        raise HTTPException(status_code=400, detail="capital_gain_rate non puo essere negativo")

    broker = Broker(
        user_id=current_user.id,
        name=name,
        fee_mode=fee_mode,
        fee_value=fee_value,
        fee_currency=fee_currency,
        capital_gain_mode=capital_gain_mode,
        capital_gain_rate=capital_gain_rate,
    )

    db.add(broker)
    db.commit()
    db.refresh(broker)
    return broker


@router.get("", response_model=list[BrokerResponse])
def list_brokers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.execute(select(Broker).where(Broker.user_id == current_user.id)).scalars().all()


@router.patch("/{broker_id}", response_model=BrokerResponse)
def update_broker(
    broker_id: int,
    payload: BrokerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    broker = db.get(Broker, broker_id)
    if not broker or broker.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Broker non trovato")

    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates:
        name = str(updates["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Nome broker obbligatorio")
        broker.name = name
    if "fee_mode" in updates and updates["fee_mode"] is not None:
        broker.fee_mode = _normalize_fee_mode(updates["fee_mode"])
    if "fee_value" in updates and updates["fee_value"] is not None:
        fee_value = updates["fee_value"]
        if fee_value < 0:
            raise HTTPException(status_code=400, detail="fee_value non puo essere negativo")
        broker.fee_value = fee_value
    if "fee_currency" in updates and updates["fee_currency"] is not None:
        broker.fee_currency = _normalize_currency(updates["fee_currency"])
    if "capital_gain_mode" in updates and updates["capital_gain_mode"] is not None:
        broker.capital_gain_mode = _normalize_capital_gain_mode(updates["capital_gain_mode"])
    if "capital_gain_rate" in updates and updates["capital_gain_rate"] is not None:
        capital_gain_rate = updates["capital_gain_rate"]
        if capital_gain_rate < 0:
            raise HTTPException(status_code=400, detail="capital_gain_rate non puo essere negativo")
        broker.capital_gain_rate = capital_gain_rate

    db.commit()
    db.refresh(broker)
    return broker


@router.delete("/{broker_id}")
def delete_broker(
    broker_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    broker = db.get(Broker, broker_id)
    if not broker or broker.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Broker non trovato")

    if broker.accounts:
        raise HTTPException(
            status_code=400,
            detail="Impossibile eliminare broker associato ad account esistenti",
        )

    db.delete(broker)
    db.commit()
    return {"deleted": True, "broker_id": broker_id}
