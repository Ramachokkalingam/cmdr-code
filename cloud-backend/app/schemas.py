from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    photo_url: Optional[str] = None

class UserCreate(UserBase):
    firebase_uid: str

class User(UserBase):
    id: str
    firebase_uid: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Session schemas
class SessionBase(BaseModel):
    name: Optional[str] = None
    current_directory: Optional[str] = "/"
    environment_vars: Optional[str] = None

class SessionCreate(SessionBase):
    pass

class Session(SessionBase):
    id: str
    user_id: str
    is_active: bool
    created_at: datetime
    last_access: datetime
    
    class Config:
        from_attributes = True

# Command History schemas
class CommandHistoryBase(BaseModel):
    command: str
    output: Optional[str] = None
    exit_code: Optional[int] = None

class CommandHistoryCreate(CommandHistoryBase):
    session_id: Optional[str] = None

class CommandHistory(CommandHistoryBase):
    id: str
    user_id: str
    session_id: Optional[str] = None
    timestamp: datetime
    
    class Config:
        from_attributes = True

# File Operation schemas
class FileOperationBase(BaseModel):
    operation_type: str
    file_path: str
    file_size: Optional[int] = None

class FileOperationCreate(FileOperationBase):
    session_id: Optional[str] = None

class FileOperation(FileOperationBase):
    id: str
    user_id: str
    session_id: Optional[str] = None
    timestamp: datetime
    
    class Config:
        from_attributes = True

# Auth schemas
class TokenData(BaseModel):
    firebase_uid: Optional[str] = None

class FirebaseToken(BaseModel):
    token: str

# AI Assistant schemas
class AIRequest(BaseModel):
    prompt: str

class AIResponse(BaseModel):
    result: str

# Update system schemas
class UpdateInfo(BaseModel):
    version: str
    downloadUrl: str
    releaseNotes: str
    mandatory: bool
    size: int
    checksum: Optional[str] = None

class UpdateResponse(BaseModel):
    updateAvailable: bool
    update: Optional[UpdateInfo] = None

class VersionCheckRequest(BaseModel):
    currentVersion: str
    platform: str
    
class ClientVersion(BaseModel):
    id: str
    user_id: str
    client_version: str
    platform: str
    last_seen: datetime
    update_notified: bool = False
    
    class Config:
        from_attributes = True

# Settings schemas
class FontSettingsSchema(BaseModel):
    family: str = "JetBrains Mono"
    size: int = 13
    weight: str = "normal"
    lineHeight: float = 1.2

class ColorThemeSchema(BaseModel):
    name: str
    displayName: str
    colors: dict
    opacity: Optional[float] = None

class TerminalBehaviorSettingsSchema(BaseModel):
    scrollbackSize: int = 5000
    bellSound: bool = True
    copyOnSelection: bool = False
    pasteOnRightClick: bool = True
    wordWrap: bool = True
    tabCompletion: bool = True
    cursorStyle: str = "block"
    cursorBlink: bool = True

class UISettingsSchema(BaseModel):
    showSessionSidebar: bool = True
    aiBarAutoOpen: bool = False
    aiBarPosition: str = "bottom"
    terminalPadding: int = 8
    terminalMargins: int = 0
    fullScreenMode: bool = False

class KeyboardShortcutSchema(BaseModel):
    id: str
    name: str
    description: str
    key: str
    modifiers: dict
    enabled: bool = True

class ConnectionSettingsSchema(BaseModel):
    autoReconnect: bool = True
    reconnectInterval: int = 5000
    connectionTimeout: int = 30000
    websocketPingInterval: int = 30000

class PerformanceSettingsSchema(BaseModel):
    renderingOptimization: str = "balanced"
    bufferSize: int = 1000
    frameRateLimit: int = 60
    enableWebGL: bool = True
    enableCanvas: bool = True

class SecuritySettingsSchema(BaseModel):
    rememberCredentials: bool = True
    sessionTimeout: int = 3600000
    twoFactorEnabled: bool = False
    clearHistoryOnExit: bool = False
    disableCommandLogging: bool = False
    incognitoMode: bool = False

class AISettingsSchema(BaseModel):
    defaultModel: str = "gpt-4"
    responseLength: str = "medium"
    autoSuggest: bool = True
    contextAwareness: int = 5
    showSuggestions: bool = True
    responseFormatting: str = "markdown"

class SessionSettingsSchema(BaseModel):
    saveSessionState: bool = True
    autoRestoreSessions: bool = True
    sessionHistoryLimit: int = 10
    autoExportLogs: bool = False

class DeveloperSettingsSchema(BaseModel):
    debugMode: bool = False
    consoleLoggingLevel: str = "info"
    performanceMonitoring: bool = False
    websocketInspection: bool = False

class AccessibilitySettingsSchema(BaseModel):
    highContrast: bool = False
    screenReaderSupport: bool = False
    keyboardOnlyNavigation: bool = False
    textScaling: float = 1.0
    announceCommands: bool = False

class CmdrSettingsSchema(BaseModel):
    version: str = "1.0.0"
    font: FontSettingsSchema
    theme: ColorThemeSchema
    terminalBehavior: TerminalBehaviorSettingsSchema
    ui: UISettingsSchema
    keyboardShortcuts: List[KeyboardShortcutSchema]
    connection: ConnectionSettingsSchema
    performance: PerformanceSettingsSchema
    security: SecuritySettingsSchema
    ai: AISettingsSchema
    session: SessionSettingsSchema
    developer: DeveloperSettingsSchema
    accessibility: AccessibilitySettingsSchema

class UserSettingsBase(BaseModel):
    settings_data: dict

class UserSettingsCreate(UserSettingsBase):
    pass

class UserSettingsUpdate(BaseModel):
    settings_data: Optional[dict] = None

class UserSettings(UserSettingsBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
