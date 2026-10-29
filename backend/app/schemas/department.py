from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class LaboratoryBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=255)
    location: Optional[str] = None

class LaboratoryCreate(LaboratoryBase):
    department_id: int

class LaboratoryOut(LaboratoryBase):
    id: int
    department_id: int
    department_code: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DepartmentBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentOut(DepartmentBase):
    id: int
    created_at: datetime
    laboratories: List[LaboratoryOut] = []

    class Config:
        from_attributes = True
