from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.setting import SystemSetting
from backend.app.models.user import User
from backend.app.schemas.setting import SettingOut, SettingUpdate
from backend.app.security import get_current_user, require_admin
from backend.app.config import DEFAULT_MAX_ACTIVE_ASSETS, DEFAULT_MAX_BORROWING_DAYS

router = APIRouter(prefix="/settings", tags=["System Settings"])

@router.get("", response_model=SettingOut)
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get active borrowing limit settings"""
    max_assets = db.query(SystemSetting).filter(SystemSetting.key == "max_active_assets").first()
    max_days = db.query(SystemSetting).filter(SystemSetting.key == "max_borrowing_days").first()

    return SettingOut(
        max_active_assets=int(max_assets.value) if max_assets else DEFAULT_MAX_ACTIVE_ASSETS,
        max_borrowing_days=int(max_days.value) if max_days else DEFAULT_MAX_BORROWING_DAYS,
        updated_at=max_assets.updated_at if max_assets else None,
    )

@router.put("", response_model=SettingOut)
def update_settings(
    settings_in: SettingUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Admin-only: update borrowing limits"""
    max_assets = db.query(SystemSetting).filter(SystemSetting.key == "max_active_assets").first()
    if not max_assets:
        max_assets = SystemSetting(
            key="max_active_assets",
            value=str(settings_in.max_active_assets),
            description="Maximum active borrowed items per user",
        )
        db.add(max_assets)
    else:
        max_assets.value = str(settings_in.max_active_assets)

    max_days = db.query(SystemSetting).filter(SystemSetting.key == "max_borrowing_days").first()
    if not max_days:
        max_days = SystemSetting(
            key="max_borrowing_days",
            value=str(settings_in.max_borrowing_days),
            description="Maximum borrowing duration in days",
        )
        db.add(max_days)
    else:
        max_days.value = str(settings_in.max_borrowing_days)

    db.commit()
    db.refresh(max_assets)
    return SettingOut(
        max_active_assets=int(max_assets.value),
        max_borrowing_days=int(max_days.value),
        updated_at=max_assets.updated_at,
    )
