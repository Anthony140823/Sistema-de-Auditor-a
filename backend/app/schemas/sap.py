from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field, UUID4, ConfigDict


# SAP User schemas
class SAPUserBase(BaseModel):
    user_id: str = Field(..., max_length=40)
    full_name: Optional[str] = Field(None, max_length=255)
    user_type: Optional[str] = Field(None, max_length=50)
    is_locked: bool = False
    last_login: Optional[date] = None
    is_critical: bool = False


class SAPUserCreate(SAPUserBase):
    audit_id: UUID4


class SAPUserResponse(SAPUserBase):
    id: UUID4
    audit_id: UUID4
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# SAP Role schemas
class SAPRoleBase(BaseModel):
    role_name: str = Field(..., max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class SAPRoleCreate(SAPRoleBase):
    audit_id: UUID4


class SAPRoleResponse(SAPRoleBase):
    id: UUID4
    audit_id: UUID4
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Import schemas
class ImportSAPUsersRow(BaseModel):
    """Schema for SAP users CSV/Excel row"""
    userId: str
    fullName: Optional[str] = None
    userType: Optional[str] = None
    isLocked: Optional[bool] = False
    lastLogin: Optional[str] = None  # Will be parsed to date


class ImportUserRolesRow(BaseModel):
    """Schema for user-role assignments CSV/Excel row"""
    userId: str
    roleName: str
    validFrom: Optional[str] = None
    validTo: Optional[str] = None


class ImportRoleTCodesRow(BaseModel):
    """Schema for role-tcode assignments CSV/Excel row"""
    roleName: str
    tcode: str


class ImportValidationResult(BaseModel):
    """Result of import validation"""
    success: bool
    total_rows: int
    valid_rows: int
    errors: List[dict] = []
    warnings: List[dict] = []


class ImportStatusResponse(BaseModel):
    """Current import status for an audit"""
    users_count: int
    user_roles_count: int
    role_tcodes_count: int
