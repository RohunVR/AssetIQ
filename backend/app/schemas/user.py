from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    role: str = Field(..., description="ADMIN, LAB_STAFF, FACULTY, STUDENT")
    department_id: Optional[int] = None
    student_or_staff_id: Optional[str] = None
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    department_id: Optional[int] = None
    student_or_staff_id: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserOut(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    department_name: Optional[str] = None

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class DemoLoginRequest(BaseModel):
    role: str  # ADMIN, LAB_STAFF_CSE, LAB_STAFF_ECE, FACULTY, STUDENT_CSE, STUDENT_ECE
