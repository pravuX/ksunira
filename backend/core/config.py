from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # default connection string
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost/database"

    class Config:
        env_file = ".env"


settings = Settings()
