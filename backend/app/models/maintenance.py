from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, Date, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base
from backend.app.time_util import utc_now

class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id = Column(Integer, primary_key=True, index=True)
    ticket_code = Column(String(100), unique=True, index=True, nullable=False)  # e.g., MNT-2025-001
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    reported_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reason = Column(Text, nullable=False)  # Description of malfunction, damage, or scheduled maintenance
    date_reported = Column(DateTime, default=utc_now, nullable=False)
    
    # Statuses: Pending, In Progress, Completed
    status = Column(String(50), default="Pending", nullable=False, index=True)

    # Verification flag: When Completed, must be manually marked ready before asset becomes Available
    is_ready_for_use = Column(Boolean, default=False, nullable=False)
    verified_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verified_at = Column(DateTime, nullable=True)

    # Service execution details
    service_date = Column(Date, nullable=True)
    work_description = Column(Text, nullable=True)
    cost = Column(Float, default=0.0, nullable=False)
    technician_name = Column(String(255), nullable=True)  # Internal staff or external vendor
    next_maintenance_date = Column(Date, nullable=True)

    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    asset = relationship("Asset", back_populates="maintenance_records")
    reported_by = relationship("User", back_populates="reported_maintenance", foreign_keys=[reported_by_id])
    verified_by = relationship("User", back_populates="verified_maintenance", foreign_keys=[verified_by_id])
