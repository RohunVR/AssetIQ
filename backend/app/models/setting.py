from sqlalchemy import Column, Integer, String, DateTime
from backend.app.database import Base
from backend.app.time_util import utc_now

class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(String(255), nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
