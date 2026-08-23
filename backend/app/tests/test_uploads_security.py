from pathlib import Path

import pytest

from app.api.uploads import _resolve_media_path
from app.config import settings


def test_resolve_media_path_allows_files_inside_media_root():
    media_root = Path(settings.media_root).resolve()
    media_root.mkdir(parents=True, exist_ok=True)

    safe_path = media_root / "safe.png"
    safe_path.write_bytes(b"png")

    assert _resolve_media_path(str(safe_path)) == safe_path


def test_resolve_media_path_rejects_paths_outside_media_root():
    media_root = Path(settings.media_root).resolve()
    outside_path = media_root.parent / "outside.txt"
    outside_path.write_bytes(b"not-allowed")

    with pytest.raises(ValueError):
        _resolve_media_path(str(outside_path))

    with pytest.raises(ValueError):
        _resolve_media_path("../etc/passwd")
