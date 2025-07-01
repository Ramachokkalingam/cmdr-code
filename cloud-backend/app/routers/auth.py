from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas import User, FirebaseToken
from ..auth import verify_firebase_token, get_current_user

router = APIRouter()

@router.post("/verify-token")
async def verify_token(token_data: FirebaseToken, db: Session = Depends(get_db)):
    """
    Verify Firebase token and return user info
    """
    try:
        decoded_token = await verify_firebase_token(token_data.token)
        return {
            "valid": True,
            "user": {
                "firebase_uid": decoded_token['uid'],
                "email": decoded_token.get('email'),
                "name": decoded_token.get('name'),
                "photo_url": decoded_token.get('picture')
            }
        }
    except HTTPException:
        return {"valid": False}

@router.get("/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user info
    """
    return current_user

@router.post("/logout")
async def logout():
    """
    Logout endpoint (client should clear token)
    """
    return {"message": "Logged out successfully"}
