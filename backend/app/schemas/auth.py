from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, UUID4, ConfigDict
from app.models.user import UserRole


# Base schemas
class AppUserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    role: UserRole


class AppUserCreate(AppUserBase):
    password: str = Field(..., min_length=8, max_length=100)


class AppUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class AppUserResponse(AppUserBase):
    id: UUID4
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)



# Authentication schemas
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[UUID4] = None
    role: Optional[UserRole] = None
