from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class ReviewBase(BaseModel):
    """Base review schemas"""
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None
    has_issue: bool = False
    issue_type: Optional[str] = Field(None, max_length=100)
    issue_description: Optional[str] = None
    issue_severity: Optional[str] = Field(None, pattern="^(minor|moderate|severe)$")


class ReviewCreate(ReviewBase):
    """Schema for creating a new review"""
    item_id: int
    transaction_id: Optional[int] = None


class ReviewUpdate(BaseModel):
    """Schema for updating a review"""
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None
    admin_response: Optional[str] = None
    issue_resolved: Optional[bool] = None


class ReviewResponse(BaseModel):
    """Schema for review response"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    item_id: int
    transaction_id: Optional[int] = None
    rating: Optional[int] = None
    comment: Optional[str] = None
    has_issue: bool
    issue_type: Optional[str] = None
    issue_description: Optional[str] = None
    issue_severity: Optional[str] = None
    admin_notified: bool
    admin_response: Optional[str] = None
    issue_resolved: bool
    created_at: datetime
    updated_at: datetime


class ReviewDetailResponse(ReviewResponse):
    """Schema for detailed review response"""
    user_name: str
    user_email: str
    item_name: str
    item_code: str


class ReviewListResponse(BaseModel):
    """Schema for paginated review list"""
    reviews: list[ReviewDetailResponse]
    total: int
    page: int
    page_size: int
    total_pages: int