from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class BorrowingRequestCreate(BaseModel):
    asset_id: int
    duration_days: int = Field(..., gt=0, le=30, description="Intended loan period in days")
    intended_purpose: str = Field(..., min_length=5, description="Course / project / academic reason")

class BorrowingApproval(BaseModel):
    notes: Optional[str] = None

class BorrowingRejection(BaseModel):
    rejection_reason: str = Field(..., min_length=3, description="Reason for rejection")

class BorrowingReturn(BaseModel):
    returned_condition: str = Field(..., description="Good, Minor Damage, Major Damage, Damaged")
    return_notes: Optional[str] = None

class BorrowingProblemReport(BaseModel):
    problem_description: str = Field(..., min_length=5, description="Details of malfunction or damage")

class BorrowingRequestOut(BaseModel):
    id: int
    request_code: str
    asset_id: int
    user_id: int
    request_date: datetime
    duration_days: int
    intended_purpose: str
    status: str
    approved_by_id: Optional[int] = None
    approval_date: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    issued_at: Optional[datetime] = None
    due_date: Optional[datetime] = None
    returned_at: Optional[datetime] = None
    returned_condition: Optional[str] = None
    return_notes: Optional[str] = None
    user_reported_problem: Optional[str] = None
    problem_reported_at: Optional[datetime] = None
    created_at: datetime
    
    # Enriched fields
    asset_name: Optional[str] = None
    asset_code: Optional[str] = None
    asset_category: Optional[str] = None
    department_name: Optional[str] = None
    user_full_name: Optional[str] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    is_overdue: bool = False

    class Config:
        from_attributes = True
