from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import uuid
from datetime import datetime

from ..database import get_db, Session as SessionModel
from ..schemas import Session, SessionCreate, User
from ..auth import get_current_user

router = APIRouter()

# Test endpoints (no auth required)
@router.get("/test/health")
async def test_health():
    """Test endpoint to verify sessions router is working"""
    return {"status": "Sessions router is working", "timestamp": datetime.utcnow()}

@router.get("/test/db")
async def test_db(db: Session = Depends(get_db)):
    """Test database connectivity for sessions"""
    try:
        count = db.query(SessionModel).count()
        return {"status": "Database connected", "sessions_count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Simple tab management endpoints
@router.get("/tabs", response_model=List[Dict[str, Any]])
async def get_tabs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all terminal tabs/sessions for the current user"""
    sessions = db.query(SessionModel).filter(
        SessionModel.user_id == current_user.id
    ).order_by(SessionModel.last_access.desc()).all()
    
    # Return simplified tab info
    tabs = []
    for session in sessions:
        tabs.append({
            "id": session.id,
            "name": session.name or f"Tab {session.id[:8]}",
            "current_directory": session.current_directory or "~",
            "last_access": session.last_access,
            "is_active": True  # Simplified - assume all are active
        })
    
    return tabs

@router.post("/tabs", response_model=Dict[str, Any])
async def create_tab(
    session_data: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new terminal tab/session"""
    new_session = SessionModel(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        name=session_data.name or f"Tab {datetime.now().strftime('%H:%M')}",
        current_directory=session_data.current_directory or "~",
        environment_vars=session_data.environment_vars or {}
    )
    
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    return {
        "id": new_session.id,
        "name": new_session.name,
        "current_directory": new_session.current_directory,
        "created_at": new_session.created_at,
        "message": "Tab created successfully"
    }

@router.delete("/tabs/{tab_id}")
async def close_tab(
    tab_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Close/delete a terminal tab"""
    session = db.query(SessionModel).filter(
        SessionModel.id == tab_id,
        SessionModel.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Tab not found")
    
    db.delete(session)
    db.commit()
    
    return {"message": f"Tab {session.name} closed successfully"}

@router.put("/tabs/{tab_id}/directory")
async def update_tab_directory(
    tab_id: str,
    directory: Dict[str, str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update the current directory for a tab"""
    session = db.query(SessionModel).filter(
        SessionModel.id == tab_id,
        SessionModel.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Tab not found")
    
    session.current_directory = directory.get("directory", session.current_directory)
    session.last_access = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Directory updated", "current_directory": session.current_directory}
