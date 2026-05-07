"""
SoD Engine - Core conflict detection logic
"""
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Set, Callable
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.models.sod import SoDRule, SoDRuleItem, Conflict, SetType, RuleSeverity
from app.models.sap import SAPUser, SAPUserRole, SAPRoleTCode


class SoDEngine:
    """Segregation of Duties conflict detection engine"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def detect_conflicts_for_audit(
        self, 
        audit_id: UUID, 
        rule_ids: Optional[List[UUID]] = None,
        progress_callback: Optional[Callable[[int, int, Optional[str], Optional[str]], None]] = None,
    ) -> Dict:
        """
        Detect all SoD conflicts for an audit
        
        Args:
            audit_id: Audit UUID
            rule_ids: Optional list of specific rules to check. If None, checks all active rules.
            
        Returns:
            Dictionary with detection results and statistics
        """
        start_time = time.time()
        
        # Clear existing conflicts for this audit
        self.db.query(Conflict).filter(Conflict.audit_id == audit_id).delete()
        self.db.commit()
        
        # Get rules to check
        query = self.db.query(SoDRule).filter(SoDRule.is_active == True)
        if rule_ids:
            query = query.filter(SoDRule.id.in_(rule_ids))
        rules = query.all()
        
        # Get all SAP users for this audit once
        sap_users = self.db.query(SAPUser).filter(SAPUser.audit_id == audit_id).all()
        precompute_steps = len(sap_users)
        detect_steps = len(rules) * len(sap_users)
        total_steps = max(precompute_steps + detect_steps, 1)
        processed_steps = 0

        if progress_callback:
            progress_callback(processed_steps, total_steps, None, None)

        # Build effective tcodes once per user to avoid repeating the same DB queries per rule
        user_effective_tcodes = {}
        for user in sap_users:
            user_effective_tcodes[user.user_id] = self._get_user_effective_tcodes(audit_id, user.user_id)
            processed_steps += 1
            if progress_callback:
                progress_callback(processed_steps, total_steps, "Preparando datos", user.user_id)

        total_conflicts = 0
        conflicts_by_severity = {
            RuleSeverity.HIGH: 0,
            RuleSeverity.MEDIUM: 0,
            RuleSeverity.LOW: 0,
        }
        
        # Process each rule
        for rule in rules:
            conflicts = self._detect_conflicts_for_rule(
                audit_id=audit_id,
                rule=rule,
                sap_users=sap_users,
                user_effective_tcodes=user_effective_tcodes,
                progress_callback=progress_callback,
                progress_state={"processed_steps": processed_steps, "total_steps": total_steps},
            )
            total_conflicts += len(conflicts)
            processed_steps += len(sap_users)
            
            # Count by severity
            conflicts_by_severity[rule.severity] += len(conflicts)

        if progress_callback:
            progress_callback(total_steps, total_steps, None, None)
        
        execution_time = time.time() - start_time
        
        return {
            "total_conflicts": total_conflicts,
            "conflicts_by_severity": {
                "HIGH": conflicts_by_severity[RuleSeverity.HIGH],
                "MEDIUM": conflicts_by_severity[RuleSeverity.MEDIUM],
                "LOW": conflicts_by_severity[RuleSeverity.LOW],
            },
            "execution_time_seconds": round(execution_time, 2),
            "rules_checked": len(rules),
        }
    
    def _detect_conflicts_for_rule(
        self,
        audit_id: UUID,
        rule: SoDRule,
        sap_users: List[SAPUser],
        user_effective_tcodes: Dict[str, Set[str]],
        progress_callback: Optional[Callable[[int, int, Optional[str], Optional[str]], None]] = None,
        progress_state: Optional[Dict[str, int]] = None,
    ) -> List[Conflict]:
        """
        Detect conflicts for a specific rule
        
        Args:
            audit_id: Audit UUID
            rule: SoD rule to check
            
        Returns:
            List of created Conflict objects
        """
        # Get tcodes for Set A and Set B
        set_a_tcodes = self._get_rule_tcodes(rule.id, SetType.A)
        set_b_tcodes = self._get_rule_tcodes(rule.id, SetType.B)
        
        if not set_a_tcodes or not set_b_tcodes:
            return []
        
        conflicts = []
        
        for user in sap_users:
            if progress_callback and progress_state:
                progress_state["processed_steps"] += 1
                progress_callback(
                    progress_state["processed_steps"],
                    progress_state["total_steps"],
                    rule.name,
                    user.user_id,
                )

            # Get effective tcodes from pre-built cache
            user_tcodes = user_effective_tcodes.get(user.user_id, set())
            
            # Check for conflicts
            tcodes_in_a = set(user_tcodes) & set(set_a_tcodes)
            tcodes_in_b = set(user_tcodes) & set(set_b_tcodes)
            
            if tcodes_in_a and tcodes_in_b:
                # Conflict detected!
                risk_score = self._calculate_risk_score(user, rule, tcodes_in_a, tcodes_in_b)
                
                conflict = Conflict(
                    audit_id=audit_id,
                    sap_user_id=user.id,
                    rule_id=rule.id,
                    risk_score=risk_score,
                    detected_at=datetime.utcnow(),
                    tcodes_set_a=list(tcodes_in_a),
                    tcodes_set_b=list(tcodes_in_b),
                )
                
                self.db.add(conflict)
                conflicts.append(conflict)
        
        # Commit all conflicts for this rule
        self.db.commit()
        
        return conflicts
    
    def _get_rule_tcodes(self, rule_id: UUID, set_type: SetType) -> List[str]:
        """Get all tcodes for a rule's set (A or B)"""
        items = self.db.query(SoDRuleItem).filter(
            and_(
                SoDRuleItem.rule_id == rule_id,
                SoDRuleItem.set_type == set_type
            )
        ).all()
        
        return [item.tcode for item in items]
    
    def _get_user_effective_tcodes(self, audit_id: UUID, user_id: str) -> Set[str]:
        """
        Get all effective tcodes for a user (via all their roles)
        
        Args:
            audit_id: Audit UUID
            user_id: SAP user ID
            
        Returns:
            Set of unique tcodes
        """
        # Get all roles for this user
        user_roles = self.db.query(SAPUserRole.role_name).filter(
            and_(
                SAPUserRole.audit_id == audit_id,
                SAPUserRole.user_id == user_id
            )
        ).all()
        
        role_names = [ur.role_name for ur in user_roles]
        
        if not role_names:
            return set()
        
        # Get all tcodes for these roles
        role_tcodes = self.db.query(SAPRoleTCode.tcode).filter(
            and_(
                SAPRoleTCode.audit_id == audit_id,
                SAPRoleTCode.role_name.in_(role_names)
            )
        ).distinct().all()
        
        return set(rt.tcode for rt in role_tcodes)
    
    def _calculate_risk_score(
        self, 
        user: SAPUser, 
        rule: SoDRule, 
        tcodes_a: Set[str], 
        tcodes_b: Set[str]
    ) -> int:
        """
        Calculate risk score for a conflict (0-100)
        
        Factors:
        - Rule severity (HIGH=40, MEDIUM=25, LOW=15)
        - User active status (+10 if not locked)
        - Recent login (+15 if last 30 days)
        - Critical user flag (+20)
        - Number of conflicting tcodes (+1 per tcode, max 15)
        
        Args:
            user: SAP user
            rule: SoD rule
            tcodes_a: Conflicting tcodes from Set A
            tcodes_b: Conflicting tcodes from Set B
            
        Returns:
            Risk score (0-100)
        """
        score = rule.risk_base_score
        
        # User not locked (active)
        if not user.is_locked:
            score += 10
        
        # Recent login (within 30 days)
        if user.last_login:
            days_since_login = (datetime.utcnow().date() - user.last_login).days
            if days_since_login <= 30:
                score += 15
        
        # Critical user
        if user.is_critical:
            score += 20
        
        # Number of conflicting tcodes
        tcode_bonus = min(len(tcodes_a) + len(tcodes_b), 15)
        score += tcode_bonus
        
        # Cap at 100
        return min(score, 100)
    
    def get_conflict_statistics(self, audit_id: UUID) -> Dict:
        """
        Get statistics about conflicts for an audit
        
        Args:
            audit_id: Audit UUID
            
        Returns:
            Dictionary with statistics
        """
        # Total conflicts
        total = self.db.query(func.count(Conflict.id)).filter(
            Conflict.audit_id == audit_id
        ).scalar()
        
        # Conflicts by severity (via rule)
        conflicts_with_severity = self.db.query(
            SoDRule.severity,
            func.count(Conflict.id)
        ).join(
            Conflict, Conflict.rule_id == SoDRule.id
        ).filter(
            Conflict.audit_id == audit_id
        ).group_by(SoDRule.severity).all()
        
        by_severity = {
            "HIGH": 0,
            "MEDIUM": 0,
            "LOW": 0,
        }
        
        for severity, count in conflicts_with_severity:
            by_severity[severity.value] = count
        
        # Average risk score
        avg_risk = self.db.query(func.avg(Conflict.risk_score)).filter(
            Conflict.audit_id == audit_id
        ).scalar() or 0
        
        return {
            "total_conflicts": total,
            "by_severity": by_severity,
            "average_risk_score": round(float(avg_risk), 2),
        }
