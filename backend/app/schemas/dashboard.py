from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class AlertItem(BaseModel):
    id: str
    type: str  # low_stock, overdue, pending_request, maintenance_due
    severity: str  # danger, warning, info
    title: str
    message: str
    item_id: Optional[int] = None
    created_at: datetime

class StatCard(BaseModel):
    title: str
    value: int
    badge: Optional[str] = None
    color: str  # primary, success, warning, danger, purple

class DashboardStats(BaseModel):
    user_role: str
    department_name: Optional[str] = None
    stat_cards: List[StatCard]
    urgent_alerts: List[AlertItem]
    recent_requests: List[dict] = []
    maintenance_summary: List[dict] = []
    category_distribution: List[dict] = []
