import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.maintenance import MaintenanceRecord
from backend.app.models.asset import Asset
from backend.app.models.user import User
from backend.app.schemas.maintenance import (
    MaintenanceCreate,
    MaintenanceUpdate,
    MaintenanceVerifyReady,
    MaintenanceOut,
)
from backend.app.security import get_current_user, require_staff_or_admin
from backend.app.time_util import utc_now

router = APIRouter(prefix="/maintenance", tags=["Maintenance Management"])

def enrich_maintenance_out(rec: MaintenanceRecord) -> MaintenanceOut:
    return MaintenanceOut(
        id=rec.id,
        ticket_code=rec.ticket_code,
        asset_id=rec.asset_id,
        reported_by_id=rec.reported_by_id,
        reason=rec.reason,
        date_reported=rec.date_reported,
        status=rec.status,
        is_ready_for_use=rec.is_ready_for_use,
        verified_by_id=rec.verified_by_id,
        verified_at=rec.verified_at,
        service_date=rec.service_date,
        work_description=rec.work_description,
        cost=rec.cost,
        technician_name=rec.technician_name,
        next_maintenance_date=rec.next_maintenance_date,
        created_at=rec.created_at,
        asset_name=rec.asset.name if rec.asset else None,
        asset_code=rec.asset.asset_code if rec.asset else None,
        asset_category=rec.asset.category if rec.asset else None,
        department_name=rec.asset.department.name if (rec.asset and rec.asset.department) else None,
        reported_by_name=rec.reported_by.full_name if rec.reported_by else None,
        verified_by_name=rec.verified_by.full_name if rec.verified_by else None,
    )

@router.get("", response_model=List[MaintenanceOut])
def list_maintenance_records(
    status_filter: Optional[str] = Query(None, alias="status"),
    asset_id: Optional[int] = None,
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    """List maintenance records. Filter by status, asset, or department."""
    query = db.query(MaintenanceRecord).join(Asset)

    if current_user.role == "LAB_STAFF" and current_user.department_id:
        query = query.filter(Asset.department_id == current_user.department_id)
    elif department_id:
        query = query.filter(Asset.department_id == department_id)

    if asset_id:
        query = query.filter(MaintenanceRecord.asset_id == asset_id)
    if status_filter:
        query = query.filter(MaintenanceRecord.status == status_filter)

    records = query.order_by(MaintenanceRecord.date_reported.desc()).all()
    return [enrich_maintenance_out(r) for r in records]

@router.post("", response_model=MaintenanceOut, status_code=status.HTTP_201_CREATED)
def create_maintenance_record(
    m_in: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    """
    Initiate maintenance ticket for an asset.
    Sets asset status to 'Under Maintenance'.
    """
    asset = db.query(Asset).filter(Asset.id == m_in.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found.")

    if current_user.role == "LAB_STAFF" and current_user.department_id != asset.department_id:
        raise HTTPException(status_code=403, detail="Lab Staff can only service assets in their assigned department.")

    if asset.status in ["Borrowed", "Pending Request"]:
        raise HTTPException(status_code=400, detail="Cannot send an actively borrowed or pending asset to maintenance.")

    ticket_code = f"MNT-{utc_now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    rec = MaintenanceRecord(
        ticket_code=ticket_code,
        asset_id=asset.id,
        reported_by_id=current_user.id,
        reason=m_in.reason.strip(),
        technician_name=m_in.technician_name,
        cost=m_in.cost or 0.0,
        next_maintenance_date=m_in.next_maintenance_date,
        status="Pending",
        is_ready_for_use=False,
    )
    # Asset enters Under Maintenance
    asset.status = "Under Maintenance"

    db.add(rec)
    db.commit()
    db.refresh(rec)
    return enrich_maintenance_out(rec)

@router.put("/{record_id}", response_model=MaintenanceOut)
def update_maintenance_record(
    record_id: int,
    m_in: MaintenanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    """
    Update maintenance record status, work performed, cost, technician.
    NOTE: When status is set to 'Completed', the asset does NOT automatically become Available!
    Lab staff must manually call confirm-ready.
    """
    rec = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Maintenance record not found.")

    if current_user.role == "LAB_STAFF" and current_user.department_id != rec.asset.department_id:
        raise HTTPException(status_code=403, detail="Lab Staff can only update maintenance in their assigned department.")

    if m_in.status:
        valid_statuses = ["Pending", "In Progress", "Completed"]
        if m_in.status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(valid_statuses)}")
        rec.status = m_in.status

    if m_in.work_description is not None:
        rec.work_description = m_in.work_description
    if m_in.cost is not None:
        rec.cost = m_in.cost
    if m_in.technician_name is not None:
        rec.technician_name = m_in.technician_name
    if m_in.service_date is not None:
        rec.service_date = m_in.service_date
    if m_in.next_maintenance_date is not None:
        rec.next_maintenance_date = m_in.next_maintenance_date

    db.commit()
    db.refresh(rec)
    return enrich_maintenance_out(rec)

@router.post("/{record_id}/confirm-ready", response_model=MaintenanceOut)
def confirm_asset_ready_for_use(
    record_id: int,
    notes: Optional[MaintenanceVerifyReady] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    """
    EXPLICIT MANUAL CONFIRMATION:
    Only when Lab Staff manually confirms that the physical asset is inspected, tested,
    and ready for institutional use does the asset return to 'Available' status!
    """
    rec = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Maintenance record not found.")

    if current_user.role == "LAB_STAFF" and current_user.department_id != rec.asset.department_id:
        raise HTTPException(status_code=403, detail="Lab Staff can only verify assets in their assigned department.")

    if rec.status != "Completed":
        raise HTTPException(
            status_code=400,
            detail="Cannot verify asset readiness until maintenance work status is marked as 'Completed'.",
        )

    # Set verification flags
    rec.is_ready_for_use = True
    rec.verified_by_id = current_user.id
    rec.verified_at = utc_now()

    # Now and only now does asset become Available
    rec.asset.status = "Available"
    rec.asset.condition = "Good"

    db.commit()
    db.refresh(rec)
    return enrich_maintenance_out(rec)
