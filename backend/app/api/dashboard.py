"""
Dashboard API endpoints
"""
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.finding import Finding
from app.models.sap import SAPUser
from app.models.sod import Conflict, SoDRule
from app.models.user import AppUser


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
def get_dashboard_summary(
    audit_id: UUID,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(get_current_user),
):
    total_users = db.query(func.count(SAPUser.id)).filter(SAPUser.audit_id == audit_id).scalar() or 0
    active_users = db.query(func.count(SAPUser.id)).filter(
        SAPUser.audit_id == audit_id,
        SAPUser.is_locked.is_(False),
    ).scalar() or 0
    total_conflicts = db.query(func.count(Conflict.id)).filter(Conflict.audit_id == audit_id).scalar() or 0

    conflicts_by_severity_rows = db.query(
        SoDRule.severity,
        func.count(Conflict.id),
    ).join(
        Conflict, Conflict.rule_id == SoDRule.id
    ).filter(
        Conflict.audit_id == audit_id
    ).group_by(SoDRule.severity).all()

    conflicts_by_severity = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for severity, count in conflicts_by_severity_rows:
        conflicts_by_severity[severity.value] = count

    top_risky_users_rows = db.query(
        SAPUser.user_id,
        SAPUser.full_name,
        func.max(Conflict.risk_score).label("risk_score"),
        func.count(Conflict.id).label("conflicts_count"),
    ).join(
        Conflict, Conflict.sap_user_id == SAPUser.id
    ).filter(
        Conflict.audit_id == audit_id
    ).group_by(
        SAPUser.user_id, SAPUser.full_name
    ).order_by(
        func.max(Conflict.risk_score).desc(),
        func.count(Conflict.id).desc(),
    ).limit(10).all()

    top_risky_users = [
        {
            "user_id": user_id,
            "user_name": full_name or user_id,
            "risk_score": int(risk_score),
            "conflicts_count": int(conflicts_count),
        }
        for user_id, full_name, risk_score, conflicts_count in top_risky_users_rows
    ]

    top_violated_rules_rows = db.query(
        SoDRule.id,
        SoDRule.name,
        func.count(Conflict.id).label("violations_count"),
    ).join(
        Conflict, Conflict.rule_id == SoDRule.id
    ).filter(
        Conflict.audit_id == audit_id
    ).group_by(
        SoDRule.id, SoDRule.name
    ).order_by(
        func.count(Conflict.id).desc()
    ).limit(10).all()

    top_violated_rules = [
        {
            "rule_id": str(rule_id),
            "rule_name": name,
            "violations_count": int(violations_count),
        }
        for rule_id, name, violations_count in top_violated_rules_rows
    ]

    findings_rows = db.query(Finding.status, func.count(Finding.id)).filter(
        Finding.audit_id == audit_id
    ).group_by(Finding.status).all()
    findings_by_status = {
        "OPEN": 0,
        "IN_REVIEW": 0,
        "ACCEPTED": 0,
        "REMEDIATED": 0,
        "EXCEPTION_APPROVED": 0,
        "CLOSED": 0,
    }
    for status, count in findings_rows:
        findings_by_status[status.value] = count

    return {
        "total_users": int(total_users),
        "active_users": int(active_users),
        "total_conflicts": int(total_conflicts),
        "conflicts_by_severity": conflicts_by_severity,
        "top_risky_users": top_risky_users,
        "top_violated_rules": top_violated_rules,
        "findings_by_status": findings_by_status,
    }
