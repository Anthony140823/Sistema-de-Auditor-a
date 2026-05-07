import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Boolean, Enum as SQLEnum, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class RuleSeverity(str, enum.Enum):
    """SoD rule severity levels"""
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class SetType(str, enum.Enum):
    """TCode set type for SoD rules"""
    A = "A"
    B = "B"


class SoDRule(Base):
    """Segregation of Duties rule definition"""
    __tablename__ = "sod_rules"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(String(1000), nullable=True)
    severity = Column(SQLEnum(RuleSeverity), nullable=False, default=RuleSeverity.MEDIUM)
    risk_base_score = Column(Integer, nullable=False, default=50)  # 0-100
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<SoDRule {self.name} ({self.severity})>"


class SoDRuleItem(Base):
    """TCode items for SoD rules (Set A or Set B)"""
    __tablename__ = "sod_rule_items"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_id = Column(UUID(as_uuid=True), ForeignKey("sod_rules.id", ondelete="CASCADE"), nullable=False)
    set_type = Column(SQLEnum(SetType), nullable=False)
    tcode = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    rule = relationship("SoDRule", foreign_keys=[rule_id])
    
    # Index for performance
    __table_args__ = (
        Index('idx_rule_set_tcode', 'rule_id', 'set_type', 'tcode'),
    )
    
    def __repr__(self):
        return f"<SoDRuleItem {self.tcode} (Set {self.set_type})>"


class Conflict(Base):
    """Detected SoD conflict/violation"""
    __tablename__ = "conflicts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    audit_id = Column(UUID(as_uuid=True), ForeignKey("audits.id", ondelete="CASCADE"), nullable=False)
    sap_user_id = Column(UUID(as_uuid=True), ForeignKey("sap_users.id", ondelete="CASCADE"), nullable=False)
    rule_id = Column(UUID(as_uuid=True), ForeignKey("sod_rules.id", ondelete="CASCADE"), nullable=False)
    risk_score = Column(Integer, nullable=False)  # Calculated 0-100
    detected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    tcodes_set_a = Column(JSONB, nullable=False)  # Array of tcodes from Set A
    tcodes_set_b = Column(JSONB, nullable=False)  # Array of tcodes from Set B
    
    # Relationships
    audit = relationship("Audit", foreign_keys=[audit_id])
    sap_user = relationship("SAPUser", foreign_keys=[sap_user_id])
    rule = relationship("SoDRule", foreign_keys=[rule_id])
    
    # Index for queries
    __table_args__ = (
        Index('idx_conflict_audit_user', 'audit_id', 'sap_user_id'),
        Index('idx_conflict_audit_rule', 'audit_id', 'rule_id'),
    )
    
    def __repr__(self):
        return f"<Conflict Rule:{self.rule_id} User:{self.sap_user_id} Score:{self.risk_score}>"
