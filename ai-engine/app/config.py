from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGODB_URI: str = "mongodb://localhost:27017/ptm_db"
    REDIS_URL: str = "redis://localhost:6379"
    AI_CACHE_TTL: int = 86400  # 24 hours
    MODEL_VERSION: str = "1.0.0"

    class Config:
        env_file = "../.env"

settings = Settings()
