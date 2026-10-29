import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.database import get_db
from backend.app.models.borrowing import BorrowingRequest
from backend.app.models.asset import Asset
from backend.app.models.user import User
from backend.app.models.setting import SystemSetting
from backend.app.schemas.borrowing import (
    BorrowingRequestCreate,
    BorrowingApproval,
    BorrowingRejection,
    BorrowingReturn,
    BorrowingProblemReport,
    BorrowingRequestOut,
)
from backend.app.security import get_current_user, require_staff_or_admin
from backend.app.config import DEFAULT_MAX_ACTIVE_ASSETS, DEFAULT_MAX_BORROWING_DAYS
from backend.app.time_util import utc_now

router = APIRouter(prefix="/borrowing", tags=["Borrowing & Returns"])

def get_system_limits(db: Session):
    """Retrieve dynamic borrowing limits from database settings"""
    max_assets_setting = db.query(SystemSetting).filter(SystemSetting.key == "max_active_assets").first()
    max_days_setting = db.query(SystemSetting).filter(SystemSetting.key == "max_borrowing_days").first()
    
    max_active = int(max_assets_setting.value) if max_assets_setting else DEFAULT_MAX_ACTIVE_ASSETS
    max_days = int(max_days_setting.value) if max_days_setting else DEFAULT_MAX_BORROWING_DAYS
    return max_active, max_days

def sync_overdue_status(db: Session):
    """
    Check all active borrowings and mark as Overdue if due_date < now.
    Also updates corresponding asset status to Overdue.
    """
    now = utc_now()
    overdue_requests = (
        db.query(BorrowingRequest)
        .filter(
            BorrowingRequest.status == "Approved",
            BorrowingRequest.due_date != None,
            BorrowingRequest.due_date < now,
        )
        .all()
    )
    for req in overdue_requests:
        req.status = "Overdue"
        if req.asset and req.asset.status == "Borrowed":
            req.asset.status = "Overdue"
    if overdue_requests:
        db.commit()

def enrich_borrowing_out(req: BorrowingRequest) -> BorrowingRequestOut:
    is_overdue = (
        req.status == "Overdue" or 
        (req.status == "Approved" and req.due_date and req.due_date < utc_now())
    )
    return BorrowingRequestOut(
        id=req.id,
        request_code=req.request_code,
        asset_id=req.asset_id,
        user_id=req.user_id,
        request_date=req.request_date,
        duration_days=req.duration_days,
        intended_purpose=req.intended_purpose,
        status=req.status,
        approved_by_id=req.approved_by_id,
        approval_date=req.approval_date,
        rejection_reason=req.rejection_reason,
        issued_at=req.issued_at,
        due_date=req.due_date,
        returned_at=req.returned_at,
        returned_condition=req.returned_condition,
        return_notes=req.return_notes,
        user_reported_problem=req.user_reported_problem,
        problem_reported_at=req.problem_reported_at,
        created_at=req.created_at,
        asset_name=req.asset.name if req.asset else None,
        asset_code=req.asset.asset_code if req.asset else None,
        asset_category=req.asset.category if req.asset else None,
        department_name=req.asset.department.name if (req.asset and req.asset.department) else None,
        user_full_name=req.user.full_name if req.user else None,
        user_email=req.user.email if req.user else None,
        user_role=req.user.role if req.user else None,
        is_overdue=is_overdue,
    )

@router.get("", response_model=List[BorrowingRequestOut])
def list_borrowing_records(
    status_filter: Optional[str] = Query(None, alias="status"),
    user_id: Optional[int] = None,
    asset_id: Optional[int] = None,
    department_id: Optional[int] = None,
    overdue_only: Optional[bool] = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List borrowing records according to role:
    - Admin: all institution-wide records
    - Lab Staff: department-specific records
    - Student/Faculty: only their own records
    """
    sync_overdue_status(db)

    query = db.query(BorrowingRequest).join(Asset)

    # Role-based scoping
    if current_user.role in ["STUDENT", "FACULTY"]:
        query = query.filter(BorrowingRequest.user_id == current_user.id)
    elif current_user.role == "LAB_STAFF" and current_user.department_id:
        query = query.filter(Asset.department_id == current_user.department_id)
    
    # Filters
    if user_id and current_user.role in ["ADMIN", "LAB_STAFF"]:
        query = query.filter(BorrowingRequest.user_id == user_id)
    if asset_id:
        query = query.filter(BorrowingRequest.asset_id == asset_id)
    if department_id and current_user.role == "ADMIN":
        query = query.filter(Asset.department_id == department_id)
    if status_filter:
        query = query.filter(BorrowingRequest.status == status_filter)
    if overdue_only:
        query = query.filter(BorrowingRequest.status == "Overdue")

    records = query.order_by(BorrowingRequest.created_at.desc()).all()
    return [enrich_borrowing_out(r) for r in records]

@router.post("/requests", response_model=BorrowingRequestOut, status_code=status.HTTP_201_CREATED)
def submit_borrowing_request(
    req_in: BorrowingRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submit a borrowing request for an available asset.
    Validates:
    1. Asset is Available (not Borrowed, Pending, Under Maintenance, Damaged, or Retired)
    2. User has not exceeded max active borrowings limit
    3. Duration does not exceed maximum allowable days
    """
    sync_overdue_status(db)
    max_active_assets, max_borrowing_days = get_system_limits(db)

    # 1. Check duration limit
    if req_in.duration_days > max_borrowing_days:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Requested duration ({req_in.duration_days} days) exceeds maximum allowable borrowing limit of {max_borrowing_days} days.",
        )

    # 2. Check active borrowings limit for this user
    active_count = (
        db.query(BorrowingRequest)
        .filter(
            BorrowingRequest.user_id == current_user.id,
            BorrowingRequest.status.in_(["Approved", "Overdue"]),
        )
        .count()
    )
    if active_count >= max_active_assets:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Borrowing limit reached: You currently have {active_count} active/overdue items (maximum allowed: {max_active_assets}). Please return existing equipment before requesting more.",
        )

    # 3. Check asset availability
    asset = db.query(Asset).filter(Asset.id == req_in.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Requested asset does not exist.")

    if asset.status != "Available":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Asset '{asset.name}' cannot be requested because it is currently '{asset.status}'.",
        )

    # Generate request code
    req_code = f"REQ-{utc_now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    borrow_req = BorrowingRequest(
        request_code=req_code,
        asset_id=asset.id,
        user_id=current_user.id,
        duration_days=req_in.duration_days,
        intended_purpose=req_in.intended_purpose.strip(),
        status="Pending",
    )
    # Reserve asset status
    asset.status = "Pending Request"

    db.add(borrow_req)
    db.commit()
    db.refresh(borrow_req)

    return enrich_borrowing_out(borrow_req)

