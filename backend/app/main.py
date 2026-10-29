from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from backend.app.config import FRONTEND_DIR
from backend.app.database import engine, Base
from backend.app.seed import seed_database

# Import routers
from backend.app.api.auth import router as auth_router
from backend.app.api.users import router as users_router
from backend.app.api.departments import router as departments_router
from backend.app.api.assets import router as assets_router
from backend.app.api.inventory import router as inventory_router
from backend.app.api.borrowing import router as borrowing_router
from backend.app.api.maintenance import router as maintenance_router
from backend.app.api.alerts import router as alerts_router
from backend.app.api.dashboard import router as dashboard_router
from backend.app.api.settings import router as settings_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and seed realistic initial college data
    Base.metadata.create_all(bind=engine)
    seed_database()
    yield
    # Shutdown logic if needed

app = FastAPI(
    title="AssetIQ - Smart Inventory & Asset Management System",
    description="Centralized college laboratory equipment and institutional asset management system.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers under /api
app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(departments_router, prefix="/api")
app.include_router(assets_router, prefix="/api")
app.include_router(inventory_router, prefix="/api")
app.include_router(borrowing_router, prefix="/api")
app.include_router(maintenance_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(settings_router, prefix="/api")

# Static files for frontend
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Allow API requests through
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        
        file_path = FRONTEND_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        
        # Default fallback to index.html for Single Page App
        index_file = FRONTEND_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return JSONResponse(status_code=404, content={"detail": "Frontend index.html not found"})
