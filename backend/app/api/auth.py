"""
Authentication API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import LoginRequest, TokenResponse, AppUserResponse
from app.services.auth_service import AuthService
from app.api.deps import get_current_user
from app.models.user import AppUser


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return JWT tokens
    
    - **username**: User's username
    - **password**: User's password
    """
    auth_service = AuthService(db)
    return auth_service.authenticate_user(login_data)


@router.get("/me", response_model=AppUserResponse)
def get_current_user_info(
    current_user: AppUser = Depends(get_current_user)
):
    """
    Get current authenticated user information
    """
    return current_user
