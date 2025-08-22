import os
import hashlib
import hmac
import random
import string
import jwt
import re
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict
from db.models import User
from utils import app_logger

from services.user_service import UserService
from utils.app_logger import createLogger

# In-memory OTP storage (in production, use Redis or database)
otp_storage: Dict[str, Dict] = {}

# JWT settings
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-here")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', 43200)
REFRESH_TOKEN_EXPIRE_DAYS = os.getenv('REFRESH_TOKEN_EXPIRE_DAYS', 60)

logger = createLogger('app')


def sanitize_title(title):
    if not title:
        return "Untitled"

    title = re.sub(r'[<>:"/\\|?*]', '', title)
    title = re.sub(r'\s+', ' ', title)
    title = title.strip()

    # Limit length
    if len(title) > 60:
        title = title[:60]

    return title or "Text Content"

def generate_otp(identifier, otp_type="mobile_verification"):
    try:
        return True
    except Exception as e:
        app_logger.exceptionlogs(f"Error in generate_otp, Error: {e}")
        return None

def verify_otp(identifier, otp_input, otp_type="mobile_verification"):
    try:
        stored_otp = os.getenv('DEPLOYMENT_CODE', 'XYZXYZ')
        if stored_otp and stored_otp == otp_input:
            logger.info(f"OTP {otp_input} matched with deployment code {stored_otp}")
            return True
        return False
    except Exception as e:
        app_logger.exceptionlogs(f"Error in generate_otp, Error: {e}")
        return None

def create_auth_token(user: User) -> str:
    """Create JWT access token for user"""
    try:

        payload = {
            "user_id": user.id,
            "phone_number": hash_mobile_number(user.phone_number),
            "exp": datetime.now(timezone.utc) + timedelta(minutes=int(ACCESS_TOKEN_EXPIRE_MINUTES)),
            "iat": datetime.now(timezone.utc),
            "type": "access"
        }
        
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        return token
        
    except Exception as e:
        print(f"Error creating auth token: {e}")
        return None

def create_refresh_token(user: User) -> str:
    """Create JWT refresh token for user"""
    try:
        payload = {
            "user_id": user.id,
            "phone_number": hash_mobile_number(user.phone_number),
            "exp": datetime.now(timezone.utc) + timedelta(days=int(REFRESH_TOKEN_EXPIRE_DAYS)),
            "iat": datetime.now(timezone.utc),
            "type": "refresh"
        }
        
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        return token
        
    except Exception as e:
        print(f"Error creating refresh token: {e}")
        return None

@app_logger.functionlogs(log="app")
def decode_jwt(token: str):
    """Decodes and verifies JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        exp = payload.get("exp")

        if not exp or datetime.now(timezone.utc) > datetime.fromtimestamp(exp, tz=timezone.utc):
            logger.debug("Token expired. time exceeded")
            return False, "Token Expired. Please login again.", {}

        return True, "Token valid", payload

    except jwt.ExpiredSignatureError:
        logger.debug("Token expired")
        return False, "Token Expired. Please login again.", {}

    except jwt.InvalidTokenError:
        logger.debug("Token expired")
        return False, "Wrong token. Please login gain.", {}


def verify_user_from_token(token: str, db) -> Optional[Dict]:
    """Verifies user from JWT token"""
    is_verified = False
    user = None
    try:
        is_decoded, msg, payload = decode_jwt(token)
        if not is_decoded:
            return is_verified, msg, user

        user_id = payload.get("user_id")
        hashed_mobile = payload.get("phone_number")

        user = UserService.get_user_by_id(user_id, db)

        if not user or hash_mobile_number(user.phone_number) != hashed_mobile:
            logger.debug("not user or mobile hash doesnt match")
            return is_verified, "Mobile hash doesn't match", user
        is_verified = True
        return is_verified, "User verified", user
    except Exception as e:
        app_logger.exceptionlogs(f"Error in verify user from token, Error: {e}")
        return False, "Error occurred", None

def generate_random_string(length: int = 32) -> str:
    """Generate random string for various purposes"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def format_phone_number(phone: str) -> str:
    """Format phone number to standard format"""
    # Remove all non-digit characters
    phone = ''.join(filter(str.isdigit, phone))
    
    # Add country code if not present (assuming India +91)
    if len(phone) == 10:
        phone = "91" + phone
    elif len(phone) == 12 and phone.startswith("91"):
        pass  # Already has country code
    else:
        # Handle other cases as needed
        pass
    
    return phone

def is_valid_phone_number(phone: str) -> bool:
    """Validate phone number format"""
    # Remove all non-digit characters
    phone = ''.join(filter(str.isdigit, phone))
    
    # Check if it's a valid Indian phone number
    if len(phone) == 10:
        return phone.startswith(('6', '7', '8', '9'))
    elif len(phone) == 12:
        return phone.startswith('91') and phone[2:].startswith(('6', '7', '8', '9'))
    
    return False


def hash_mobile_number(mobile_number):
    """
        Hashes mobile number using HMAC-SHA256
        :param mobile_number
    """
    hash_secret = os.getenv('HASH_SECRET')
    return hmac.new(hash_secret.encode(), str(mobile_number).encode(), hashlib.sha256).hexdigest()
