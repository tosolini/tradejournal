from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.config import settings
from app.security import ALGORITHM, create_access_token


def test_create_and_decode_roundtrip():
    token = create_access_token("alice")
    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[ALGORITHM])
    assert payload["sub"] == "alice"
    assert "exp" in payload


def test_decode_rejects_wrong_secret():
    token = create_access_token("bob")
    with pytest.raises(jwt.exceptions.InvalidTokenError):
        jwt.decode(token, "wrong-secret", algorithms=[ALGORITHM])


def test_decode_rejects_expired_token():
    expired = jwt.encode(
        {"sub": "bob", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        settings.jwt_secret_key,
        algorithm=ALGORITHM,
    )
    with pytest.raises(jwt.exceptions.ExpiredSignatureError):
        jwt.decode(expired, settings.jwt_secret_key, algorithms=[ALGORITHM])


def test_decode_enforces_algorithm():
    token = create_access_token("bob")
    with pytest.raises(jwt.exceptions.InvalidTokenError):
        jwt.decode(token, settings.jwt_secret_key, algorithms=["RS256"])
