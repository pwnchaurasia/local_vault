
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .app_helper import verify_user_from_token, hash_mobile_number
from db.db_conn import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/verify-otp")

async def get_current_user(token: str = Depends(oauth2_scheme),
                           db: Session = Depends(get_db)):

    is_verified, msg, user = verify_user_from_token(token, db)
    if not is_verified:
        raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=msg,
        headers={"WWW-Authenticate": "Bearer"},
    )

    return user
