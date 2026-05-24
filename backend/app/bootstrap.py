from sqlalchemy import or_, select

from app.config import settings
from app.database import SessionLocal
from app.models import User
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
