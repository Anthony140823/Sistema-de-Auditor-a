import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, DateTime, Date, Text, Enum as SQLEnum, ForeignKey, Integer, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class FindingStatus(str, enum.Enum):
    """Finding workflow status"""
    OPEN = "OPEN"
    IN_REVIEW = "IN_REVIEW"
    ACCEPTED = "ACCEPTED"
    REMEDIATED = "REMEDIATED"
    EXCEPTION_APPROVED = "EXCEPTION_APPROVED"
    CLOSED = "CLOSED"


class Finding(Base):
    """Audit finding from SoD conflict"""
    __tablename__ = "findings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    audit_id = Column(UUID(as_uuid=True), ForeignKey("audits.id", ondelete="CASCADE"), nullable=False)
    conflict_id = Column(UUID(as_uuid=True), ForeignKey("conflicts.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(FindingStatus), nullable=False, default=FindingStatus.OPEN)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("app_users.id"), nullable=True)
    commitment_date = Column(Date, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("app_users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    audit = relationship("Audit", foreign_keys=[audit_id])
    conflict = relationship("Conflict", foreign_keys=[conflict_id])
    assigned_user = relationship("AppUser", foreign_keys=[assigned_to])
    creator = relationship("AppUser", foreign_keys=[created_by])
    
    # Index
    __table_args__ = (
        Index('idx_finding_audit_status', 'audit_id', 'status'),
    )
    
    def __repr__(self):
        return f"<Finding {self.title} ({self.status})>"


class FindingComment(Base):
    """Comments/discussion on findings"""
    __tablename__ = "finding_comments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    finding_id = Column(UUID(as_uuid=True), ForeignKey("findings.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("app_users.id"), nullable=False)
    comment_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    finding = relationship("Finding", foreign_keys=[finding_id])
    user = relationship("AppUser", foreign_keys=[user_id])
    
    def __repr__(self):
        return f"<FindingComment on Finding:{self.finding_id}>"


class EvidenceFile(Base):
    """Evidence files attached to findings"""
    __tablename__ = "evidence_files"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    finding_id = Column(UUID(as_uuid=True), ForeignKey("findings.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)  # bytes
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("app_users.id"), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    finding = relationship("Finding", foreign_keys=[finding_id])
    uploader = relationship("AppUser", foreign_keys=[uploaded_by])
    
    def __repr__(self):
        return f"<EvidenceFile {self.file_name}>"
