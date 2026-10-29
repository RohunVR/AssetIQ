import os
from pathlib import Path
from dotenv import load_dotenv

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = BASE_DIR / "backend"
FRONTEND_DIR = BASE_DIR / "frontend"
DATA_DIR = BASE_DIR / "data"

# Local .env values are used only when the environment has not already set them.
load_dotenv(BASE_DIR / ".env")

# Ensure data directory exists
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Database
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR}/assetiq.db")

# JWT Security
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    if os.getenv("VERCEL"):
        raise RuntimeError("SECRET_KEY must be set in the Vercel project environment.")
    SECRET_KEY = "assetiq-institutional-secure-jwt-key-2025-token-secret"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Default Borrowing Limit Settings
DEFAULT_MAX_ACTIVE_ASSETS = 3
DEFAULT_MAX_BORROWING_DAYS = 7
