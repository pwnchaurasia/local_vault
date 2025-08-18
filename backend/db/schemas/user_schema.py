from pydantic import BaseModel
from typing import Optional

class UserRegistration(BaseModel):
    phone_number: str

class OTPVerification(BaseModel):
    phone_number: str
    otp: str

class UserProfile(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    name: Optional[str]
    email: Optional[str]
    phone_number: str
    is_email_verified: bool
    is_phone_verified: bool
    is_active: bool
    profile_picture_url: Optional[str]
    
    class Config:
        from_attributes = True
