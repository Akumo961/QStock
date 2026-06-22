from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings and configuration"""

    # Application
    APP_NAME: str = "QR Inventory System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    # Database - Simple username without special characters
    DATABASE_URL: str = "postgresql://postgres@localhost:3016/qr_inventory"

    # Security
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://192.168.2.31:5173",
        "http://192.168.2.31:3000",
    ]

    # QR Code Settings
    QR_CODE_SIZE: int = 10
    QR_CODE_BORDER: int = 4
    QR_CODE_BOX_SIZE: int = 10

    # File Upload
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 5242880

    # Email (Optional)
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_TLS: bool = True
    MAIL_SSL: bool = False

    # Admin Initial Setup - THIS is your admin user for the app
    INITIAL_ADMIN_EMAIL: str = "ali.el-sayed-ali@scouthorizon.onmicrosoft.com"
    INITIAL_ADMIN_PASSWORD: str = "K41d0Dr@gonW0r1d!"
    INITIAL_ADMIN_NAME: str = "System Administrator"

    # -------------------------------------------------------------------------
    # AI Assistant (optional — set one of the two blocks below)
    # -------------------------------------------------------------------------
    # Option A: OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Option B: Ollama (local)
    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "phi3:mini"

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        case_sensitive = True
        extra = "ignore"


settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