@router.post("/requests/{request_id}/approve", response_model=BorrowingRequestOut)
def approve_borrowing_request(
    request_id: int,
    approval: BorrowingApproval,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    """
    Lab Staff / Admin approves borrowing request and issues equipment.
    Sets status to 'Approved', calculates due_date, and marks asset as 'Borrowed'.
    """
    req = db.query(BorrowingRequest).filter(BorrowingRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Borrowing request not found.")

    if req.status != "Pending":
        raise HTTPException(status_code=400, detail=f"Cannot approve request with status '{req.status}'.")

    # Scope check for Lab Staff
    if current_user.role == "LAB_STAFF" and current_user.department_id != req.asset.department_id:
        raise HTTPException(status_code=403, detail="Lab Staff can only approve requests for their department's assets.")

    now = utc_now()
    req.status = "Approved"
    req.approved_by_id = current_user.id
    req.approval_date = now
    req.issued_at = now
    req.due_date = now + timedelta(days=req.duration_days)

    # Update asset
    req.asset.status = "Borrowed"

    db.commit()
    db.refresh(req)
    return enrich_borrowing_out(req)

@router.post("/requests/{request_id}/reject", response_model=BorrowingRequestOut)
def reject_borrowing_request(
    request_id: int,
    rejection: BorrowingRejection,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    """
    Lab Staff / Admin rejects borrowing request.
    Reverts asset status back to 'Available'.
    """
    req = db.query(BorrowingRequest).filter(BorrowingRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Borrowing request not found.")

    if req.status != "Pending":
        raise HTTPException(status_code=400, detail=f"Cannot reject request with status '{req.status}'.")

    if current_user.role == "LAB_STAFF" and current_user.department_id != req.asset.department_id:
        raise HTTPException(status_code=403, detail="Lab Staff can only review requests for their department's assets.")

    req.status = "Rejected"
    req.approved_by_id = current_user.id
    req.approval_date = utc_now()
    req.rejection_reason = rejection.rejection_reason.strip()

    # Revert asset to Available
    req.asset.status = "Available"

    db.commit()
    db.refresh(req)
    return enrich_borrowing_out(req)

@router.post("/requests/{request_id}/return", response_model=BorrowingRequestOut)
def record_equipment_return(
    request_id: int,
    ret: BorrowingReturn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    """
    Lab Staff records equipment return.
    Records return condition: Good, Minor Damage, Major Damage, Damaged.
    If condition is Good -> Asset becomes Available.
    If damaged -> Asset becomes Damaged and enters damage/maintenance workflow.
    """
    req = db.query(BorrowingRequest).filter(BorrowingRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Borrowing request not found.")

    if req.status not in ["Approved", "Overdue"]:
        raise HTTPException(status_code=400, detail=f"Cannot process return for request in status '{req.status}'.")

    if current_user.role == "LAB_STAFF" and current_user.department_id != req.asset.department_id:
        raise HTTPException(status_code=403, detail="Lab Staff can only process returns for their department's assets.")

    valid_conditions = ["Good", "Minor Damage", "Major Damage", "Damaged"]
    if ret.returned_condition not in valid_conditions:
        raise HTTPException(status_code=400, detail=f"Condition must be one of: {', '.join(valid_conditions)}")

    now = utc_now()
    req.status = "Returned"
    req.returned_at = now
    req.returned_condition = ret.returned_condition
    req.return_notes = ret.return_notes

    # Update asset state according to condition
    req.asset.condition = ret.returned_condition
    if ret.returned_condition == "Good":
        req.asset.status = "Available"
    else:
        req.asset.status = "Damaged"

    db.commit()
    db.refresh(req)
    return enrich_borrowing_out(req)

@router.post("/requests/{request_id}/report-problem")
def report_problem_in_use(
    request_id: int,
    problem: BorrowingProblemReport,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Students/Faculty report problem or defect while using active borrowed equipment"""
    req = db.query(BorrowingRequest).filter(BorrowingRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Borrowing record not found.")

    if req.user_id != current_user.id and current_user.role not in ["ADMIN", "LAB_STAFF"]:
        raise HTTPException(status_code=403, detail="You can only report problems on your own borrowings.")

    if req.status not in ["Approved", "Overdue"]:
        raise HTTPException(status_code=400, detail="Can only report problem on actively borrowed equipment.")

    req.user_reported_problem = problem.problem_description.strip()
    req.problem_reported_at = utc_now()
    db.commit()
    return {"message": "Problem report recorded successfully. Staff has been notified.", "request_id": req.id}

@router.get("/sync-overdue")
def trigger_overdue_check(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Explicitly check and update all overdue loans"""
    sync_overdue_status(db)
    return {"status": "ok", "message": "Overdue status synchronized successfully."}
