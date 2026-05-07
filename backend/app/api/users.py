"""
Internal users management API endpoints
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.models.user import AppUser
from app.schemas.auth import AppUserCreate, AppUserResponse, AppUserUpdate
from app.services.auth_service import AuthService
from app.services.audit_log_service import log_action


router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[AppUserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_admin),
):
    return db.query(AppUser).all()


@router.post("", response_model=AppUserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: AppUserCreate,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_admin),
):
    service = AuthService(db)
    user = service.create_user(
        username=payload.username,
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
        role=payload.role.value,
    )
    log_action(
        db=db,
        action="CREATE_USER",
        user_id=current_user.id,
        entity_type="user",
        entity_id=user.id,
    )
    return user


@router.put("/{user_id}", response_model=AppUserResponse)
def update_user(
    user_id: UUID,
    payload: AppUserUpdate,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_admin),
):
    user = db.query(AppUser).filter(AppUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    log_action(
        db=db,
        action="UPDATE_USER",
        user_id=current_user.id,
        entity_type="user",
        entity_id=user.id,
    )
    return user

