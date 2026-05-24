from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.i18n import localized_error
from app.models import Account, Broker, Trade, User
from app.schemas import AccountCreate, AccountResponse, AccountUpdate

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


@router.post("", response_model=AccountResponse)
def create_account(
    payload: AccountCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    broker = None
    if payload.broker_id is not None:
        broker = db.get(Broker, payload.broker_id)
        if not broker or broker.user_id != current_user.id:
            raise localized_error(status_code=400, code="errors.broker_invalid", request=request)

    account = Account(
        user_id=current_user.id,
        broker_id=payload.broker_id,
        name=payload.name,
        base_currency=payload.base_currency,
        cash_balance=payload.cash_balance,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return _to_account_response(account, broker)


@router.get("", response_model=list[AccountResponse])
def list_accounts(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    accounts = db.execute(select(Account).where(Account.user_id == current_user.id)).scalars().all()
    broker_ids = [account.broker_id for account in accounts if account.broker_id is not None]
    brokers_by_id: dict[int, Broker] = {}
    if broker_ids:
        brokers = db.execute(
            select(Broker).where(Broker.user_id == current_user.id, Broker.id.in_(broker_ids))
        ).scalars().all()
        brokers_by_id = {broker.id: broker for broker in brokers}
    return [_to_account_response(account, brokers_by_id.get(account.broker_id or -1)) for account in accounts]


@router.patch("/{account_id}", response_model=AccountResponse)
def update_account(
    account_id: int,
    payload: AccountUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = db.get(Account, account_id)
    if not account or account.user_id != current_user.id:
        raise localized_error(status_code=404, code="errors.account_not_found", request=request)

    updates = payload.model_dump(exclude_unset=True)
    if "broker_id" in updates and updates["broker_id"] is not None:
        broker = db.get(Broker, updates["broker_id"])
        if not broker or broker.user_id != current_user.id:
            raise localized_error(status_code=400, code="errors.broker_invalid", request=request)

    for field, value in updates.items():
        setattr(account, field, value)

    db.commit()
    db.refresh(account)
    broker = None
    if account.broker_id is not None:
        broker = db.get(Broker, account.broker_id)
    return _to_account_response(account, broker)


@router.delete("/{account_id}")
def delete_account(
    account_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = db.get(Account, account_id)
    if not account or account.user_id != current_user.id:
        raise localized_error(status_code=404, code="errors.account_not_found", request=request)

    linked_trade = db.execute(select(Trade.id).where(Trade.account_id == account_id)).scalar_one_or_none()
    if linked_trade is not None:
        raise localized_error(
            status_code=400,
            code="errors.account_has_trades",
            request=request,
        )

    db.delete(account)
    db.commit()
    return {"deleted": True, "account_id": account_id}


def _to_account_response(account: Account, broker: Broker | None = None) -> AccountResponse:
    return AccountResponse(
        id=account.id,
        name=account.name,
        broker_id=account.broker_id,
        broker_name=broker.name if broker else None,
        base_currency=account.base_currency,
        cash_balance=account.cash_balance,
    )
