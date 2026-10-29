from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.app.database import get_db
from backend.app.models.asset import Asset
from backend.app.models.department import Department, Laboratory
from backend.app.models.borrowing import BorrowingRequest
from backend.app.models.user import User
from backend.app.schemas.asset import AssetCreate, AssetUpdate, AssetOut, AssetReportDamage
from backend.app.security import get_current_user, require_staff_or_admin

router = APIRouter(prefix="/assets", tags=["Assets"])

def enrich_asset_out(asset: Asset, db: Session) -> AssetOut:
    """Helper to attach department, lab, and current borrowing details"""
    borrower_name = None
    current_due_date = None
    if asset.status in ["Borrowed", "Overdue"]:
        active_req = (
            db.query(BorrowingRequest)
            .filter(
                BorrowingRequest.asset_id == asset.id,
                BorrowingRequest.status.in_(["Approved", "Overdue"]),
            )
            .order_by(BorrowingRequest.issued_at.desc())
            .first()
        )
        if active_req and active_req.user:
            borrower_name = active_req.user.full_name
            current_due_date = active_req.due_date

    return AssetOut(
        id=asset.id,
        asset_code=asset.asset_code,
        name=asset.name,
        category=asset.category,
        description=asset.description,
        department_id=asset.department_id,
        laboratory_id=asset.laboratory_id,
        location=asset.location,
        purchase_date=asset.purchase_date,
        serial_number=asset.serial_number,
        model_number=asset.model_number,
        cost=asset.cost,
        condition=asset.condition,
        status=asset.status,
        created_at=asset.created_at,
        updated_at=asset.updated_at,
        department_name=asset.department.name if asset.department else None,
        department_code=asset.department.code if asset.department else None,
        laboratory_name=asset.laboratory.name if asset.laboratory else None,
        current_borrower_name=borrower_name,
        current_due_date=current_due_date,
    )

