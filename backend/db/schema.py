from pydantic import BaseModel, Field, validator
from typing import Optional, List, Union
from datetime import datetime
from enum import Enum

# Enums
class ContentTypeEnum(str, Enum):
    FILE = "file"
    TEXT = "text"

# Auth related schemas
class UserRegistration(BaseModel):
    phone_number: str

class OTPVerification(BaseModel):
    phone_number: str
    otp: str

class Token(BaseModel):
    access_token: str
    token_type: str

class DeviceRegister(BaseModel):
    device_name: str
    device_type: str  # 'mobile' or 'chrome'
    mac_address: Optional[str] = None

class DeviceLogin(BaseModel):
    device_id: str
    api_key: str

# Content related schemas
class ContentBase(BaseModel):
    title: Optional[str] = None
    tags: Optional[List[str]] = None

class TextContentCreate(ContentBase):
    content_type: ContentTypeEnum = ContentTypeEnum.TEXT
    text_content: str = Field(..., min_length=1, max_length=1000000)  # Max 1MB text

class FileContentCreate(ContentBase):
    content_type: ContentTypeEnum = ContentTypeEnum.FILE
    bucket: str = "shared"

class ContentResponse(BaseModel):
    id: str
    content_type: ContentTypeEnum
    title: Optional[str]
    tags: Optional[List[str]]
    created_at: datetime
    updated_at: datetime
    
    # Text fields
    text_content: Optional[str] = None
    
    # File fields
    filename: Optional[str] = None
    original_name: Optional[str] = None
    bucket: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    download_url: Optional[str] = None
    
    class Config:
        from_attributes = True

class ContentListResponse(BaseModel):
    contents: List[ContentResponse]
    total_count: int

class ContentUpdateRequest(BaseModel):
    title: Optional[str] = None
    tags: Optional[List[str]] = None
    text_content: Optional[str] = None  # Only for text content

# Legacy schemas for backward compatibility
class FileUploadResponse(BaseModel):
    file_id: str
    filename: str
    bucket: str
    file_size: str
    message: str

class FileListResponse(BaseModel):
    files: List[dict]
    total_count: int

class UploadFile(BaseModel):
    file: bytes
    filename: str
    bucket: str = "shared"  # Default bucket
    tags: Optional[List[str]] = None  # Tags for the file
