"""
Import Service - Handle CSV/Excel file imports
"""
import pandas as pd
from datetime import datetime
from typing import List, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from io import BytesIO

from app.models.sap import SAPUser, SAPRole, SAPUserRole, SAPRoleTCode
from app.schemas.sap import (
    ImportSAPUsersRow,
    ImportUserRolesRow,
    ImportRoleTCodesRow,
    ImportValidationResult,
)


class ImportService:
    """Service for importing SAP data from Excel/CSV files"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def import_sap_users(self, audit_id: UUID, file_content: bytes, filename: str) -> ImportValidationResult:
        """
        Import SAP users from Excel/CSV file
        
        Expected columns: userId, fullName, userType, isLocked, lastLogin
        """
        try:
            # Read file
            df = self._read_file(file_content, filename)
            
            # Validate columns
            required_cols = ['userId']
            optional_cols = ['fullName', 'userType', 'isLocked', 'lastLogin']
            
            validation = self._validate_columns(df, required_cols, optional_cols)
            if not validation['success']:
                return ImportValidationResult(**validation)
            
            # Process rows
            errors = []
            valid_rows = 0
            
            for idx, row in df.iterrows():
                try:
                    # Parse last login date
                    last_login = None
                    if pd.notna(row.get('lastLogin')):
                        last_login = pd.to_datetime(row['lastLogin']).date()
                    
                    # Check if user already exists
                    existing = self.db.query(SAPUser).filter(
                        SAPUser.audit_id == audit_id,
                        SAPUser.user_id == str(row['userId'])
                    ).first()
                    
                    if existing:
                        errors.append({
                            'row': idx + 2,
                            'error': f"User {row['userId']} already exists"
                        })
                        continue
                    
                    # Create user
                    user = SAPUser(
                        audit_id=audit_id,
                        user_id=str(row['userId']),
                        full_name=str(row.get('fullName', '')) if pd.notna(row.get('fullName')) else None,
                        user_type=str(row.get('userType', '')) if pd.notna(row.get('userType')) else None,
                        is_locked=bool(row.get('isLocked', False)),
                        last_login=last_login,
                    )
                    
                    self.db.add(user)
                    valid_rows += 1
                    
                except Exception as e:
                    errors.append({
                        'row': idx + 2,
                        'error': str(e)
                    })
            
            self.db.commit()
            
            return ImportValidationResult(
                success=len(errors) == 0,
                total_rows=len(df),
                valid_rows=valid_rows,
                errors=errors,
            )
            
        except Exception as e:
            return ImportValidationResult(
                success=False,
                total_rows=0,
                valid_rows=0,
                errors=[{'row': 0, 'error': f"File processing error: {str(e)}"}],
            )
    
    def import_user_roles(self, audit_id: UUID, file_content: bytes, filename: str) -> ImportValidationResult:
        """
        Import user-role assignments from Excel/CSV file
        
        Expected columns: userId, roleName, validFrom, validTo
        """
        try:
            df = self._read_file(file_content, filename)
            
            required_cols = ['userId', 'roleName']
            optional_cols = ['validFrom', 'validTo']
            
            validation = self._validate_columns(df, required_cols, optional_cols)
            if not validation['success']:
                return ImportValidationResult(**validation)
            
            errors = []
            valid_rows = 0
            
            for idx, row in df.iterrows():
                try:
                    # Parse dates
                    valid_from = None
                    valid_to = None
                    
                    if pd.notna(row.get('validFrom')):
                        valid_from = pd.to_datetime(row['validFrom']).date()
                    if pd.notna(row.get('validTo')):
                        valid_to = pd.to_datetime(row['validTo']).date()
                    
                    # Create assignment
                    assignment = SAPUserRole(
                        audit_id=audit_id,
                        user_id=str(row['userId']),
                        role_name=str(row['roleName']),
                        valid_from=valid_from,
                        valid_to=valid_to,
                    )
                    
                    self.db.add(assignment)
                    valid_rows += 1
                    
                except Exception as e:
                    errors.append({
                        'row': idx + 2,
                        'error': str(e)
                    })
            
            self.db.commit()
            
            return ImportValidationResult(
                success=len(errors) == 0,
                total_rows=len(df),
                valid_rows=valid_rows,
                errors=errors,
            )
            
        except Exception as e:
            return ImportValidationResult(
                success=False,
                total_rows=0,
                valid_rows=0,
                errors=[{'row': 0, 'error': f"File processing error: {str(e)}"}],
            )
    
    def import_role_tcodes(self, audit_id: UUID, file_content: bytes, filename: str) -> ImportValidationResult:
        """
        Import role-tcode assignments from Excel/CSV file
        
        Expected columns: roleName, tcode
        """
        try:
            df = self._read_file(file_content, filename)
            
            required_cols = ['roleName', 'tcode']
            
            validation = self._validate_columns(df, required_cols, [])
            if not validation['success']:
                return ImportValidationResult(**validation)
            
            errors = []
            valid_rows = 0
            
            for idx, row in df.iterrows():
                try:
                    # Create assignment
                    assignment = SAPRoleTCode(
                        audit_id=audit_id,
                        role_name=str(row['roleName']),
                        tcode=str(row['tcode']).upper(),  # Normalize to uppercase
                    )
                    
                    self.db.add(assignment)
                    valid_rows += 1
                    
                except Exception as e:
                    errors.append({
                        'row': idx + 2,
                        'error': str(e)
                    })
            
            self.db.commit()
            
            return ImportValidationResult(
                success=len(errors) == 0,
                total_rows=len(df),
                valid_rows=valid_rows,
                errors=errors,
            )
            
        except Exception as e:
            return ImportValidationResult(
                success=False,
                total_rows=0,
                valid_rows=0,
                errors=[{'row': 0, 'error': f"File processing error: {str(e)}"}],
            )
    
    def _read_file(self, file_content: bytes, filename: str) -> pd.DataFrame:
        """Read Excel or CSV file into DataFrame"""
        if filename.endswith('.csv'):
            return pd.read_csv(BytesIO(file_content))
        elif filename.endswith(('.xlsx', '.xls')):
            return pd.read_excel(BytesIO(file_content))
        else:
            raise ValueError("Unsupported file format. Use CSV or Excel (.xlsx, .xls)")
    
    def _validate_columns(self, df: pd.DataFrame, required: List[str], optional: List[str]) -> Dict[str, Any]:
        """Validate that DataFrame has required columns"""
        missing = [col for col in required if col not in df.columns]
        
        if missing:
            return {
                'success': False,
                'total_rows': 0,
                'valid_rows': 0,
                'errors': [{
                    'row': 0,
                    'error': f"Missing required columns: {', '.join(missing)}"
                }],
            }
        
        return {'success': True}
