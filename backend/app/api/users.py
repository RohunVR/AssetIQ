from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.department import Department
from backend.app.schemas.user import UserCreate, UserUpdate, UserOut
from backend.app.security import require_admin, hash_password

router = APIRouter(prefix="/users", tags=["Users Management"])

@router.get("", response_model=List[UserOut])
def list_users(
    role: Optional[str] = None,
    department_id: Optional[int] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Admin-only: list all institutional users with filters"""
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if department_id:
        query = query.filter(User.department_id == department_id)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter((User.full_name.ilike(s)) | (User.email.ilike(s)) | (User.student_or_staff_id.ilike(s)))

    users = query.order_by(User.full_name).all()
    out = []
    for u in users:
        dept_name = u.department.name if u.department else None
        out.append(
            UserOut(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                role=u.role,
                department_id=u.department_id,
                student_or_staff_id=u.student_or_staff_id,
                phone=u.phone,
                is_active=u.is_active,
                created_at=u.created_at,
                department_name=dept_name,
            )
        )
    return out

@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Admin-only: create a new user account"""
    # Check email duplicate
    existing = db.query(User).filter(User.email == user_in.email.strip().lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A user with email '{user_in.email}' already exists.",
        )
    
    # Check valid department
    if user_in.department_id:
        dept = db.query(Department).filter(Department.id == user_in.department_id).first()
        if not dept:
            raise HTTPException(status_code=400, detail="Specified department does not exist.")

    # Validate role
    valid_roles = ["ADMIN", "LAB_STAFF", "FACULTY", "STUDENT"]
    if user_in.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")

    new_user = User(
        email=user_in.email.strip().lower(),
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name.strip(),
        role=user_in.role,
        department_id=user_in.department_id,
        student_or_staff_id=user_in.student_or_staff_id,
        phone=user_in.phone,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    dept_name = new_user.department.name if new_user.department else None
    return UserOut(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role,
        department_id=new_user.department_id,
        student_or_staff_id=new_user.student_or_staff_id,
        phone=new_user.phone,
        is_active=new_user.is_active,
        created_at=new_user.created_at,
        department_name=dept_name,
    )

@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Admin-only: update user details, role, department or status"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user_in.email is not None and user_in.email != user.email:
        existing = db.query(User).filter(User.email == user_in.email.strip().lower()).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email is already taken by another user.")
        user.email = user_in.email.strip().lower()

    if user_in.full_name is not None:
        user.full_name = user_in.full_name.strip()
    if user_in.role is not None:
        valid_roles = ["ADMIN", "LAB_STAFF", "FACULTY", "STUDENT"]
        if user_in.role not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")
        user.role = user_in.role
    if user_in.department_id is not None:
        user.department_id = user_in.department_id
    if user_in.student_or_staff_id is not None:
        user.student_or_staff_id = user_in.student_or_staff_id
    if user_in.phone is not None:
        user.phone = user_in.phone
    if user_in.is_active is not None:
        user.is_active = user_in.is_active
    if user_in.password:
        user.hashed_password = hash_password(user_in.password)

    db.commit()
    db.refresh(user)

    dept_name = user.department.name if user.department else None
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        department_id=user.department_id,
        student_or_staff_id=user.student_or_staff_id,
        phone=user.phone,
        is_active=user.is_active,
        created_at=user.created_at,
        department_name=dept_name,
    )

@router.patch("/{user_id}/toggle-active")
def toggle_user_active(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Admin-only: activate or deactivate user"""
    if admin.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own admin account.")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    user.is_active = not user.is_active
    db.commit()
    return {"id": user.id, "is_active": user.is_active, "message": f"User {'activated' if user.is_active else 'deactivated'} successfully."}
