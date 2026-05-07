"""
Authentication Service
"""
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import AppUser
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token
from app.schemas.auth import LoginRequest, TokenResponse
from app.services.audit_log_service import log_action


class AuthService:
    """Authentication and user management service"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def authenticate_user(self, login_data: LoginRequest) -> TokenResponse:
        """
        Authenticate user and return JWT tokens
        
        Args:
            login_data: Login credentials
            
        Returns:
            TokenResponse with access and refresh tokens
            
        Raises:
            HTTPException: If credentials are invalid
        """
        # Find user
        user = self.db.query(AppUser).filter(
            AppUser.username == login_data.username
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
            )
        
        # Verify password
        if not verify_password(login_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
            )
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )
        
        # Create tokens
        # Handle role being either Enum or String
        role_value = user.role.value if hasattr(user.role, 'value') else str(user.role)
        
        token_data = {
            "sub": user.username,
            "user_id": str(user.id),
            "role": role_value,
        }
        
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        log_action(
            db=self.db,
            action="LOGIN",
            user_id=user.id,
            entity_type="user",
            entity_id=user.id,
        )
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
        )
    
    def get_user_by_id(self, user_id: UUID) -> Optional[AppUser]:
        """Get user by ID"""
        return self.db.query(AppUser).filter(AppUser.id == user_id).first()
    
    def get_user_by_username(self, username: str) -> Optional[AppUser]:
        """Get user by username"""
        return self.db.query(AppUser).filter(AppUser.username == username).first()
    
    def create_user(self, username: str, email: str, password: str, full_name: str, role: str) -> AppUser:
        """Create a new user"""
        # Check if username exists
        if self.get_user_by_username(username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists",
            )
        
        # Check if email exists
        existing_email = self.db.query(AppUser).filter(AppUser.email == email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists",
            )
        
        # Create user
        user = AppUser(
            username=username,
            email=email,
            password_hash=get_password_hash(password),
            full_name=full_name,
            role=role,
        )
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        return user
