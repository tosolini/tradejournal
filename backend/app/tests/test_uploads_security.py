import json
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace

import pytest

from app.api.data import import_data
from app.api.uploads import _resolve_media_path
from app.config import settings


def test_resolve_media_path_allows_files_inside_media_root(tmp_path, monkeypatch):
    media_root = tmp_path / "media"
    media_root.mkdir()
    monkeypatch.setattr(settings, "media_root", str(media_root))

    safe_path = media_root / "safe.png"
    safe_path.write_bytes(b"png")

    assert _resolve_media_path(str(safe_path)) == safe_path


def test_resolve_media_path_rejects_paths_outside_media_root(tmp_path, monkeypatch):
    media_root = tmp_path / "media"
    media_root.mkdir()
    monkeypatch.setattr(settings, "media_root", str(media_root))

    outside_path = tmp_path / "outside.txt"
    outside_path.write_bytes(b"not-allowed")

    with pytest.raises(ValueError):
        _resolve_media_path(str(outside_path))

    with pytest.raises(ValueError):
        _resolve_media_path("../etc/passwd")


def test_import_data_does_not_leak_json_decode_details():
    file = SimpleNamespace(file=BytesIO(b"{not valid json"))
    response = import_data(
        request=SimpleNamespace(),
        file=file,
        db=None,
        current_user=SimpleNamespace(id=1),
    )

    body = json.loads(response.body.decode())
    assert response.status_code == 422
    assert body["detail"] == "Invalid JSON payload."
    assert "Expecting" not in body["detail"]
