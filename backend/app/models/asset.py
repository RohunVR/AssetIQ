from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from backend.app.database import Base
from backend.app.time_util import utc_now

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_code = Column(String(100), unique=True, index=True, nullable=False)  # Unique Tag: e.g. AST-CSE-001
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False, index=True)  # Computing, Electronics, Instruments, Networking, AV, Robotics
    description = Column(Text, nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False)
    laboratory_id = Column(Integer, ForeignKey("laboratories.id", ondelete="SET NULL"), nullable=True)
    location = Column(String(255), nullable=True)  # e.g., Shelf 3A, Rack 2, Room 301
    purchase_date = Column(Date, nullable=True)
    serial_number = Column(String(150), nullable=True)
    model_number = Column(String(150), nullable=True)
    cost = Column(Float, nullable=True)
    condition = Column(String(50), default="Good", nullable=False)  # Good, Minor Damage, Major Damage, Damaged
    status = Column(String(50), default="Available", nullable=False, index=True)
    # Statuses: Available, Pending Request, Borrowed, Overdue, Under Maintenance, Damaged, Retired

    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    department = relationship("Department", back_populates="assets")
    laboratory = relationship("Laboratory", back_populates="assets")
    borrowing_requests = relationship("BorrowingRequest", back_populates="asset", cascade="all, delete-orphan")
    maintenance_records = relationship("MaintenanceRecord", back_populates="asset", cascade="all, delete-orphan")
