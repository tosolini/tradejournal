from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import DailyNote, User
from app.schemas import (
    DailyNoteCreate,
    DailyNoteResponse,
    DailyNoteUpdate,
    MarketConditionTagDeleteRequest,
    MarketConditionTagRenameRequest,
)

router = APIRouter(prefix="/api/notes", tags=["notes"])


def _normalize_market_condition(value: str | None) -> str | None:
    raw_tags = _extract_market_condition_tags(value)
    deduped_tags: list[str] = []
    seen: set[str] = set()
    for tag in raw_tags:
        lowered = tag.lower()
        if lowered not in seen:
            seen.add(lowered)
            deduped_tags.append(tag)
    if not deduped_tags:
        return None
    return ", ".join(deduped_tags)


def _extract_market_condition_tags(value: str | None) -> list[str]:
    if not value:
        return []
    return [segment.strip() for segment in value.replace(";", ",").split(",") if segment.strip()]


@router.post("", response_model=DailyNoteResponse)
def upsert_note(
    payload: DailyNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payload_data = payload.model_dump()
    payload_data["market_condition"] = _normalize_market_condition(payload_data.get("market_condition"))

    existing = db.execute(
        select(DailyNote).where(
            DailyNote.user_id == current_user.id,
            DailyNote.note_date == payload.note_date,
        )
    ).scalar_one_or_none()

    if existing:
        for field, value in payload_data.items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing

    note = DailyNote(user_id=current_user.id, **payload_data)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.get("", response_model=list[DailyNoteResponse])
def list_notes(
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(DailyNote).where(DailyNote.user_id == current_user.id)
    if from_date:
        stmt = stmt.where(DailyNote.note_date >= from_date)
    if to_date:
        stmt = stmt.where(DailyNote.note_date <= to_date)
    return db.execute(stmt.order_by(DailyNote.note_date.desc())).scalars().all()


@router.put("/{note_id}", response_model=DailyNoteResponse)
def update_note(
    note_id: int,
    payload: DailyNoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = db.execute(
        select(DailyNote).where(
            DailyNote.id == note_id,
            DailyNote.user_id == current_user.id,
        )
    ).scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    updates = payload.model_dump(exclude_unset=True)
    if "market_condition" in updates:
        updates["market_condition"] = _normalize_market_condition(updates["market_condition"])

    for field, value in updates.items():
        setattr(note, field, value)

    db.commit()
    db.refresh(note)
    return note


@router.delete("/{note_id}")
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = db.execute(
        select(DailyNote).where(
            DailyNote.id == note_id,
            DailyNote.user_id == current_user.id,
        )
    ).scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    db.delete(note)
    db.commit()
    return {"ok": True}


@router.get("/suggestions/market-condition", response_model=list[str])
def market_condition_suggestions(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    values = db.execute(
        select(DailyNote.market_condition).where(
            DailyNote.user_id == current_user.id,
            DailyNote.market_condition.is_not(None),
        )
    ).scalars()

    suggestions: list[str] = []
    seen: set[str] = set()
    for raw_value in values:
        parts = _extract_market_condition_tags(raw_value)
        for part in parts:
            lowered = part.lower()
            if lowered not in seen:
                seen.add(lowered)
                suggestions.append(part)
            if len(suggestions) >= limit:
                return suggestions

    return suggestions


@router.post("/tags/rename")
def rename_market_condition_tag(
    payload: MarketConditionTagRenameRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    old_tag = payload.old_tag.strip()
    new_tag = payload.new_tag.strip()
    if not old_tag or not new_tag:
        raise HTTPException(status_code=400, detail="Both old_tag and new_tag are required")

    notes = db.execute(
        select(DailyNote).where(
            DailyNote.user_id == current_user.id,
            DailyNote.market_condition.is_not(None),
        )
    ).scalars().all()

    updated_notes = 0
    for note in notes:
        tags = _extract_market_condition_tags(note.market_condition)
        replaced = False
        next_tags: list[str] = []
        for tag in tags:
            if tag.lower() == old_tag.lower():
                next_tags.append(new_tag)
                replaced = True
            else:
                next_tags.append(tag)
        if not replaced:
            continue
        note.market_condition = _normalize_market_condition(", ".join(next_tags))
        updated_notes += 1

    if updated_notes:
        db.commit()

    return {"ok": True, "updated_notes": updated_notes}


@router.post("/tags/delete")
def delete_market_condition_tag(
    payload: MarketConditionTagDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tag_to_delete = payload.tag.strip()
    if not tag_to_delete:
        raise HTTPException(status_code=400, detail="tag is required")

    notes = db.execute(
        select(DailyNote).where(
            DailyNote.user_id == current_user.id,
            DailyNote.market_condition.is_not(None),
        )
    ).scalars().all()

    updated_notes = 0
    for note in notes:
        tags = _extract_market_condition_tags(note.market_condition)
        next_tags = [tag for tag in tags if tag.lower() != tag_to_delete.lower()]
        if len(next_tags) == len(tags):
            continue
        note.market_condition = _normalize_market_condition(", ".join(next_tags))
        updated_notes += 1

    if updated_notes:
        db.commit()

    return {"ok": True, "updated_notes": updated_notes}
