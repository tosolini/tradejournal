from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://tradejournal:tradejournal@db:5432/tradejournal"
    jwt_secret_key: str = "change-me"
    jwt_access_token_expire_minutes: int = 1440
    app_timezone: str = "Europe/Rome"
    market_close_cutoff: str = "17:30"
    media_root: str = "/app/media"
    seed_admin_enabled: bool = True
    seed_admin_email: str = "admin@example.com"
    seed_admin_username: str = "admin"
    seed_admin_password: str = "password123"
    cors_origins: str = "http://localhost:15173,http://127.0.0.1:15173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
