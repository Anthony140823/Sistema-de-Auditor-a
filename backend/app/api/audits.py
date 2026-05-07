"""
Audit API endpoints
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.audit import AuditCreate, AuditUpdate, AuditResponse
from app.models.audit import Audit
from app.models.user import AppUser, UserRole
from app.api.deps import get_current_user, require_auditor
from app.services.audit_log_service import log_action


router = APIRouter(prefix="/audits", tags=["Audits"])


@router.get("", response_model=List[AuditResponse])
def list_audits(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(get_current_user)
):
    """List all audits"""
    audits = db.query(Audit).offset(skip).limit(limit).all()
    return audits


@router.post("", response_model=AuditResponse, status_code=status.HTTP_201_CREATED)
def create_audit(
    audit_data: AuditCreate,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_auditor)
):
    """Create a new audit (ADMIN/AUDITOR only)"""
    payload = audit_data.model_dump()
    if not payload.get("responsible_user_id"):
        payload["responsible_user_id"] = current_user.id
    audit = Audit(**payload)
    db.add(audit)
    db.commit()
    db.refresh(audit)
    log_action(
        db=db,
        action="CREATE_AUDIT",
        user_id=current_user.id,
        entity_type="audit",
        entity_id=audit.id,
        details={"name": audit.name},
    )
    return audit


@router.get("/{audit_id}", response_model=AuditResponse)
def get_audit(
    audit_id: UUID,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(get_current_user)
):
    """Get audit by ID"""
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit not found"
        )
    return audit


@router.put("/{audit_id}", response_model=AuditResponse)
def update_audit(
    audit_id: UUID,
    audit_data: AuditUpdate,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_auditor)
):
    """Update audit (ADMIN/AUDITOR only)"""
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit not found"
        )
    
    # Update fields
    for field, value in audit_data.model_dump(exclude_unset=True).items():
        setattr(audit, field, value)
    
    db.commit()
    db.refresh(audit)
    log_action(
        db=db,
        action="UPDATE_AUDIT",
        user_id=current_user.id,
        entity_type="audit",
        entity_id=audit.id,
    )
    return audit


@router.delete("/{audit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_audit(
    audit_id: UUID,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_auditor)
):
    """Delete audit (ADMIN/AUDITOR only)"""
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit not found"
        )
    
    db.delete(audit)
    db.commit()
    log_action(
        db=db,
        action="DELETE_AUDIT",
        user_id=current_user.id,
        entity_type="audit",
        entity_id=audit_id,
    )
    return None
