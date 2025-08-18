import os
import uuid
import bcrypt
import jwt
from typing import Optional
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from db.models import Device
from db.db_conn import get_db
from sqlalchemy.orm import Session
# Security
security = HTTPBearer()
JWT_SECRET = os.getenv("JWT_SECRET")



def hash_api_key(api_key: str) -> str:
    return bcrypt.hashpw(api_key.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_api_key(api_key: str, hashed: str) -> bool:
    return bcrypt.checkpw(api_key.encode('utf-8'), hashed.encode('utf-8'))

def generate_api_key() -> str:
    return str(uuid.uuid4()) + str(uuid.uuid4()).replace('-', '')

def create_jwt_token(device_id: str) -> str:
    payload = {
        'device_id': device_id,
        'exp': datetime.utcnow() + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def verify_jwt_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload.get('device_id')
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

async def get_current_device(credentials: HTTPAuthorizationCredentials = Depends(security), 
                             db: Session = Depends(get_db)):
    token = credentials.credentials
    device_id = verify_jwt_token(token)
    
    if not device_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    device = db.query(Device).filter(Device.id == device_id, Device.is_active == True).first()
    if not device:
        raise HTTPException(status_code=401, detail="Device not found or inactive")
    
    # Update last seen
    device.last_seen = datetime.now(datetime.timezone.utc)
    db.commit()
    
    return device
