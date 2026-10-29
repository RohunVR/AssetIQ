from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base
from backend.app.time_util import utc_now

class BorrowingRequest(Base):
    __tablename__ = "borrowing_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_code = Column(String(100), unique=True, index=True, nullable=False)  # e.g., REQ-2025-001
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    request_date = Column(DateTime, default=utc_now, nullable=False)
    duration_days = Column(Integer, default=7, nullable=False)
    intended_purpose = Column(Text, nullable=False)  # Project/Course work description
    
    # Statuses: Pending, Approved, Rejected, Returned, Overdue
    status = Column(String(50), default="Pending", nullable=False, index=True)

    # Review details
    approved_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approval_date = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # Issue and Due dates
    issued_at = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True, index=True)

    # Return details
    returned_at = Column(DateTime, nullable=True)
    returned_condition = Column(String(50), nullable=True)  # Good, Minor Damage, Major Damage, Damaged
    return_notes = Column(Text, nullable=True)

    # In-use problem report by user
    user_reported_problem = Column(Text, nullable=True)
    problem_reported_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    asset = relationship("Asset", back_populates="borrowing_requests")
    user = relationship("User", back_populates="borrowing_requests", foreign_keys=[user_id])
    approved_by = relationship("User", back_populates="approved_requests", foreign_keys=[approved_by_id])
