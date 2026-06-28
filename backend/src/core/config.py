from pydantic_settings import BaseSettings
from typing import List, Optional
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
    INITIAL_ADMIN_PHONE: str = "+1-000-000-0000"

    # -------------------------------------------------------------------------
    # AI Assistant (optional — set one of the two blocks below)
    # -------------------------------------------------------------------------
    # Option A: OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Option B: Ollama (local)
    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen3:8b"

    # AI Assistant tuning (all optional, safe defaults — only affect the
    # chatbot's RAG answer-synthesis step, see src/ai/service.py)
    AI_MAX_HISTORY_TURNS: int = 3        # conversation turns remembered per user (kept short for speed)
    AI_ANSWER_MAX_TOKENS: int = 120      # max length of the synthesized answer (kept short for speed)
    AI_ANSWER_NUM_CTX: int = 2048        # Ollama context window for the answer call
    AI_CONTEXT_ROW_LIMIT: int = 15       # max retrieved rows fed into the answer prompt (kept short for speed)

    # Optional: use a different (e.g. smaller/faster) model just for the
    # conversational answer-phrasing step, separate from SQL generation.
    # Leave empty to use OLLAMA_MODEL / OPENAI_MODEL for both steps (default).
    OLLAMA_ANSWER_MODEL: str = ""
    OPENAI_ANSWER_MODEL: str = ""

    # Optional: force Ollama to offload this many model layers to GPU.
    # Leave unset (None) to let Ollama auto-decide (default, safe choice).
    # Useful if `ollama ps` shows a more CPU-heavy split than your GPU's
    # VRAM should require — try a high number like 99; Ollama caps it at
    # the model's real layer count automatically.
    OLLAMA_NUM_GPU: Optional[int] = None

    # httpx timeout (seconds) for calls to Ollama's /api/chat. `read` is the
    # one that matters most: it bounds how long we wait for the model to
    # finish generating tokens once the request has been accepted. A large
    # prompt + an 8B model on a slow GPU/CPU can legitimately take well past
    # 60s, so this must be generous. `connect`/`write`/`pool` stay tight
    # since those failures mean Ollama itself isn't reachable at all.
    OLLAMA_CONNECT_TIMEOUT: float = 30.0
    OLLAMA_READ_TIMEOUT: float = 300.0
    OLLAMA_WRITE_TIMEOUT: float = 30.0
    OLLAMA_POOL_TIMEOUT: float = 30.0

    # SQL-generation call tuning, kept separate from AI_ANSWER_* above.
    AI_SQL_MAX_TOKENS: int = 300         # a single SELECT rarely needs more; was 450
    AI_SQL_NUM_CTX: int = 4096

    # qwen3 (and other hybrid "thinking" models) reason internally by default
    # in Ollama unless `think` is explicitly set to false. For SQL generation
    # and short grounded answers we want fast, deterministic output, not a
    # chain-of-thought trace — and Ollama has a known issue where reasoning
    # tokens can consume the entire num_predict/max_tokens budget, leaving an
    # empty final answer. Set to true only if you specifically want qwen3 to
    # show its reasoning (slower, and budgets above must be raised to fit it).
    OLLAMA_THINK: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        case_sensitive = True
        extra = "ignore"


settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)