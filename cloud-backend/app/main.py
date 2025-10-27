from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import firebase_admin
from firebase_admin import credentials, auth
from .database import engine, Base
from .routers import auth_router, sessions_router, ai_router, settings_router
from .routers.updates import router as updates_router, api_router as updates_api_router
from .config import settings
import os
from typing import Optional

# Initialize Firebase Admin SDK
if not firebase_admin._apps:
    # In production, use service account key
    # For development, you can use default credentials
    if os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY"):
        cred = credentials.Certificate(os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY"))
    else:
        cred = credentials.ApplicationDefault()
    firebase_admin.initialize_app(cred)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create database tables
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="CMDR Cloud Backend",
    description="Cloud backend for CMDR terminal sharing application",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["authentication"])
app.include_router(sessions_router, prefix="/api/sessions", tags=["sessions"])
app.include_router(ai_router, prefix="/api/ai", tags=["ai-assistant"])
app.include_router(settings_router, prefix="/api/settings", tags=["settings"])
app.include_router(updates_router, prefix="/api")
app.include_router(updates_api_router)  # C client compatible endpoints

# C client update endpoints (no auth required)
@app.get("/version/check")
async def check_version_c_client(
    current_version: Optional[str] = Header(None, alias="X-Current-Version"),
    platform: Optional[str] = Header(None, alias="X-Platform"),
    user_agent: Optional[str] = Header(None, alias="User-Agent")
):
    """Check if an update is available for the C client (no auth required)"""
    if not current_version:
        raise HTTPException(400, "X-Current-Version header required")
    
    if not platform:
        raise HTTPException(400, "X-Platform header required")
    
    # Mock response for now
    return {
        "updateAvailable": True,
        "version": "1.2.0",
        "currentVersion": current_version,
        "downloadUrl": f"https://github.com/Ramachokkalingam/cmdr-code/releases/download/v1.2.0/cmdr-{platform}-x86_64",
        "downloadSize": 2048576,
        "checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "changelog": "New update available with improvements!",
        "critical": False,
        "releaseDate": "2025-09-14T10:00:00Z"
    }

@app.get("/")
async def root():
    return {"message": "CMDR Cloud Backend API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
