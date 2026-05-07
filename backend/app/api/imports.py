"""
Import API endpoints
"""
from uuid import UUID
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.schemas.sap import ImportValidationResult, ImportStatusResponse
from app.services.import_service import ImportService
from app.models.user import AppUser
from app.models.audit import Audit
from app.models.sap import SAPUser, SAPUserRole, SAPRoleTCode
from app.api.deps import require_auditor


router = APIRouter(prefix="/audits/{audit_id}/import", tags=["Data Import"])


@router.get("/status", response_model=ImportStatusResponse)
def get_import_status(
    audit_id: UUID,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_auditor)
):
    """Get current imported-data counts for an audit"""
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit not found"
        )

    users_count = db.query(func.count(SAPUser.id)).filter(SAPUser.audit_id == audit_id).scalar() or 0
    user_roles_count = db.query(func.count(SAPUserRole.id)).filter(SAPUserRole.audit_id == audit_id).scalar() or 0
    role_tcodes_count = db.query(func.count(SAPRoleTCode.id)).filter(SAPRoleTCode.audit_id == audit_id).scalar() or 0

    return ImportStatusResponse(
        users_count=int(users_count),
        user_roles_count=int(user_roles_count),
        role_tcodes_count=int(role_tcodes_count),
    )


@router.post("/users", response_model=ImportValidationResult)
async def import_sap_users(
    audit_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_auditor)
):
    """
    Import SAP users from Excel/CSV file
    
    Expected columns: userId, fullName, userType, isLocked, lastLogin
    """
    # Verify audit exists
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit not found"
        )
    
    # Read file content
    content = await file.read()
    
    # Import
    import_service = ImportService(db)
    result = import_service.import_sap_users(audit_id, content, file.filename)
    
    return result


@router.post("/user-roles", response_model=ImportValidationResult)
async def import_user_roles(
    audit_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_auditor)
):
    """
    Import user-role assignments from Excel/CSV file
    
    Expected columns: userId, roleName, validFrom, validTo
    """
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit not found"
        )
    
    content = await file.read()
    
    import_service = ImportService(db)
    result = import_service.import_user_roles(audit_id, content, file.filename)
    
    return result


@router.post("/role-tcodes", response_model=ImportValidationResult)
async def import_role_tcodes(
    audit_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_auditor)
):
    """
    Import role-tcode assignments from Excel/CSV file
    
    Expected columns: roleName, tcode
    """
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit not found"
        )
    
    content = await file.read()
    
    import_service = ImportService(db)
    result = import_service.import_role_tcodes(audit_id, content, file.filename)
    
    return result
