from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
import uuid
import json

from ..database import get_db, User, UserSettings
from ..schemas import UserSettings as UserSettingsSchema, UserSettingsCreate, UserSettingsUpdate, CmdrSettingsSchema
from ..auth import get_current_user

router = APIRouter()

def get_default_settings() -> Dict[str, Any]:
    """Get default settings structure"""
    return {
        "version": "1.0.0",
        "font": {
            "family": "JetBrains Mono",
            "size": 13,
            "weight": "normal",
            "lineHeight": 1.2
        },
        "theme": {
            "name": "dark",
            "displayName": "Dark Theme",
            "colors": {
                "primary": "#007acc",
                "secondary": "#6c757d",
                "accent": "#ffc107",
                "background": "#1e1e1e",
                "surface": "#2d2d30",
                "text": "#ffffff",
                "textSecondary": "#cccccc",
                "border": "#3c3c3c",
                "error": "#dc3545",
                "success": "#28a745",
                "terminalBackground": "#0c0c0c",
                "terminalForeground": "#cccccc",
                "terminalCursor": "#ffffff",
                "terminalSelection": "#264f78",
                "terminalBrightBlack": "#666666",
                "terminalBrightRed": "#f14c4c",
                "terminalBrightGreen": "#23d18b",
                "terminalBrightYellow": "#f5f543",
                "terminalBrightBlue": "#3b8eea",
                "terminalBrightMagenta": "#d670d6",
                "terminalBrightCyan": "#29b8db",
                "terminalBrightWhite": "#e5e5e5"
            },
            "opacity": 0.95
        },
        "terminalBehavior": {
            "scrollbackSize": 5000,
            "bellSound": True,
            "copyOnSelection": False,
            "pasteOnRightClick": True,
            "wordWrap": True,
            "tabCompletion": True,
            "cursorStyle": "block",
            "cursorBlink": True
        },
        "ui": {
            "showSessionSidebar": True,
            "aiBarAutoOpen": False,
            "aiBarPosition": "bottom",
            "terminalPadding": 8,
            "terminalMargins": 0,
            "fullScreenMode": False
        },
        "keyboardShortcuts": [
            {
                "id": "toggle-ai-bar",
                "name": "Toggle AI Bar",
                "description": "Show/hide the AI assistant bar",
                "key": "KeyI",
                "modifiers": {"ctrl": True},
                "enabled": True
            },
            {
                "id": "new-session",
                "name": "New Session",
                "description": "Create a new terminal session",
                "key": "KeyT",
                "modifiers": {"ctrl": True, "shift": True},
                "enabled": True
            },
            {
                "id": "close-session",
                "name": "Close Session",
                "description": "Close the current terminal session",
                "key": "KeyW",
                "modifiers": {"ctrl": True, "shift": True},
                "enabled": True
            },
            {
                "id": "settings",
                "name": "Settings",
                "description": "Open settings dialog",
                "key": "Comma",
                "modifiers": {"ctrl": True},
                "enabled": True
            }
        ],
        "connection": {
            "autoReconnect": True,
            "reconnectInterval": 5000,
            "connectionTimeout": 30000,
            "websocketPingInterval": 30000
        },
        "performance": {
            "renderingOptimization": "balanced",
            "bufferSize": 1000,
            "frameRateLimit": 60,
            "enableWebGL": True,
            "enableCanvas": True
        },
        "security": {
            "rememberCredentials": True,
            "sessionTimeout": 3600000,
            "twoFactorEnabled": False,
            "clearHistoryOnExit": False,
            "disableCommandLogging": False,
            "incognitoMode": False
        },
        "ai": {
            "defaultModel": "gpt-4",
            "responseLength": "medium",
            "autoSuggest": True,
            "contextAwareness": 5,
            "showSuggestions": True,
            "responseFormatting": "markdown"
        },
        "session": {
            "saveSessionState": True,
            "autoRestoreSessions": True,
            "sessionHistoryLimit": 10,
            "autoExportLogs": False
        },
        "developer": {
            "debugMode": False,
            "consoleLoggingLevel": "info",
            "performanceMonitoring": False,
            "websocketInspection": False
        },
        "accessibility": {
            "highContrast": False,
            "screenReaderSupport": False,
            "keyboardOnlyNavigation": False,
            "textScaling": 1.0,
            "announceCommands": False
        }
    }

