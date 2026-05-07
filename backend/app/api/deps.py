"""
API Dependencies - Shared dependencies for route handlers
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import AppUser, UserRole
from app.schemas.auth import TokenData


security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> AppUser:
    """
    Dependency to get current authenticated user from JWT token
    
    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials
    
    # Decode token
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    username: str = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    user = db.query(AppUser).filter(AppUser.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    
    return user


def require_role(allowed_roles: list[UserRole]):
    """
    Dependency factory to check if user has required role
    
    Args:
        allowed_roles: List of allowed roles
        
    Returns:
        Dependency function
    """
    def role_checker(current_user: AppUser = Depends(get_current_user)) -> AppUser:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {[r.value for r in allowed_roles]}",
            )
        return current_user
    
    return role_checker


# Convenience dependencies for specific roles
require_admin = require_role([UserRole.ADMIN])
require_auditor = require_role([UserRole.ADMIN, UserRole.AUDITOR])
require_any_role = require_role([UserRole.ADMIN, UserRole.AUDITOR, UserRole.RESPONSABLE])
