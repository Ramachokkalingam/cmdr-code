from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
from sqlalchemy.orm import Session
from typing import Optional
import uuid

from .database import get_db, User as UserModel
from .schemas import User

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Validate Firebase token and return current user
    """
    try:
        # Verify Firebase token
        decoded_token = auth.verify_id_token(credentials.credentials)
        firebase_uid = decoded_token['uid']
        
        # Get or create user in database
        user = db.query(UserModel).filter(UserModel.firebase_uid == firebase_uid).first()
        
        if not user:
            # Create new user from Firebase token
            user = UserModel(
                id=str(uuid.uuid4()),
                firebase_uid=firebase_uid,
                email=decoded_token.get('email', ''),
                name=decoded_token.get('name'),
                photo_url=decoded_token.get('picture')
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        return user
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def verify_firebase_token(token: str) -> dict:
    """
    Verify Firebase token and return decoded token
    """
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
