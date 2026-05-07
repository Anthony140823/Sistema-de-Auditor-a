from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field, UUID4, ConfigDict
from app.models.audit import AuditStatus


class AuditBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    company_name: str = Field(default="Consorcio Besalco Stracon", max_length=255)
    period_start: date
    period_end: date


class AuditCreate(AuditBase):
    responsible_user_id: Optional[UUID4] = None


class AuditUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    company_name: Optional[str] = Field(None, max_length=255)
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    status: Optional[AuditStatus] = None
    responsible_user_id: Optional[UUID4] = None


class AuditResponse(AuditBase):
    id: UUID4
    status: AuditStatus
    responsible_user_id: UUID4
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
