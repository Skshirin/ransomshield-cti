# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ml_service_port: int = 8000
    backend_api_url: str = "http://localhost:4000"
    backend_api_key: str = ""

    class Config:
        env_file = ".env"

settings = Settings()