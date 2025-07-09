from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import firebase_admin
from firebase_admin import credentials, auth
from .database import engine, Base
from .routers import auth_router, sessions_router, ai_router, settings_router
from .routers.updates import router as updates_router
from .config import settings
import os

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

@app.get("/")
async def root():
    return {"message": "CMDR Cloud Backend API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
