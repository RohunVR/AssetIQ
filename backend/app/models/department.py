from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base
from backend.app.time_util import utc_now

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., CSE, ECE, AIML
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    laboratories = relationship("Laboratory", back_populates="department", cascade="all, delete-orphan")
    users = relationship("User", back_populates="department")
    assets = relationship("Asset", back_populates="department")
    inventory_items = relationship("InventoryItem", back_populates="department")


class Laboratory(Base):
    __tablename__ = "laboratories"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., LAB-PROG
    name = Column(String(255), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    location = Column(String(255), nullable=True)  # e.g. Block B, Room 204
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    department = relationship("Department", back_populates="laboratories")
    assets = relationship("Asset", back_populates="laboratory")
    inventory_items = relationship("InventoryItem", back_populates="laboratory")
