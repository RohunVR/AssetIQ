from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base
from backend.app.time_util import utc_now

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # ADMIN, LAB_STAFF, FACULTY, STUDENT
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    student_or_staff_id = Column(String(50), nullable=True)
    phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    department = relationship("Department", back_populates="users")
    borrowing_requests = relationship("BorrowingRequest", back_populates="user", foreign_keys="BorrowingRequest.user_id")
    approved_requests = relationship("BorrowingRequest", back_populates="approved_by", foreign_keys="BorrowingRequest.approved_by_id")
    inventory_transactions = relationship("InventoryTransaction", back_populates="user")
    reported_maintenance = relationship("MaintenanceRecord", back_populates="reported_by", foreign_keys="MaintenanceRecord.reported_by_id")
    verified_maintenance = relationship("MaintenanceRecord", back_populates="verified_by", foreign_keys="MaintenanceRecord.verified_by_id")
