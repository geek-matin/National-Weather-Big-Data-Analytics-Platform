import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

class Settings(BaseSettings):
    ENV: str = os.getenv("ENV", "development")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{str((BASE_DIR / 'weather.db').as_posix())}")

    # Streaming Broker
    KAFKA_BROKER: str = os.getenv("KAFKA_BROKER", "localhost:9092")
    KAFKA_TOPIC: str = os.getenv("KAFKA_TOPIC", "raw-weather-events")

    # Ingestion APIs (Optional)
    REDDIT_CLIENT_ID: str = os.getenv("REDDIT_CLIENT_ID", "")
    REDDIT_CLIENT_SECRET: str = os.getenv("REDDIT_CLIENT_SECRET", "")
    REDDIT_USER_AGENT: str = os.getenv("REDDIT_USER_AGENT", "imd_weather_monitor:v1.0.0")

    # Media
    MEDIA_STORAGE_DIR: str = os.getenv("MEDIA_STORAGE_DIR", str(BASE_DIR / "media"))

settings = Settings()

# Ensure media directory exists
os.makedirs(settings.MEDIA_STORAGE_DIR, exist_ok=True)
