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
