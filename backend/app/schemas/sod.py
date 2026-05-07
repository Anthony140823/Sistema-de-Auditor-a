from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, UUID4, ConfigDict
from app.models.sod import RuleSeverity, SetType


# SoD Rule schemas
class SoDRuleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    severity: RuleSeverity = RuleSeverity.MEDIUM
    risk_base_score: int = Field(default=50, ge=0, le=100)
    is_active: bool = True


class SoDRuleCreate(SoDRuleBase):
    set_a_tcodes: List[str] = Field(..., min_items=1)
    set_b_tcodes: List[str] = Field(..., min_items=1)


class SoDRuleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    severity: Optional[RuleSeverity] = None
    risk_base_score: Optional[int] = Field(None, ge=0, le=100)
    is_active: Optional[bool] = None


class SoDRuleItemResponse(BaseModel):
    id: UUID4
    set_type: SetType
    tcode: str
    
    model_config = ConfigDict(from_attributes=True)


class SoDRuleResponse(SoDRuleBase):
    id: UUID4
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class SoDRuleDetailResponse(SoDRuleResponse):
    """Rule with tcode items"""
    set_a_tcodes: List[str] = []
    set_b_tcodes: List[str] = []


# Conflict schemas
class ConflictResponse(BaseModel):
    id: UUID4
    audit_id: UUID4
    sap_user_id: UUID4
    rule_id: UUID4
    risk_score: int
    detected_at: datetime
    tcodes_set_a: List[str]
    tcodes_set_b: List[str]
    
    # Joined data
    user_name: Optional[str] = None
    user_id: Optional[str] = None
    rule_name: Optional[str] = None
    rule_severity: Optional[RuleSeverity] = None
    
    model_config = ConfigDict(from_attributes=True)


class ConflictDetectionRequest(BaseModel):
    """Request to run conflict detection"""
    rule_ids: Optional[List[UUID4]] = None  # If None, run all active rules


class ConflictDetectionResponse(BaseModel):
    """Result of conflict detection"""
    total_conflicts: int
    conflicts_by_severity: dict
    execution_time_seconds: float


class ConflictDetectionProgressResponse(BaseModel):
    """Real-time progress of a running conflict detection"""
    audit_id: str
    is_running: bool
    total_steps: int
    processed_steps: int
    progress_percent: int
    current_rule: Optional[str] = None
    current_user: Optional[str] = None
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    error: Optional[str] = None
