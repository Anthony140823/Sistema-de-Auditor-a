import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, DateTime, Date, Boolean, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class SAPUser(Base):
    """SAP user master data"""
    __tablename__ = "sap_users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    audit_id = Column(UUID(as_uuid=True), ForeignKey("audits.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(40), nullable=False)  # SAP user ID
    full_name = Column(String(255), nullable=True)
    user_type = Column(String(50), nullable=True)
    is_locked = Column(Boolean, default=False, nullable=False)
    last_login = Column(Date, nullable=True)
    is_critical = Column(Boolean, default=False, nullable=False)  # High-privilege user flag
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    audit = relationship("Audit", foreign_keys=[audit_id])
    
    # Composite unique constraint: one user_id per audit
    __table_args__ = (
        Index('idx_sap_user_audit', 'audit_id', 'user_id', unique=True),
    )
    
    def __repr__(self):
        return f"<SAPUser {self.user_id} - {self.full_name}>"


class SAPRole(Base):
    """SAP role catalog"""
    __tablename__ = "sap_roles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    audit_id = Column(UUID(as_uuid=True), ForeignKey("audits.id", ondelete="CASCADE"), nullable=False)
    role_name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    audit = relationship("Audit", foreign_keys=[audit_id])
    
    # Composite unique constraint
    __table_args__ = (
        Index('idx_sap_role_audit', 'audit_id', 'role_name', unique=True),
    )
    
    def __repr__(self):
        return f"<SAPRole {self.role_name}>"


class SAPUserRole(Base):
    """User-Role assignment (many-to-many)"""
    __tablename__ = "sap_user_roles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    audit_id = Column(UUID(as_uuid=True), ForeignKey("audits.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(40), nullable=False)  # SAP user ID
    role_name = Column(String(100), nullable=False)
    valid_from = Column(Date, nullable=True)
    valid_to = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    audit = relationship("Audit", foreign_keys=[audit_id])
    
    def __repr__(self):
        return f"<SAPUserRole {self.user_id} -> {self.role_name}>"


class SAPRoleTCode(Base):
    """Role-TCode assignment (many-to-many)"""
    __tablename__ = "sap_role_tcodes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    audit_id = Column(UUID(as_uuid=True), ForeignKey("audits.id", ondelete="CASCADE"), nullable=False)
    role_name = Column(String(100), nullable=False)
    tcode = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    audit = relationship("Audit", foreign_keys=[audit_id])
    
    # Index for performance
    __table_args__ = (
        Index('idx_role_tcode_audit', 'audit_id', 'role_name', 'tcode'),
    )
    
    def __repr__(self):
        return f"<SAPRoleTCode {self.role_name} -> {self.tcode}>"
