import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


class AuditLog(Base):
    """System audit trail for all critical actions"""
    __tablename__ = "audit_log"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("app_users.id"), nullable=True)
    action = Column(String(100), nullable=False)  # e.g., "LOGIN", "CREATE_AUDIT", "DETECT_CONFLICTS"
    entity_type = Column(String(50), nullable=True)  # e.g., "audit", "finding", "user"
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    details = Column(JSONB, nullable=True)  # Additional context as JSON
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("AppUser", foreign_keys=[user_id])
    
    def __repr__(self):
        return f"<AuditLog {self.action} by User:{self.user_id}>"
