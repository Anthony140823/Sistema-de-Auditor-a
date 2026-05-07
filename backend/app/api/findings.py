"""
Findings API endpoints
"""
from pathlib import Path
from typing import List
from uuid import UUID
import uuid
import mimetypes
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.finding import (
    FindingCreate,
    FindingUpdate,
    FindingResponse,
    FindingCommentCreate,
    FindingCommentResponse,
    EvidenceFileResponse,
)
from app.models.finding import Finding, FindingComment, EvidenceFile
from app.models.user import AppUser, UserRole
from app.api.deps import get_current_user, require_auditor
from app.services.audit_log_service import log_action


router = APIRouter(prefix="/findings", tags=["Findings"])
EVIDENCE_DIR = Path("uploads/evidence")
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)


@router.get("", response_model=List[FindingResponse])
def list_findings(
    audit_id: UUID = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(get_current_user)
):
    """List findings"""
    query = db.query(Finding)
    
    if audit_id:
        query = query.filter(Finding.audit_id == audit_id)
    
    findings = query.offset(skip).limit(limit).all()
    return findings


@router.post("", response_model=FindingResponse, status_code=status.HTTP_201_CREATED)
def create_finding(
    finding_data: FindingCreate,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_auditor)
):
    """Create a new finding (ADMIN/AUDITOR only)"""
    if finding_data.conflict_id:
        existing = db.query(Finding).filter(Finding.conflict_id == finding_data.conflict_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un hallazgo para este conflicto"
            )

    finding = Finding(
        **finding_data.model_dump(),
        created_by=current_user.id
    )
    db.add(finding)
    db.commit()
    db.refresh(finding)
    log_action(
        db=db,
        action="CREATE_FINDING",
        user_id=current_user.id,
        entity_type="finding",
        entity_id=finding.id,
    )
    return finding


@router.get("/{finding_id}", response_model=FindingResponse)
def get_finding(
    finding_id: UUID,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(get_current_user)
):
    """Get finding by ID"""
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Finding not found"
        )
    return finding


@router.put("/{finding_id}", response_model=FindingResponse)
def update_finding(
    finding_id: UUID,
    finding_data: FindingUpdate,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(get_current_user)
):
    """Update finding"""
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Finding not found"
        )
    
    # Check permissions: ADMIN/AUDITOR can update any, RESPONSABLE only if assigned
    if current_user.role == UserRole.RESPONSABLE:
        if finding.assigned_to != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this finding"
            )
    
    # Update fields
    for field, value in finding_data.model_dump(exclude_unset=True).items():
        setattr(finding, field, value)
    
    db.commit()
    db.refresh(finding)
    log_action(
        db=db,
        action="UPDATE_FINDING",
        user_id=current_user.id,
        entity_type="finding",
        entity_id=finding.id,
        details={"status": finding.status.value},
    )
    return finding


@router.post("/{finding_id}/comments", response_model=FindingCommentResponse, status_code=status.HTTP_201_CREATED)
def add_comment(
    finding_id: UUID,
    comment_data: FindingCommentCreate,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(get_current_user)
):
    """Add a comment to a finding"""
    # Verify finding exists
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Finding not found"
        )
    
    comment = FindingComment(
        finding_id=finding_id,
        user_id=current_user.id,
        comment_text=comment_data.comment_text
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    log_action(
        db=db,
        action="ADD_FINDING_COMMENT",
        user_id=current_user.id,
        entity_type="finding",
        entity_id=finding_id,
    )
    
    return FindingCommentResponse(
        id=comment.id,
        finding_id=comment.finding_id,
        user_id=comment.user_id,
        comment_text=comment.comment_text,
        created_at=comment.created_at,
        user_name=current_user.full_name,
    )


@router.get("/{finding_id}/comments", response_model=List[FindingCommentResponse])
def list_comments(
    finding_id: UUID,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(get_current_user)
):
    """List all comments for a finding"""
    comments = db.query(
        FindingComment,
        AppUser.full_name.label("user_name")
    ).join(
        AppUser, FindingComment.user_id == AppUser.id
    ).filter(
        FindingComment.finding_id == finding_id
    ).all()
    
    return [
        FindingCommentResponse(
            id=comment.id,
            finding_id=comment.finding_id,
            user_id=comment.user_id,
            comment_text=comment.comment_text,
            created_at=comment.created_at,
            user_name=user_name,
        )
        for comment, user_name in comments
    ]


@router.post("/{finding_id}/evidence", response_model=EvidenceFileResponse, status_code=status.HTTP_201_CREATED)
async def upload_evidence(
    finding_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(get_current_user),
):
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")

    ext = Path(file.filename or "").suffix
    unique_name = f"{uuid.uuid4()}{ext}"
    out_path = EVIDENCE_DIR / unique_name
    content = await file.read()
    out_path.write_bytes(content)

    evidence = EvidenceFile(
        finding_id=finding_id,
        file_name=file.filename or unique_name,
        file_path=str(out_path.as_posix()),
        file_size=len(content),
        uploaded_by=current_user.id,
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    log_action(
        db=db,
        action="UPLOAD_EVIDENCE",
        user_id=current_user.id,
        entity_type="finding",
        entity_id=finding_id,
        details={"file_name": evidence.file_name},
    )

    return EvidenceFileResponse(
        id=evidence.id,
        finding_id=evidence.finding_id,
        file_name=evidence.file_name,
        file_path=evidence.file_path,
        file_size=evidence.file_size,
        uploaded_by=evidence.uploaded_by,
        uploaded_at=evidence.uploaded_at,
        uploader_name=current_user.full_name,
    )


@router.get("/{finding_id}/evidence", response_model=List[EvidenceFileResponse])
def list_evidence(
    finding_id: UUID,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(get_current_user),
):
    rows = db.query(
        EvidenceFile,
        AppUser.full_name.label("uploader_name"),
    ).join(
        AppUser, EvidenceFile.uploaded_by == AppUser.id
    ).filter(
        EvidenceFile.finding_id == finding_id
    ).all()
    return [
        EvidenceFileResponse(
            id=evidence.id,
            finding_id=evidence.finding_id,
            file_name=evidence.file_name,
            file_path=evidence.file_path,
            file_size=evidence.file_size,
            uploaded_by=evidence.uploaded_by,
            uploaded_at=evidence.uploaded_at,
            uploader_name=uploader_name,
        )
        for evidence, uploader_name in rows
    ]


@router.get("/{finding_id}/evidence/{evidence_id}/content")
def get_evidence_content(
    finding_id: UUID,
    evidence_id: UUID,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(get_current_user),
):
    """Download or preview an evidence file"""
    evidence = db.query(EvidenceFile).filter(
        EvidenceFile.id == evidence_id,
        EvidenceFile.finding_id == finding_id,
    ).first()
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")

    path = Path(evidence.file_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file not found on disk")

    media_type = mimetypes.guess_type(evidence.file_name)[0] or "application/octet-stream"
    return FileResponse(
        path=str(path),
        media_type=media_type,
        filename=evidence.file_name,
    )
