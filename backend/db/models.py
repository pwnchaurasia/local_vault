import enum
import uuid

from sqlalchemy import Column, String, DateTime, Boolean, Text, func, Integer, ForeignKey, BigInteger, Enum
from sqlalchemy.orm import relationship

from utils import Base


class ContentType(enum.Enum):
    FILE = "file"
    TEXT = "text"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    phone_number = Column(String, unique=True, index=True)
    is_phone_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    contents = relationship("Content", back_populates="user", cascade="all, delete-orphan")
    devices = relationship("Device", back_populates="user", cascade="all, delete-orphan")


class Device(Base):
    __tablename__ = "devices"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    device_name = Column(String, nullable=False)
    device_type = Column(String, nullable=False)  # 'mobile' or 'chrome'
    mac_address = Column(String, nullable=True)
    api_key_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_seen = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    contents = relationship("Content", back_populates="device", cascade="all, delete-orphan")
    user = relationship("User", back_populates="devices")



class Content(Base):
    """Polymorphic model to handle both file uploads and text content"""
    __tablename__ = "contents"
    
    id = Column(String, primary_key=True, index=True)
    content_type = Column(Enum(ContentType), nullable=False)
    title = Column(String, nullable=True)  # Optional title for content
    tags = Column(Text, nullable=True)  # JSON string for tags
    
    # Device relationship (primary - content belongs to device)
    device_id = Column(String, ForeignKey("devices.id"), nullable=False)
    device = relationship("Device", back_populates="contents")
    
    # User relationship (derived from device)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user = relationship("User", back_populates="contents")
    
    # Text content fields
    text_content = Column(Text, nullable=True)  # For storing long text
    
    # File content fields
    filename = Column(String, nullable=True)  # Stored filename
    original_name = Column(String, nullable=True)  # Original filename
    bucket = Column(String, nullable=True)  # MinIO bucket
    file_path = Column(String, nullable=True)  # Full file path
    file_size = Column(BigInteger, nullable=True)  # File size in bytes
    mime_type = Column(String, nullable=True)  # MIME type
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Content(id={self.id}, type={self.content_type}, title={self.title})>"


# Legacy model for backward compatibility - can be removed later
class FileMetadata(Base):
    __tablename__ = "file_metadata"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    device_id = Column(String, ForeignKey("devices.id"), nullable=True)
    filename = Column(String, nullable=False)
    original_name = Column(String, nullable=False)
    bucket = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    tags = Column(Text, nullable=True)
    uploaded_by = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
