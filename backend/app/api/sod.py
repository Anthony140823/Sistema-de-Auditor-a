"""
SoD Rules and Conflicts API endpoints
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.core.database import get_db
from app.schemas.sod import (
    SoDRuleCreate,
    SoDRuleUpdate,
    SoDRuleResponse,
    SoDRuleDetailResponse,
    ConflictResponse,
    ConflictDetectionRequest,
    ConflictDetectionResponse,
    ConflictDetectionProgressResponse,
)
from app.models.sod import SoDRule, SoDRuleItem, Conflict, SetType, RuleSeverity
from app.models.sap import SAPUser
from app.models.user import AppUser
from app.models.audit import Audit
from app.services.sod_engine import SoDEngine
from app.services.detection_progress_service import (
    start_detection,
    update_detection,
    finish_detection,
    fail_detection,
    get_detection_progress,
)
from app.api.deps import require_auditor, get_current_user
from app.services.audit_log_service import log_action


router = APIRouter(tags=["SoD Rules & Conflicts"])


# ========== SoD Rules ==========

@router.get("/sod-rules", response_model=List[SoDRuleResponse])
def list_sod_rules(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(get_current_user)
):
    """List all SoD rules"""
    query = db.query(SoDRule)
    
    if is_active is not None:
        query = query.filter(SoDRule.is_active == is_active)
    
    rules = query.offset(skip).limit(limit).all()
    return rules


@router.get("/sod-rules/{rule_id}", response_model=SoDRuleDetailResponse)
def get_sod_rule(
    rule_id: UUID,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(get_current_user)
):
    """Get SoD rule with tcode details"""
    rule = db.query(SoDRule).filter(SoDRule.id == rule_id).first()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rule not found"
        )
    
    # Get tcodes for Set A and B
    items = db.query(SoDRuleItem).filter(SoDRuleItem.rule_id == rule_id).all()
    
    set_a_tcodes = [item.tcode for item in items if item.set_type == SetType.A]
    set_b_tcodes = [item.tcode for item in items if item.set_type == SetType.B]
    
    rule_dict = {
        **rule.__dict__,
        "set_a_tcodes": set_a_tcodes,
        "set_b_tcodes": set_b_tcodes,
    }
    
    return rule_dict


@router.post("/sod-rules", response_model=SoDRuleResponse, status_code=status.HTTP_201_CREATED)
def create_sod_rule(
    rule_data: SoDRuleCreate,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_auditor)
):
    """Create a new SoD rule (ADMIN/AUDITOR only)"""
    # Check if name exists
    existing = db.query(SoDRule).filter(SoDRule.name == rule_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rule with this name already exists"
        )
    
    # Create rule
    rule = SoDRule(
        name=rule_data.name,
        description=rule_data.description,
        severity=rule_data.severity,
        risk_base_score=rule_data.risk_base_score,
        is_active=rule_data.is_active,
    )
    db.add(rule)
    db.flush()
    
    # Add Set A tcodes
    for tcode in rule_data.set_a_tcodes:
        item = SoDRuleItem(
            rule_id=rule.id,
            set_type=SetType.A,
            tcode=tcode.upper(),
        )
        db.add(item)
    
    # Add Set B tcodes
    for tcode in rule_data.set_b_tcodes:
        item = SoDRuleItem(
            rule_id=rule.id,
            set_type=SetType.B,
            tcode=tcode.upper(),
        )
        db.add(item)
    
    db.commit()
    db.refresh(rule)
    
    return rule


@router.put("/sod-rules/{rule_id}", response_model=SoDRuleResponse)
def update_sod_rule(
    rule_id: UUID,
    rule_data: SoDRuleUpdate,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_auditor)
):
    """Update SoD rule (ADMIN/AUDITOR only)"""
    rule = db.query(SoDRule).filter(SoDRule.id == rule_id).first()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rule not found"
        )
    
    # Update fields
    for field, value in rule_data.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)
    
    db.commit()
    db.refresh(rule)
    return rule


# ========== Conflicts ==========

@router.post("/audits/{audit_id}/detect-conflicts", response_model=ConflictDetectionResponse)
def detect_conflicts(
    audit_id: UUID,
    request: ConflictDetectionRequest = ConflictDetectionRequest(),
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_auditor)
):
    """
    Run SoD conflict detection for an audit (ADMIN/AUDITOR only)
    
    This will:
    1. Clear existing conflicts
    2. Run detection engine
    3. Create new conflict records
    """
    # Verify audit exists
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit not found"
        )
    
    def on_progress(processed: int, total: int, current_rule: Optional[str], current_user: Optional[str]):
        update_detection(
            audit_id=audit_id,
            processed_steps=processed,
            total_steps=total,
            current_rule=current_rule,
            current_user=current_user,
        )

    engine = SoDEngine(db)
    start_detection(audit_id, total_steps=1)
    try:
        result = engine.detect_conflicts_for_audit(audit_id, request.rule_ids, progress_callback=on_progress)
        finish_detection(audit_id)
    except Exception as exc:
        fail_detection(audit_id, str(exc))
        raise

    log_action(
        db=db,
        action="DETECT_CONFLICTS",
        user_id=current_user.id,
        entity_type="audit",
        entity_id=audit_id,
        details=result,
    )
    
    return result


@router.get("/audits/{audit_id}/detect-progress", response_model=ConflictDetectionProgressResponse)
def get_detect_progress(
    audit_id: UUID,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(get_current_user),
):
    """Get real-time detection progress for an audit"""
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit not found"
        )
    return get_detection_progress(audit_id)


@router.get("/audits/{audit_id}/conflicts", response_model=List[ConflictResponse])
def list_conflicts(
    audit_id: UUID,
    severity: Optional[RuleSeverity] = None,
    min_risk_score: Optional[int] = Query(None, ge=0, le=100),
    user_id: Optional[str] = None,
    rule_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(get_current_user)
):
    """List conflicts for an audit with filters"""
    # Base query with joins
    query = db.query(
        Conflict,
        SAPUser.full_name.label("user_name"),
        SAPUser.user_id.label("sap_user_code"),
        SoDRule.name.label("rule_name"),
        SoDRule.severity.label("rule_severity"),
    ).join(
        SAPUser, Conflict.sap_user_id == SAPUser.id
    ).join(
        SoDRule, Conflict.rule_id == SoDRule.id
    ).filter(
        Conflict.audit_id == audit_id
    )
    
    # Apply filters
    if severity:
        query = query.filter(SoDRule.severity == severity)
    
    if min_risk_score is not None:
        query = query.filter(Conflict.risk_score >= min_risk_score)

    if user_id:
        query = query.filter(SAPUser.user_id == user_id)

    if rule_id:
        query = query.filter(Conflict.rule_id == rule_id)
    
    # Execute query
    results = query.offset(skip).limit(limit).all()
    
    # Format response
    conflicts = []
    for conflict, user_name, sap_user_code, rule_name, rule_severity in results:
        conflict_dict = {
            **conflict.__dict__,
            "user_name": user_name,
            "user_id": sap_user_code,
            "rule_name": rule_name,
            "rule_severity": rule_severity,
        }
        conflicts.append(conflict_dict)
    
    return conflicts
