from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGODB_URI: str = "mongodb://localhost:27017/ptm_db"
    REDIS_URL: str = "redis://localhost:6379"
    AI_CACHE_TTL: int = 86400  # 24 hours
    MODEL_VERSION: str = "1.0.0"

    # LLM Settings
    LLM_PROVIDER: str = "ollama"  # 'ollama' or 'gemini'
    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2:3b"
    GEMINI_API_KEY: str = ""

    class Config:
        env_file = "../.env"
        extra = "ignore"

settings = Settings()
