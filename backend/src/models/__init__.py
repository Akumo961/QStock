"""
Database Models Package

Contains all SQLAlchemy ORM models for the QR Inventory System.
All models inherit from the Base class and include automatic timestamps.
"""

from src.models.base import BaseModel
from src.models.user import User
from src.models.item import Item, ItemStatus, ItemCategory
from src.models.transaction import (
    Transaction,
    TransactionStatus,
    Order,
    OrderStatus,
)
from src.models.review import Review

# Export all models for easy importing
__all__ = [
    # Base
    "BaseModel",

    # User model
    "User",

    # Item model and enums
    "Item",
    "ItemStatus",
    "ItemCategory",

    # Transaction models and enums
    "Transaction",
    "TransactionStatus",

    # Orders
    "Order",
    "OrderStatus",

    # Review model
    "Review",
]

# Model registry for migrations and database initialization
MODELS = [
    User,
    Item,
    Transaction,
    Order,
    Review,
]