@router.get("", response_model=List[AssetOut])
def list_assets(
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    laboratory_id: Optional[int] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    condition: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Search and filter assets. 
    Accessible to all authenticated users (students/faculty can view across departments).
    """
    query = db.query(Asset)

    if department_id:
        query = query.filter(Asset.department_id == department_id)
    if laboratory_id:
        query = query.filter(Asset.laboratory_id == laboratory_id)
    if category:
        query = query.filter(Asset.category.ilike(category))
    if status_filter:
        query = query.filter(Asset.status == status_filter)
    if condition:
        query = query.filter(Asset.condition == condition)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Asset.name.ilike(s),
                Asset.asset_code.ilike(s),
                Asset.serial_number.ilike(s),
                Asset.model_number.ilike(s),
                Asset.category.ilike(s),
            )
        )

    assets = query.order_by(Asset.asset_code).all()
    return [enrich_asset_out(a, db) for a in assets]

@router.get("/categories")
def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get list of distinct asset categories"""
    categories = db.query(Asset.category).distinct().all()
    return [c[0] for c in categories if c[0]]

@router.get("/{asset_id}")
def get_asset_detail(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get complete asset detail including borrowing and maintenance history"""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found.")

    out = enrich_asset_out(asset, db).model_dump()

    # Attach recent borrowing history
    borrowings = (
        db.query(BorrowingRequest)
        .filter(BorrowingRequest.asset_id == asset.id)
        .order_by(BorrowingRequest.created_at.desc())
        .limit(10)
        .all()
    )
    out["borrowing_history"] = [
        {
            "id": b.id,
            "request_code": b.request_code,
            "user_name": b.user.full_name if b.user else "Unknown",
            "status": b.status,
            "duration_days": b.duration_days,
            "issued_at": b.issued_at,
            "due_date": b.due_date,
            "returned_at": b.returned_at,
            "returned_condition": b.returned_condition,
        }
        for b in borrowings
    ]

    # Attach maintenance history
    out["maintenance_history"] = [
        {
            "id": m.id,
            "ticket_code": m.ticket_code,
            "reason": m.reason,
            "status": m.status,
            "date_reported": m.date_reported,
            "service_date": m.service_date,
            "work_description": m.work_description,
            "cost": m.cost,
            "technician_name": m.technician_name,
            "is_ready_for_use": m.is_ready_for_use,
        }
        for m in asset.maintenance_records
    ]

    return out

@router.post("", response_model=AssetOut, status_code=status.HTTP_201_CREATED)
def create_asset(
    asset_in: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    """Add a new trackable physical asset. Lab Staff can add to their department; Admin to any."""
    if current_user.role == "LAB_STAFF" and current_user.department_id != asset_in.department_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lab Staff can only add assets to their assigned department.",
        )

    existing = db.query(Asset).filter(Asset.asset_code == asset_in.asset_code.strip().upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Asset ID '{asset_in.asset_code}' is already registered.")

    dept = db.query(Department).filter(Department.id == asset_in.department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department does not exist.")

    if asset_in.laboratory_id:
        lab = db.query(Laboratory).filter(Laboratory.id == asset_in.laboratory_id).first()
        if not lab or lab.department_id != asset_in.department_id:
            raise HTTPException(status_code=400, detail="Laboratory does not belong to specified department.")

    asset = Asset(
        asset_code=asset_in.asset_code.strip().upper(),
        name=asset_in.name.strip(),
        category=asset_in.category.strip(),
        description=asset_in.description,
        department_id=asset_in.department_id,
        laboratory_id=asset_in.laboratory_id,
        location=asset_in.location,
        purchase_date=asset_in.purchase_date,
        serial_number=asset_in.serial_number,
        model_number=asset_in.model_number,
        cost=asset_in.cost or 0.0,
        condition=asset_in.condition or "Good",
        status=asset_in.status or "Available",
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return enrich_asset_out(asset, db)

@router.put("/{asset_id}", response_model=AssetOut)
def update_asset(
    asset_id: int,
    asset_in: AssetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    """Update asset metadata. Lab Staff can edit within their department; Admin everywhere."""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found.")

    if current_user.role == "LAB_STAFF" and current_user.department_id != asset.department_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lab Staff can only edit assets within their assigned department.",
        )

    for field, value in asset_in.model_dump(exclude_unset=True).items():
        setattr(asset, field, value)

    db.commit()
    db.refresh(asset)
    return enrich_asset_out(asset, db)

@router.post("/{asset_id}/report-damage")
def report_damage(
    asset_id: int,
    report: AssetReportDamage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Report damage or issue on an asset.
    Users (students/faculty) can report if currently borrowed by them.
    Lab Staff & Admin can report anytime.
    Marks asset as DAMAGED.
    """
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found.")

    # Authorization check
    if current_user.role in ["STUDENT", "FACULTY"]:
        active_borrowing = (
            db.query(BorrowingRequest)
            .filter(
                BorrowingRequest.asset_id == asset.id,
                BorrowingRequest.user_id == current_user.id,
                BorrowingRequest.status.in_(["Approved", "Overdue"]),
            )
            .first()
        )
        if not active_borrowing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only report damage or problems for equipment currently borrowed by you.",
            )
        # Store problem note on active borrowing
        active_borrowing.user_reported_problem = report.problem_description

    asset.condition = report.severity
    asset.status = "Damaged"
    db.commit()
    return {
        "message": f"Asset {asset.asset_code} has been reported as damaged and flagged for lab staff inspection.",
        "asset_status": asset.status,
        "condition": asset.condition,
    }

@router.post("/{asset_id}/retire")
def retire_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    """Retire an asset from active institutional service."""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found.")
    
    if asset.status in ["Borrowed", "Pending Request"]:
        raise HTTPException(status_code=400, detail="Cannot retire an asset that is currently borrowed or pending request.")

    asset.status = "Retired"
    db.commit()
    return {"message": f"Asset {asset.asset_code} successfully retired.", "status": asset.status}
