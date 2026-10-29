from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.department import Department, Laboratory
from backend.app.models.user import User
from backend.app.schemas.department import DepartmentCreate, DepartmentOut, LaboratoryCreate, LaboratoryOut
from backend.app.security import get_current_user, require_admin

router = APIRouter(prefix="/departments", tags=["Departments & Laboratories"])

@router.get("", response_model=List[DepartmentOut])
def list_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all departments with nested laboratories. Accessible to all authenticated users."""
    departments = db.query(Department).order_by(Department.name).all()
    results = []
    for dept in departments:
        labs_out = [
            LaboratoryOut(
                id=lab.id,
                code=lab.code,
                name=lab.name,
                location=lab.location,
                department_id=lab.department_id,
                department_code=dept.code,
                created_at=lab.created_at,
            )
            for lab in dept.laboratories
        ]
        results.append(
            DepartmentOut(
                id=dept.id,
                code=dept.code,
                name=dept.name,
                description=dept.description,
                created_at=dept.created_at,
                laboratories=labs_out,
            )
        )
    return results

@router.post("", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(
    dept_in: DepartmentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Admin-only: create a new department"""
    existing = db.query(Department).filter(Department.code == dept_in.code.strip().upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Department with code '{dept_in.code}' already exists.")

    dept = Department(
        code=dept_in.code.strip().upper(),
        name=dept_in.name.strip(),
        description=dept_in.description,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return DepartmentOut(
        id=dept.id,
        code=dept.code,
        name=dept.name,
        description=dept.description,
        created_at=dept.created_at,
        laboratories=[],
    )

@router.get("/laboratories", response_model=List[LaboratoryOut])
def list_laboratories(
    department_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List laboratories, optionally filtered by department."""
    query = db.query(Laboratory)
    if department_id:
        query = query.filter(Laboratory.department_id == department_id)
    labs = query.order_by(Laboratory.name).all()
    return [
        LaboratoryOut(
            id=lab.id,
            code=lab.code,
            name=lab.name,
            location=lab.location,
            department_id=lab.department_id,
            department_code=lab.department.code if lab.department else None,
            created_at=lab.created_at,
        )
        for lab in labs
    ]

@router.post("/laboratories", response_model=LaboratoryOut, status_code=status.HTTP_201_CREATED)
def create_laboratory(
    lab_in: LaboratoryCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Admin-only: add a new laboratory to a department"""
    dept = db.query(Department).filter(Department.id == lab_in.department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    existing = db.query(Laboratory).filter(Laboratory.code == lab_in.code.strip().upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Laboratory with code '{lab_in.code}' already exists.")

    lab = Laboratory(
        code=lab_in.code.strip().upper(),
        name=lab_in.name.strip(),
        location=lab_in.location,
        department_id=lab_in.department_id,
    )
    db.add(lab)
    db.commit()
    db.refresh(lab)
    return LaboratoryOut(
        id=lab.id,
        code=lab.code,
        name=lab.name,
        location=lab.location,
        department_id=lab.department_id,
        department_code=dept.code,
        created_at=lab.created_at,
    )
