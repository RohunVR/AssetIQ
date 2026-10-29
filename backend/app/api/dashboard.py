from datetime import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.models.asset import Asset
from backend.app.models.inventory import InventoryItem
from backend.app.models.borrowing import BorrowingRequest
from backend.app.models.maintenance import MaintenanceRecord
from backend.app.models.department import Department
from backend.app.models.user import User
from backend.app.models.setting import SystemSetting
from backend.app.security import get_current_user
from backend.app.api.borrowing import sync_overdue_status, get_system_limits
from backend.app.api.alerts import get_system_alerts
from backend.app.time_util import utc_now

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("", response_model=Dict[str, Any])
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns role-based dashboard overview:
    - Admin: Institute-wide asset metrics, department distribution, urgent alerts, recent requests.
    - Lab Staff: Department-specific counters, pending approvals, overdue items, maintenance tasks.
    - Student/Faculty: My active loans, due date countdowns, pending requests, allowed limits.
    """
    sync_overdue_status(db)
    max_active_assets, max_borrowing_days = get_system_limits(db)
    alerts = get_system_alerts(db=db, current_user=current_user)

    dept_name = current_user.department.name if current_user.department else "All Departments (Institutional)"

    if current_user.role == "ADMIN":
        total_assets = db.query(Asset).count()
        available_assets = db.query(Asset).filter(Asset.status == "Available").count()
        borrowed_assets = db.query(Asset).filter(Asset.status == "Borrowed").count()
        overdue_assets = db.query(Asset).filter(Asset.status == "Overdue").count()
        maintenance_assets = db.query(Asset).filter(Asset.status == "Under Maintenance").count()
        damaged_assets = db.query(Asset).filter(Asset.status == "Damaged").count()
        low_stock_count = db.query(InventoryItem).filter(InventoryItem.quantity <= InventoryItem.min_threshold).count()
        pending_requests_count = db.query(BorrowingRequest).filter(BorrowingRequest.status == "Pending").count()

        # Category distribution
        cat_stats = (
            db.query(Asset.category, func.count(Asset.id))
            .group_by(Asset.category)
            .all()
        )
        category_distribution = [{"category": c[0], "count": c[1]} for c in cat_stats]

        # Department asset distribution
        dept_stats = (
            db.query(Department.name, Department.code, func.count(Asset.id))
            .outerjoin(Asset, Asset.department_id == Department.id)
            .group_by(Department.id)
            .all()
        )
        department_distribution = [{"name": d[0], "code": d[1], "asset_count": d[2]} for d in dept_stats]

        stat_cards = [
            {"title": "Total Assets", "value": total_assets, "badge": "Registry", "color": "blue"},
            {"title": "Available Assets", "value": available_assets, "badge": "Ready", "color": "emerald"},
            {"title": "Borrowed Assets", "value": borrowed_assets, "badge": "On Loan", "color": "indigo"},
            {"title": "Overdue Assets", "value": overdue_assets, "badge": "Action Needed", "color": "rose"},
            {"title": "Under Maintenance", "value": maintenance_assets, "badge": "In Service", "color": "purple"},
            {"title": "Low Stock Consumables", "value": low_stock_count, "badge": "Reorder", "color": "amber"},
        ]

        # Recent activities
        recent_reqs = (
            db.query(BorrowingRequest)
            .order_by(BorrowingRequest.created_at.desc())
            .limit(5)
            .all()
        )
        recent_requests_data = [
            {
                "id": r.id,
                "request_code": r.request_code,
                "asset_name": r.asset.name if r.asset else "Asset",
                "user_name": r.user.full_name if r.user else "User",
                "status": r.status,
                "request_date": r.request_date.strftime("%Y-%m-%d %H:%M"),
            }
            for r in recent_reqs
        ]

        return {
            "role": "ADMIN",
            "department_name": dept_name,
            "stat_cards": stat_cards,
            "urgent_alerts": [a.model_dump() for a in alerts[:6]],
            "pending_count": pending_requests_count,
            "damaged_count": damaged_assets,
            "category_distribution": category_distribution,
            "department_distribution": department_distribution,
            "recent_requests": recent_requests_data,
            "limits": {"max_active_assets": max_active_assets, "max_borrowing_days": max_borrowing_days},
        }

    elif current_user.role == "LAB_STAFF":
        dept_id = current_user.department_id
        asset_base = db.query(Asset)
        inv_base = db.query(InventoryItem)
        req_base = db.query(BorrowingRequest).join(Asset)

        if dept_id:
            asset_base = asset_base.filter(Asset.department_id == dept_id)
            inv_base = inv_base.filter(InventoryItem.department_id == dept_id)
            req_base = req_base.filter(Asset.department_id == dept_id)

        total_assets = asset_base.count()
        available_assets = asset_base.filter(Asset.status == "Available").count()
        borrowed_assets = asset_base.filter(Asset.status == "Borrowed").count()
        overdue_assets = asset_base.filter(Asset.status == "Overdue").count()
        maintenance_assets = asset_base.filter(Asset.status == "Under Maintenance").count()
        damaged_assets = asset_base.filter(Asset.status == "Damaged").count()
        low_stock_count = inv_base.filter(InventoryItem.quantity <= InventoryItem.min_threshold).count()
        pending_requests_count = req_base.filter(BorrowingRequest.status == "Pending").count()

        stat_cards = [
            {"title": "Department Assets", "value": total_assets, "badge": "Department", "color": "blue"},
            {"title": "Available Assets", "value": available_assets, "badge": "Ready", "color": "emerald"},
            {"title": "Pending Requests", "value": pending_requests_count, "badge": "Pending Review", "color": "amber"},
            {"title": "Borrowed Assets", "value": borrowed_assets, "badge": "Active Loan", "color": "indigo"},
            {"title": "Overdue Returns", "value": overdue_assets, "badge": "Past Due", "color": "rose"},
            {"title": "Low Stock Items", "value": low_stock_count, "badge": "Refill Required", "color": "amber"},
        ]

        # Recent requests for this department
        recent_reqs = req_base.order_by(BorrowingRequest.created_at.desc()).limit(6).all()
        recent_requests_data = [
            {
                "id": r.id,
                "request_code": r.request_code,
                "asset_name": r.asset.name if r.asset else "Asset",
                "user_name": r.user.full_name if r.user else "User",
                "status": r.status,
                "request_date": r.request_date.strftime("%Y-%m-%d %H:%M"),
            }
            for r in recent_reqs
        ]

        return {
            "role": "LAB_STAFF",
            "department_name": dept_name,
            "stat_cards": stat_cards,
            "urgent_alerts": [a.model_dump() for a in alerts[:6]],
            "pending_count": pending_requests_count,
            "maintenance_count": maintenance_assets,
            "damaged_count": damaged_assets,
            "recent_requests": recent_requests_data,
            "limits": {"max_active_assets": max_active_assets, "max_borrowing_days": max_borrowing_days},
        }

    else:
        # STUDENT or FACULTY
        active_loans = (
            db.query(BorrowingRequest)
            .filter(
                BorrowingRequest.user_id == current_user.id,
                BorrowingRequest.status.in_(["Approved", "Overdue"]),
            )
            .all()
        )
        my_active_count = len(active_loans)
        my_overdue_count = sum(1 for r in active_loans if r.status == "Overdue" or (r.due_date and r.due_date < utc_now()))
        my_pending_count = (
            db.query(BorrowingRequest)
            .filter(
                BorrowingRequest.user_id == current_user.id,
                BorrowingRequest.status == "Pending",
            )
            .count()
        )
        total_available = db.query(Asset).filter(Asset.status == "Available").count()

        stat_cards = [
            {"title": "My Active Loans", "value": my_active_count, "badge": f"Max {max_active_assets}", "color": "blue"},
            {"title": "Pending Requests", "value": my_pending_count, "badge": "Reviewing", "color": "amber"},
            {"title": "Overdue Items", "value": my_overdue_count, "badge": "Urgent", "color": "rose"},
            {"title": "Available to Borrow", "value": total_available, "badge": "Campus-wide", "color": "emerald"},
        ]

        # Active loans list with due date information
        active_loans_data = [
            {
                "id": r.id,
                "request_code": r.request_code,
                "asset_id": r.asset_id,
                "asset_name": r.asset.name if r.asset else "Asset",
                "asset_code": r.asset.asset_code if r.asset else "Code",
                "department": r.asset.department.name if (r.asset and r.asset.department) else "N/A",
                "due_date": r.due_date.strftime("%Y-%m-%d") if r.due_date else "N/A",
                "is_overdue": r.status == "Overdue" or (r.due_date and r.due_date < utc_now()),
                "status": "Overdue" if (r.status == "Overdue" or (r.due_date and r.due_date < utc_now())) else "Active",
            }
            for r in active_loans
        ]

        return {
            "role": current_user.role,
            "department_name": dept_name,
            "stat_cards": stat_cards,
            "urgent_alerts": [a.model_dump() for a in alerts],
            "active_loans": active_loans_data,
            "my_active_count": my_active_count,
            "limits": {"max_active_assets": max_active_assets, "max_borrowing_days": max_borrowing_days},
        }
