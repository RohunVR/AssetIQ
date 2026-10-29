from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base
from backend.app.time_util import utc_now

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    item_code = Column(String(100), unique=True, index=True, nullable=False)  # e.g., INV-CSE-001
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False, index=True)  # Wires, Components, Batteries, Connectors, Consumables
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False)
    laboratory_id = Column(Integer, ForeignKey("laboratories.id", ondelete="SET NULL"), nullable=True)
    quantity = Column(Integer, default=0, nullable=False)
    min_threshold = Column(Integer, default=10, nullable=False)  # Low-stock trigger
    unit = Column(String(50), default="pcs", nullable=False)  # pcs, rolls, boxes, packets, meters
    description = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)  # Cabinet B, Bin 4
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    department = relationship("Department", back_populates="inventory_items")
    laboratory = relationship("Laboratory", back_populates="inventory_items")
    transactions = relationship("InventoryTransaction", back_populates="inventory_item", cascade="all, delete-orphan")

    @property
    def is_low_stock(self) -> bool:
        return self.quantity <= self.min_threshold


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id = Column(Integer, primary_key=True, index=True)
    inventory_item_id = Column(Integer, ForeignKey("inventory_items.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    transaction_type = Column(String(50), nullable=False)  # STOCK_IN, STOCK_OUT
    quantity_change = Column(Integer, nullable=False)  # e.g. +50 or -20
    previous_quantity = Column(Integer, nullable=False)
    new_quantity = Column(Integer, nullable=False)
    reason = Column(String(255), nullable=True)  # e.g. "Restocked from vendor", "Issued for ECE 301 Lab Exam"
    reference_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    inventory_item = relationship("InventoryItem", back_populates="transactions")
    user = relationship("User", back_populates="inventory_transactions")
