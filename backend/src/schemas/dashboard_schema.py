"""
Dashboard Schemas
"""

from pydantic import BaseModel
from typing import List, Optional


class DashboardStats(BaseModel):
    total_users: int
    active_users: int

    total_items: int
    available_items: int
    borrowed_items: int
    maintenance_items: int

    total_transactions: int
    active_borrows: int
    overdue_borrows: int
    total_returns: int

    total_reviews: int
    pending_requests: int


class PopularItemsStats(BaseModel):
    item_id: int
    item_name: str
    item_code: str
    category: str
    borrow_count: int
    average_rating: Optional[float] = None


class RecentActivity(BaseModel):
    activity_type: str
    description: str
    user_name: str
    item_name: Optional[str] = None
    timestamp: str | object


class BorrowingTrend(BaseModel):
    date: str
    borrow_count: int
    return_count: int


class CategoryDistribution(BaseModel):
    category: str
    count: int
    percentage: float


class UserActivity(BaseModel):
    user_id: int
    user_name: str
    user_email: str
    total_borrows: int
    active_borrows: int
    overdue_items: int


class ItemUtilization(BaseModel):
    item_id: int
    item_name: str
    item_code: str
    category: str
    total_borrows: int
    current_status: str
    utilization_rate: float


class DashboardOverview(BaseModel):
    stats: DashboardStats
    popular_items: List[PopularItemsStats]
    recent_activities: List[RecentActivity]
    borrowing_trends: List[BorrowingTrend]
    category_distribution: List[CategoryDistribution]
    top_users: List[UserActivity]


# Legacy import compatibility
class RequestBase(BaseModel):
    pass