@router.get("/", response_model=Dict[str, Any])
async def get_user_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's settings"""
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    
    if not user_settings:
        # Return default settings if none exist
        return get_default_settings()
    
    return user_settings.settings_data

@router.post("/", response_model=UserSettingsSchema)
async def create_user_settings(
    settings: UserSettingsCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new user settings"""
    # Check if settings already exist
    existing_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if existing_settings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User settings already exist. Use PUT to update."
        )
    
    # Validate settings structure
    try:
        # Merge with defaults to ensure all required fields are present
        default_settings = get_default_settings()
        merged_settings = {**default_settings, **settings.settings_data}
        
        # Create new settings
        db_settings = UserSettings(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            settings_data=merged_settings
        )
        
        db.add(db_settings)
        db.commit()
        db.refresh(db_settings)
        
        return db_settings
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid settings format: {str(e)}"
        )

@router.put("/", response_model=UserSettingsSchema)
async def update_user_settings(
    settings: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user settings"""
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    
    if not user_settings:
        # Create settings if they don't exist
        user_settings = UserSettings(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            settings_data=get_default_settings()
        )
        db.add(user_settings)
    
    if settings.settings_data:
        try:
            # Deep merge the settings
            def deep_merge(base: dict, update: dict) -> dict:
                result = base.copy()
                for key, value in update.items():
                    if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                        result[key] = deep_merge(result[key], value)
                    else:
                        result[key] = value
                return result
            
            user_settings.settings_data = deep_merge(user_settings.settings_data, settings.settings_data)
            
            db.commit()
            db.refresh(user_settings)
            
            return user_settings
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid settings format: {str(e)}"
            )
    
    return user_settings

@router.patch("/", response_model=Dict[str, Any])
async def patch_user_settings(
    settings_patch: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Patch specific settings fields"""
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    
    if not user_settings:
        # Create settings if they don't exist
        user_settings = UserSettings(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            settings_data=get_default_settings()
        )
        db.add(user_settings)
    
    try:
        # Apply patch to settings
        def apply_patch(obj: dict, patch: dict, path: str = "") -> dict:
            result = obj.copy()
            for key, value in patch.items():
                current_path = f"{path}.{key}" if path else key
                if isinstance(value, dict) and key in result and isinstance(result[key], dict):
                    result[key] = apply_patch(result[key], value, current_path)
                else:
                    result[key] = value
            return result
        
        user_settings.settings_data = apply_patch(user_settings.settings_data, settings_patch)
        
        db.commit()
        db.refresh(user_settings)
        
        return user_settings.settings_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid settings patch: {str(e)}"
        )

@router.delete("/")
async def delete_user_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete user settings (reset to defaults)"""
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    
    if user_settings:
        db.delete(user_settings)
        db.commit()
    
    return {"message": "Settings reset to defaults"}

@router.post("/reset")
async def reset_user_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reset user settings to defaults"""
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    
    if not user_settings:
        user_settings = UserSettings(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            settings_data=get_default_settings()
        )
        db.add(user_settings)
    else:
        user_settings.settings_data = get_default_settings()
    
    db.commit()
    db.refresh(user_settings)
    
    return {"message": "Settings reset to defaults", "settings": user_settings.settings_data}

@router.get("/schema")
async def get_settings_schema():
    """Get the settings schema for validation"""
    return {
        "schema": CmdrSettingsSchema.model_json_schema(),
        "example": get_default_settings()
    }
