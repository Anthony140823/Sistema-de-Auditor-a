from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field, UUID4, ConfigDict
from app.models.finding import FindingStatus


class FindingBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    assigned_to: Optional[UUID4] = None
    commitment_date: Optional[date] = None


class FindingCreate(FindingBase):
    audit_id: UUID4
    conflict_id: Optional[UUID4] = None


class FindingUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    status: Optional[FindingStatus] = None
    assigned_to: Optional[UUID4] = None
    commitment_date: Optional[date] = None


class FindingResponse(FindingBase):
    id: UUID4
    audit_id: UUID4
    conflict_id: Optional[UUID4]
    status: FindingStatus
    created_by: UUID4
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Finding Comment schemas
class FindingCommentCreate(BaseModel):
    comment_text: str = Field(..., min_length=1)


class FindingCommentResponse(BaseModel):
    id: UUID4
    finding_id: UUID4
    user_id: UUID4
    comment_text: str
    created_at: datetime
    
    # Joined data
    user_name: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


# Evidence File schemas
class EvidenceFileResponse(BaseModel):
    id: UUID4
    finding_id: UUID4
    file_name: str
    file_path: str
    file_size: int
    uploaded_by: UUID4
    uploaded_at: datetime
    
    # Joined data
    uploader_name: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)
