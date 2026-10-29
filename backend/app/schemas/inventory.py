from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class InventoryBase(BaseModel):
    item_code: str = Field(..., min_length=2, max_length=100)
    name: str = Field(..., min_length=2, max_length=255)
    category: str = Field(..., min_length=2, max_length=100)
    department_id: int
    laboratory_id: Optional[int] = None
    quantity: int = Field(default=0, ge=0)
    min_threshold: int = Field(default=10, ge=0)
    unit: str = Field(default="pcs", max_length=50)
    description: Optional[str] = None
    location: Optional[str] = None

class InventoryCreate(InventoryBase):
    pass

class InventoryUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    department_id: Optional[int] = None
    laboratory_id: Optional[int] = None
    min_threshold: Optional[int] = Field(None, ge=0)
    unit: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None

class InventoryOut(InventoryBase):
    id: int
    created_at: datetime
    updated_at: datetime
    department_name: Optional[str] = None
    department_code: Optional[str] = None
    laboratory_name: Optional[str] = None
    is_low_stock: bool

    class Config:
        from_attributes = True

class StockAdjustmentRequest(BaseModel):
    quantity: int = Field(..., gt=0, description="Amount to add or deduct")
    reason: str = Field(..., min_length=3, description="Reason for stock movement")
    reference_notes: Optional[str] = None

class InventoryTransactionOut(BaseModel):
    id: int
    inventory_item_id: int
    transaction_type: str
    quantity_change: int
    previous_quantity: int
    new_quantity: int
    reason: Optional[str] = None
    reference_notes: Optional[str] = None
    created_at: datetime
    user_name: Optional[str] = None

    class Config:
        from_attributes = True
