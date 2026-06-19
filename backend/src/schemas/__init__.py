"""
Pydantic Schemas Package

Contains all Pydantic models for request/response validation.
"""

# ============================================================================
# USER SCHEMAS
# ============================================================================

from src.schemas.user_schema import (
    UserBase,
    UserCreate,
    UserUpdate,
    UserChangePassword,
    UserResponse,
    UserQRCode,
    UserListResponse,
    UserStats,
)

# ============================================================================
# ITEM SCHEMAS
# ============================================================================

from src.schemas.item_schema import (
    ItemBase,
    ItemCreate,
    ItemUpdate,
    ItemResponse,
    ItemQRCode,
    ItemListResponse,
    ItemStats,
    PopularItem,
    ItemAvailability,
)

# ============================================================================
# TRANSACTION / ORDER SCHEMAS
# ============================================================================

from src.schemas.transaction_schema import (
    TransactionBase,
    TransactionCreate,
    TransactionReturn,
    TransactionUpdate,
    TransactionResponse,
    TransactionDetailResponse,
    TransactionListResponse,

    RequestCreate,
    RequestUpdate,
    RequestResponse,
    RequestDetailResponse,
    RequestListResponse,

    OrderCreate,
    OrderUpdate,
    OrderResponse,
    OrderListResponse,
)

# ============================================================================
# REVIEW SCHEMAS
# ============================================================================

from src.schemas.review_schema import (
    ReviewBase,
    ReviewCreate,
    ReviewUpdate,
    ReviewResponse,
    ReviewDetailResponse,
    ReviewListResponse,
)

# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    # Users
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserChangePassword",
    "UserResponse",
    "UserQRCode",
    "UserListResponse",
    "UserStats",

    # Items
    "ItemBase",
    "ItemCreate",
    "ItemUpdate",
    "ItemResponse",
    "ItemQRCode",
    "ItemListResponse",
    "ItemStats",
    "PopularItem",
    "ItemAvailability",

    # Transactions
    "TransactionBase",
    "TransactionCreate",
    "TransactionReturn",
    "TransactionUpdate",
    "TransactionResponse",
    "TransactionDetailResponse",
    "TransactionListResponse",

    # QR workflows
    "QRBorrowRequest",
    "QRBulkBorrowRequest",
    "QRReturnRequest",
    "QRBulkReturnRequest",

    # Orders
    "OrderCreate",
    "OrderUpdate",
    "OrderResponse",
    "OrderListResponse",

    # Legacy request aliases
    "RequestCreate",
    "RequestUpdate",
    "RequestDetailResponse",
    "RequestListResponse",

    # Reviews
    "ReviewBase",
    "ReviewCreate",
    "ReviewUpdate",
    "ReviewResponse",
    "ReviewDetailResponse",
    "ReviewListResponse",
]