"""
Core Package

Contains core application functionality including:
- Configuration management
- Database setup
- Security and authentication
- QR code generation
"""

from src.core.config import settings
from src.core.database import Base, get_db, init_db, engine, SessionLocal
from src.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_access_token,
    get_current_user,
    get_current_admin_user,
    authenticate_user,
)
from src.core.qr_generator import qr_generator, QRCodeGenerator

__all__ = [
    # Configuration
    "settings",

    # Database
    "Base",
    "get_db",
    "init_db",
    "engine",
    "SessionLocal",

    # Security
    "get_password_hash",
    "verify_password",
    "create_access_token",
    "decode_access_token",
    "get_current_user",
    "get_current_admin_user",
    "authenticate_user",

    # QR Code
    "qr_generator",
    "QRCodeGenerator",
]