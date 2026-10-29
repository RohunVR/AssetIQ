from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.schemas.user import UserLogin, TokenResponse, UserOut, DemoLoginRequest
from backend.app.security import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user with email and password"""
    user = db.query(User).filter(User.email == login_data.email.strip().lower()).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please verify credentials.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Please contact the administrator.",
        )

    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    
    # Enriched user output
    dept_name = user.department.name if user.department else None
    user_out = UserOut(
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
    return TokenResponse(access_token=token, user=user_out)

@router.post("/demo-login", response_model=TokenResponse)
def demo_login(req: DemoLoginRequest, db: Session = Depends(get_db)):
    """Convenience endpoint for project evaluation to switch roles instantly with 1-click"""
    role_email_map = {
        "ADMIN": "admin@college.edu",
        "LIBRARIAN": "librarian@college.edu",
        "LAB_STAFF_CSE": "staff.cse@college.edu",
        "LAB_STAFF_ECE": "staff.ece@college.edu",
        "LAB_STAFF_AIML": "staff.aiml@college.edu",
        "FACULTY": "faculty.cse@college.edu",
        "STUDENT_CSE": "student.cse@college.edu",
        "STUDENT_ECE": "student.ece@college.edu",
    }
    
    email = role_email_map.get(req.role)
    if not email:
        raise HTTPException(status_code=400, detail=f"Unknown demo role: {req.role}")
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Demo account not found. Ensure seed data is initialized.")
    
    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    dept_name = user.department.name if user.department else None
    user_out = UserOut(
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
    return TokenResponse(access_token=token, user=user_out)

@router.get("/me", response_model=UserOut)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Return currently authenticated user profile"""
    dept_name = current_user.department.name if current_user.department else None
    return UserOut(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        department_id=current_user.department_id,
        student_or_staff_id=current_user.student_or_staff_id,
        phone=current_user.phone,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        department_name=dept_name,
    )
