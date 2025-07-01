from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://cmdr:password@localhost:5432/cmdr"
    
    # Firebase
    FIREBASE_PROJECT_ID: str
    FIREBASE_SERVICE_ACCOUNT_KEY: str = ""
    
    # AI (Gemini)
    GEMINI_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:6969", "http://localhost:3000"]
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # File upload
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    UPLOAD_DIR: str = "/tmp/cmdr-uploads"
    
    # Debug
    DEBUG: bool = False
    
    class Config:
        env_file = ".env"
        extra = "ignore"  # Allow extra fields in .env file

settings = Settings()
