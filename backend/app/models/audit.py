import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, DateTime, Date, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class AuditStatus(str, enum.Enum):
    """Audit status workflow"""
    DRAFT = "DRAFT"
    IN_PROGRESS = "IN_PROGRESS"
    CLOSED = "CLOSED"


class Audit(Base):
    """Audit project/engagement"""
    __tablename__ = "audits"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    company_name = Column(String(255), nullable=False, default="Consorcio Besalco Stracon")
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    status = Column(SQLEnum(AuditStatus), nullable=False, default=AuditStatus.DRAFT)
    responsible_user_id = Column(UUID(as_uuid=True), ForeignKey("app_users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    responsible_user = relationship("AppUser", foreign_keys=[responsible_user_id])
    
    def __repr__(self):
        return f"<Audit {self.name} ({self.status})>"
