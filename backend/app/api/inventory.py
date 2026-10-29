from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.app.database import get_db
from backend.app.models.inventory import InventoryItem, InventoryTransaction
from backend.app.models.department import Department, Laboratory
from backend.app.models.user import User
from backend.app.schemas.inventory import (
    InventoryCreate,
    InventoryUpdate,
    InventoryOut,
    StockAdjustmentRequest,
    InventoryTransactionOut,
)
from backend.app.security import get_current_user, require_staff_or_admin

router = APIRouter(prefix="/inventory", tags=["Inventory (Consumables)"])

def enrich_inventory_out(item: InventoryItem) -> InventoryOut:
    return InventoryOut(
        id=item.id,
        item_code=item.item_code,
        name=item.name,
        category=item.category,
        department_id=item.department_id,
        laboratory_id=item.laboratory_id,
        quantity=item.quantity,
        min_threshold=item.min_threshold,
        unit=item.unit,
        description=item.description,
        location=item.location,
        created_at=item.created_at,
        updated_at=item.updated_at,
        department_name=item.department.name if item.department else None,
        department_code=item.department.code if item.department else None,
        laboratory_name=item.laboratory.name if item.laboratory else None,
        is_low_stock=item.quantity <= item.min_threshold,
    )

@router.get("", response_model=List[InventoryOut])
def list_inventory(
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    laboratory_id: Optional[int] = None,
    category: Optional[str] = None,
    low_stock_only: Optional[bool] = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    """
    List inventory consumables. 
    Managed by Lab Staff and Admin. Filter by search, department, category, and low stock status.
    """
    query = db.query(InventoryItem)

    # If Lab Staff, scope by their department unless Admin
    if current_user.role == "LAB_STAFF" and current_user.department_id:
        query = query.filter(InventoryItem.department_id == current_user.department_id)
    elif department_id:
        query = query.filter(InventoryItem.department_id == department_id)

    if laboratory_id:
        query = query.filter(InventoryItem.laboratory_id == laboratory_id)
    if category:
        query = query.filter(InventoryItem.category.ilike(category))
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(InventoryItem.name.ilike(s), InventoryItem.item_code.ilike(s), InventoryItem.category.ilike(s)))

    items = query.order_by(InventoryItem.name).all()

    if low_stock_only:
        items = [i for i in items if i.quantity <= i.min_threshold]

    return [enrich_inventory_out(i) for i in items]

@router.post("", response_model=InventoryOut, status_code=status.HTTP_201_CREATED)
def create_inventory_item(
    item_in: InventoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    """Add a new consumable item to inventory."""
    if current_user.role == "LAB_STAFF" and current_user.department_id != item_in.department_id:
        raise HTTPException(status_code=403, detail="Lab Staff can only add inventory to their own department.")

    existing = db.query(InventoryItem).filter(InventoryItem.item_code == item_in.item_code.strip().upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Item code '{item_in.item_code}' is already registered.")

    dept = db.query(Department).filter(Department.id == item_in.department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    item = InventoryItem(
        item_code=item_in.item_code.strip().upper(),
        name=item_in.name.strip(),
        category=item_in.category.strip(),
        department_id=item_in.department_id,
        laboratory_id=item_in.laboratory_id,
        quantity=item_in.quantity,
        min_threshold=item_in.min_threshold,
        unit=item_in.unit.strip(),
        description=item_in.description,
        location=item_in.location,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    # Log initial stock transaction if quantity > 0
    if item.quantity > 0:
        txn = InventoryTransaction(
            inventory_item_id=item.id,
            user_id=current_user.id,
            transaction_type="STOCK_IN",
            quantity_change=item.quantity,
            previous_quantity=0,
            new_quantity=item.quantity,
            reason="Initial inventory registration",
        )
        db.add(txn)
        db.commit()

    return enrich_inventory_out(item)

@router.put("/{item_id}", response_model=InventoryOut)
def update_inventory_item(
    item_id: int,
    item_in: InventoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    """Update inventory details (name, category, min_threshold, unit, location)"""
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found.")

    if current_user.role == "LAB_STAFF" and current_user.department_id != item.department_id:
        raise HTTPException(status_code=403, detail="Lab Staff can only modify inventory in their own department.")

    for field, value in item_in.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return enrich_inventory_out(item)

@router.post("/{item_id}/stock-in", response_model=InventoryOut)
def stock_in(
    item_id: int,
    adj: StockAdjustmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    """
    Receive stock: Increase inventory quantity.
    Example: 100 -> receive 50 -> 150.
    """
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found.")

    if current_user.role == "LAB_STAFF" and current_user.department_id != item.department_id:
        raise HTTPException(status_code=403, detail="Lab Staff can only manage inventory for their department.")

    prev_qty = item.quantity
    new_qty = prev_qty + adj.quantity
    item.quantity = new_qty

    txn = InventoryTransaction(
        inventory_item_id=item.id,
        user_id=current_user.id,
        transaction_type="STOCK_IN",
        quantity_change=adj.quantity,
        previous_quantity=prev_qty,
        new_quantity=new_qty,
        reason=adj.reason,
        reference_notes=adj.reference_notes,
    )
    db.add(txn)
    db.commit()
    db.refresh(item)
    return enrich_inventory_out(item)

@router.post("/{item_id}/stock-out", response_model=InventoryOut)
def stock_out(
    item_id: int,
    adj: StockAdjustmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    """
    Issue stock: Deduct inventory quantity.
    Example: 150 -> issue 20 -> 130.
    Rejects if requested quantity exceeds available stock.
    Automatically checks threshold for low-stock alert.
    """
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found.")

    if current_user.role == "LAB_STAFF" and current_user.department_id != item.department_id:
        raise HTTPException(status_code=403, detail="Lab Staff can only manage inventory for their department.")

    if item.quantity < adj.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot issue {adj.quantity} {item.unit}. Only {item.quantity} {item.unit} available in stock.",
        )

    prev_qty = item.quantity
    new_qty = prev_qty - adj.quantity
    item.quantity = new_qty

    txn = InventoryTransaction(
        inventory_item_id=item.id,
        user_id=current_user.id,
        transaction_type="STOCK_OUT",
        quantity_change=-adj.quantity,
        previous_quantity=prev_qty,
        new_quantity=new_qty,
        reason=adj.reason,
        reference_notes=adj.reference_notes,
    )
    db.add(txn)
    db.commit()
    db.refresh(item)
    return enrich_inventory_out(item)

@router.get("/{item_id}/transactions", response_model=List[InventoryTransactionOut])
def get_transactions(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    """Get audit trail of stock movements for an inventory item."""
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found.")

    txns = (
        db.query(InventoryTransaction)
        .filter(InventoryTransaction.inventory_item_id == item_id)
        .order_by(InventoryTransaction.created_at.desc())
        .all()
    )
    return [
        InventoryTransactionOut(
            id=t.id,
            inventory_item_id=t.inventory_item_id,
            transaction_type=t.transaction_type,
            quantity_change=t.quantity_change,
            previous_quantity=t.previous_quantity,
            new_quantity=t.new_quantity,
            reason=t.reason,
            reference_notes=t.reference_notes,
            created_at=t.created_at,
            user_name=t.user.full_name if t.user else "System",
        )
        for t in txns
    ]
