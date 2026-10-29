from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field

class MaintenanceCreate(BaseModel):
    asset_id: int
    reason: str = Field(..., min_length=5, description="Issue description or maintenance scope")
    technician_name: Optional[str] = None
    cost: Optional[float] = 0.0
    next_maintenance_date: Optional[date] = None

class MaintenanceUpdate(BaseModel):
    status: Optional[str] = None  # Pending, In Progress, Completed
    work_description: Optional[str] = None
    cost: Optional[float] = None
    technician_name: Optional[str] = None
    service_date: Optional[date] = None
    next_maintenance_date: Optional[date] = None

class MaintenanceVerifyReady(BaseModel):
    verification_notes: Optional[str] = None

class MaintenanceOut(BaseModel):
    id: int
    ticket_code: str
    asset_id: int
    reported_by_id: Optional[int] = None
    reason: str
    date_reported: datetime
    status: str
    is_ready_for_use: bool
    verified_by_id: Optional[int] = None
    verified_at: Optional[datetime] = None
    service_date: Optional[date] = None
    work_description: Optional[str] = None
    cost: float
    technician_name: Optional[str] = None
    next_maintenance_date: Optional[date] = None
    created_at: datetime
    
    # Enriched fields
    asset_name: Optional[str] = None
    asset_code: Optional[str] = None
    asset_category: Optional[str] = None
    department_name: Optional[str] = None
    reported_by_name: Optional[str] = None
    verified_by_name: Optional[str] = None

    class Config:
        from_attributes = True
