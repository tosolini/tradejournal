from sqlalchemy import or_, select

from app.config import settings
from app.database import SessionLocal
from app.models import Exchange, User
from app.security import hash_password


def ensure_seed_admin() -> None:
    if not settings.seed_admin_enabled:
        return

    with SessionLocal() as db:
        existing = db.execute(
            select(User).where(
                or_(
                    User.username == settings.seed_admin_username,
                    User.email == settings.seed_admin_email,
                )
            )
        ).scalar_one_or_none()
        if existing:
            return

        user = User(
            email=settings.seed_admin_email,
            username=settings.seed_admin_username,
            hashed_password=hash_password(settings.seed_admin_password),
            role="admin",
        )
        db.add(user)
        db.commit()


def ensure_seed_exchanges(user_id: int) -> None:
    """Seed Directa exchanges for the given user if they have none."""
    from app.seeds.directa_exchanges import DIRECTA_EXCHANGES

    with SessionLocal() as db:
        existing_count = db.execute(
            select(Exchange).where(Exchange.user_id == user_id)
        ).scalars().first()
        if existing_count is not None:
            return

        for data in DIRECTA_EXCHANGES:
            exchange = Exchange(
                user_id=user_id,
                name=data["name"],
                mic=data.get("mic"),
                suffix=data.get("suffix"),
                country=data.get("country"),
                currency=data.get("currency", "EUR"),
                timezone=data.get("timezone"),
                open_time=data.get("open_time"),
                close_time=data.get("close_time"),
                closed_on_weekends=data.get("closed_on_weekends", True),
            )
            db.add(exchange)
        db.commit()
