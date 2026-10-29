from datetime import datetime, date, timedelta
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.database import get_db
from backend.app.models.asset import Asset
from backend.app.models.inventory import InventoryItem
from backend.app.models.borrowing import BorrowingRequest
from backend.app.models.maintenance import MaintenanceRecord
from backend.app.models.user import User
from backend.app.schemas.dashboard import AlertItem
from backend.app.security import get_current_user
from backend.app.api.borrowing import sync_overdue_status
from backend.app.time_util import utc_now

router = APIRouter(prefix="/alerts", tags=["System Alerts"])

@router.get("", response_model=List[AlertItem])
def get_system_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate dynamic rule-based alerts tailored to the user's role and department:
    - Low stock alerts (Lab Staff / Admin)
    - Overdue loan alerts (Staff / Admin and Borrower)
    - Pending approval alerts (Lab Staff / Admin)
    - Maintenance due / pending alerts (Lab Staff / Admin)
    """
    sync_overdue_status(db)
    alerts: List[AlertItem] = []
    now = utc_now()
    today = date.today()

    # 1. Overdue Alerts
    overdue_q = db.query(BorrowingRequest).join(Asset).filter(BorrowingRequest.status == "Overdue")
    if current_user.role in ["STUDENT", "FACULTY"]:
        overdue_q = overdue_q.filter(BorrowingRequest.user_id == current_user.id)
    elif current_user.role == "LAB_STAFF" and current_user.department_id:
        overdue_q = overdue_q.filter(Asset.department_id == current_user.department_id)

    overdue_items = overdue_q.all()
    for item in overdue_items:
        asset_name = item.asset.name if item.asset else "Asset"
        code = item.asset.asset_code if item.asset else "N/A"
        due_str = item.due_date.strftime("%Y-%m-%d") if item.due_date else "past date"
        
        msg = f"{asset_name} ({code}) is overdue for return! (Was due on {due_str})."
        if current_user.role in ["ADMIN", "LAB_STAFF"]:
            borrower = item.user.full_name if item.user else "User"
            msg += f" Borrowed by {borrower}."

        alerts.append(
            AlertItem(
                id=f"overdue-{item.id}",
                type="overdue",
                severity="danger",
                title=f"Overdue Equipment: {code}",
                message=msg,
                item_id=item.id,
                created_at=item.due_date or now,
            )
        )

    # If Student or Faculty, only show their relevant alerts (overdue, request updates)
    if current_user.role in ["STUDENT", "FACULTY"]:
        # Also show if they have pending requests
        pending_my = (
            db.query(BorrowingRequest)
            .filter(
                BorrowingRequest.user_id == current_user.id,
                BorrowingRequest.status == "Pending",
            )
            .all()
        )
        for req in pending_my:
            asset_code = req.asset.asset_code if req.asset else "item"
            alerts.append(
                AlertItem(
                    id=f"pending-user-{req.id}",
                    type="pending_request",
                    severity="info",
                    title="Request Under Review",
                    message=f"Your request for {req.asset.name} ({asset_code}) is awaiting laboratory staff approval.",
                    item_id=req.id,
                    created_at=req.request_date,
                )
            )
        return alerts

    # Staff & Admin alerts below:
    # 2. Low Stock Alerts
    inv_q = db.query(InventoryItem)
    if current_user.role == "LAB_STAFF" and current_user.department_id:
        inv_q = inv_q.filter(InventoryItem.department_id == current_user.department_id)
    inv_q = inv_q.filter(InventoryItem.quantity <= InventoryItem.min_threshold)
    low_stocks = inv_q.all()

    for inv in low_stocks:
        alerts.append(
            AlertItem(
                id=f"low-stock-{inv.id}",
                type="low_stock",
                severity="warning",
                title=f"Low Stock: {inv.name}",
                message=f"{inv.name} is below minimum threshold! Remaining: {inv.quantity} {inv.unit} (Minimum: {inv.min_threshold} {inv.unit}).",
                item_id=inv.id,
                created_at=inv.updated_at,
            )
        )

    # 3. Pending Borrowing Requests requiring approval
    pending_q = db.query(BorrowingRequest).join(Asset).filter(BorrowingRequest.status == "Pending")
    if current_user.role == "LAB_STAFF" and current_user.department_id:
        pending_q = pending_q.filter(Asset.department_id == current_user.department_id)
    pending_reqs = pending_q.all()

    for p in pending_reqs:
        asset_name = p.asset.name if p.asset else "Asset"
        user_name = p.user.full_name if p.user else "User"
        alerts.append(
            AlertItem(
                id=f"pending-{p.id}",
                type="pending_request",
                severity="info",
                title=f"Pending Request: {p.request_code}",
                message=f"New borrowing request from {user_name} for '{asset_name}' requires approval.",
                item_id=p.id,
                created_at=p.request_date,
            )
        )

    # 4. Maintenance Alerts (Pending tickets or maintenance scheduled soon)
    m_q = db.query(MaintenanceRecord).join(Asset).filter(
        or_(
            MaintenanceRecord.status == "Pending",
            (MaintenanceRecord.next_maintenance_date != None) & (MaintenanceRecord.next_maintenance_date <= today + timedelta(days=7))
        )
    )
    if current_user.role == "LAB_STAFF" and current_user.department_id:
        m_q = m_q.filter(Asset.department_id == current_user.department_id)
    m_records = m_q.all()

    for m in m_records:
        asset_name = m.asset.name if m.asset else "Asset"
        code = m.asset.asset_code if m.asset else "N/A"
        if m.status == "Pending":
            title = f"Maintenance Ticket: {m.ticket_code}"
            msg = f"{asset_name} ({code}) has an unassigned/pending maintenance report: '{m.reason}'."
        else:
            title = f"Scheduled Maintenance Due: {code}"
            msg = f"{asset_name} ({code}) has maintenance scheduled for {m.next_maintenance_date}."

        alerts.append(
            AlertItem(
                id=f"maintenance-{m.id}",
                type="maintenance_due",
                severity="warning",
                title=title,
                message=msg,
                item_id=m.id,
                created_at=m.date_reported,
            )
        )

    # Sort alerts with danger first, then warning, then info
    severity_order = {"danger": 0, "warning": 1, "info": 2}
    alerts.sort(key=lambda a: (severity_order.get(a.severity, 3), -a.created_at.timestamp()))
    return alerts
