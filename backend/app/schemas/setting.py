from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class SettingOut(BaseModel):
    max_active_assets: int
    max_borrowing_days: int
    updated_at: Optional[datetime] = None

class SettingUpdate(BaseModel):
    max_active_assets: int = Field(..., gt=0, le=20, description="Max simultaneous active borrowings per user")
    max_borrowing_days: int = Field(..., gt=0, le=60, description="Max allowable duration in days for single borrowing")
