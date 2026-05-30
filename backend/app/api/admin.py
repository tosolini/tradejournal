from fastapi import APIRouter, Depends, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_admin_user
from app.i18n import localized_error
from app.models import User
from app.schemas import AdminUserCreate, AdminUserUpdate, UserResponse
from app.security import hash_password

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    return db.execute(select(User).order_by(User.id)).scalars().all()


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: AdminUserCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    existing = db.execute(
        select(User).where(or_(User.email == payload.email, User.username == payload.username))
    ).scalar_one_or_none()
    if existing:
        raise localized_error(status_code=400, code="errors.user_already_exists")

    user = User(
        email=payload.email,
        username=payload.username,
        hashed_password=hash_password(payload.password),
        role=payload.role if payload.role in ("admin", "user") else "user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    target = db.get(User, user_id)
    if not target:
        raise localized_error(status_code=404, code="errors.not_found")

    if payload.email and payload.email != target.email:
        conflict = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
        if conflict:
            raise localized_error(status_code=400, code="errors.user_already_exists")
        target.email = payload.email

    if payload.username and payload.username != target.username:
        conflict = db.execute(select(User).where(User.username == payload.username)).scalar_one_or_none()
        if conflict:
            raise localized_error(status_code=400, code="errors.user_already_exists")
        target.username = payload.username

    if payload.new_password:
        target.hashed_password = hash_password(payload.new_password)

    if payload.role and payload.role in ("admin", "user"):
        # prevent admin from removing their own admin role
        if target.id != admin.id:
            target.role = payload.role

    db.commit()
    db.refresh(target)
    return target


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    if user_id == admin.id:
        raise localized_error(status_code=400, code="errors.cannot_delete_self")

    target = db.get(User, user_id)
    if not target:
        raise localized_error(status_code=404, code="errors.not_found")

    db.delete(target)
    db.commit()
