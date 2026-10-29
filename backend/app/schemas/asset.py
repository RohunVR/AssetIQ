from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field

class AssetBase(BaseModel):
    asset_code: str = Field(..., min_length=2, max_length=100)
    name: str = Field(..., min_length=2, max_length=255)
    category: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    department_id: int
    laboratory_id: Optional[int] = None
    location: Optional[str] = None
    purchase_date: Optional[date] = None
    serial_number: Optional[str] = None
    model_number: Optional[str] = None
    cost: Optional[float] = 0.0
    condition: str = Field(default="Good")
    status: str = Field(default="Available")

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    department_id: Optional[int] = None
    laboratory_id: Optional[int] = None
    location: Optional[str] = None
    purchase_date: Optional[date] = None
    serial_number: Optional[str] = None
    model_number: Optional[str] = None
    cost: Optional[float] = None
    condition: Optional[str] = None
    status: Optional[str] = None

class AssetOut(AssetBase):
    id: int
    created_at: datetime
    updated_at: datetime
    department_name: Optional[str] = None
    department_code: Optional[str] = None
    laboratory_name: Optional[str] = None
    current_borrower_name: Optional[str] = None
    current_due_date: Optional[datetime] = None

    class Config:
        from_attributes = True

class AssetReportDamage(BaseModel):
    problem_description: str = Field(..., min_length=5)
    severity: str = Field(default="Minor Damage")  # Minor Damage, Major Damage, Damaged
