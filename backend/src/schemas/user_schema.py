from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    department: Optional[str] = Field(None, max_length=100)
    phone: str = Field(..., min_length=5, max_length=20, description="Required for every account, admin or regular user")
    employee_id: Optional[str] = Field(None, max_length=50)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    is_admin: bool = False


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    department: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, min_length=5, max_length=20, description="If provided, cannot be blanked out — phone is mandatory once set")
    employee_id: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class UserChangePassword(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    qr_code_data: str
    qr_code_image: Optional[str] = None
    is_active: bool
    is_admin: bool
    created_at: datetime
    updated_at: datetime


class UserQRCode(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    qr_code_data: str
    qr_code_image: str


class UserListResponse(BaseModel):
    users: list[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class UserStats(BaseModel):
    total_borrows: int
    active_borrows: int
    total_returns: int
    overdue_items: int
    total_reviews: int