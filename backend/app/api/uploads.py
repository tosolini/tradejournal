import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.i18n import localized_error
from app.models import Trade, TradeImage, User

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


@router.post("/trade/{trade_id}")
def upload_trade_image(
    trade_id: int,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trade = db.get(Trade, trade_id)
    if not trade or trade.user_id != current_user.id:
        raise localized_error(status_code=404, code="errors.trade_not_found", request=request)

    media_root = Path(settings.media_root)
    media_root.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "upload.bin").suffix
    file_name = f"{uuid4().hex}{suffix}"
    destination = media_root / file_name

    with destination.open("wb") as out:
        shutil.copyfileobj(file.file, out)

    image = TradeImage(
        trade_id=trade_id,
        original_path=str(destination),
        mime_type=file.content_type,
    )
    db.add(image)
    db.commit()
    db.refresh(image)

    return {
        "id": image.id,
        "trade_id": image.trade_id,
        "original_path": image.original_path,
        "mime_type": image.mime_type,
    }


@router.post("/trade-images/{image_id}/annotated")
def save_annotated_trade_image(
    image_id: int,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    image = db.get(TradeImage, image_id)
    if not image:
        raise localized_error(status_code=404, code="errors.image_not_found", request=request)

    trade = db.get(Trade, image.trade_id)
    if not trade or trade.user_id != current_user.id:
        raise localized_error(status_code=404, code="errors.trade_not_found", request=request)

    media_root = Path(settings.media_root)
    media_root.mkdir(parents=True, exist_ok=True)
    destination = media_root / f"{uuid4().hex}_annotated.png"

    with destination.open("wb") as out:
        shutil.copyfileobj(file.file, out)

    image.annotated_path = str(destination)
    db.commit()
    db.refresh(image)

    return {
        "id": image.id,
        "trade_id": image.trade_id,
        "original_path": image.original_path,
        "annotated_path": image.annotated_path,
        "mime_type": image.mime_type,
    }


@router.get("/trade-images/{image_id}/content")
def get_trade_image_content(
    image_id: int,
    request: Request,
    variant: str = Query(default="original"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    image = db.get(TradeImage, image_id)
    if not image:
        raise localized_error(status_code=404, code="errors.image_not_found", request=request)

    trade = db.get(Trade, image.trade_id)
    if not trade or trade.user_id != current_user.id:
        raise localized_error(status_code=404, code="errors.trade_not_found", request=request)

    if variant not in {"original", "annotated"}:
        raise localized_error(status_code=400, code="errors.invalid_variant", request=request)

    path = image.original_path if variant == "original" else image.annotated_path
    if not path:
        raise localized_error(status_code=404, code="errors.image_variant_not_found", request=request)

    file_path = Path(path)
    if not file_path.exists():
        raise localized_error(status_code=404, code="errors.image_file_not_found", request=request)

    media_type = image.mime_type or "application/octet-stream"
    if variant == "annotated":
        media_type = "image/png"

    return FileResponse(path=file_path, media_type=media_type)
