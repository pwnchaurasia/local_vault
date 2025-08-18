from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
import json
import uuid
import logging

from starlette.responses import JSONResponse

from db.db_conn import get_db
from db.models import Content, ContentType, User, Device
from db.schema import (
    ContentResponse, 
    ContentListResponse,
    ContentUpdateRequest,
    ContentTypeEnum
)
from utils import app_logger

from utils.dependencies import get_current_user
from utils.minio_conn import minio_client
from minio.error import S3Error

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/content", tags=["Content Management"])

# File size limit: 20MB
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB in bytes

# Allowed file types
ALLOWED_FILE_TYPES = {
    # Images
    "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml",
    # Documents
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    # Text files
    "text/plain", "text/csv", "text/html", "text/css", "text/javascript",
    "application/json", "application/xml",
    # Archives
    "application/zip", "application/x-rar-compressed", "application/x-7z-compressed",
    # Other
    "application/octet-stream"
}


def parse_tags(tags_str: Optional[str]) -> Optional[List[str]]:
    """Parse tags from string to list"""
    if not tags_str:
        return None
    try:
        if tags_str.startswith('['):
            return json.loads(tags_str)
        else:
            return [tag.strip() for tag in tags_str.split(',') if tag.strip()]
    except:
        return [tags_str]


def serialize_tags(tags: Optional[List[str]]) -> Optional[str]:
    """Serialize tags list to JSON string"""
    if not tags:
        return None
    return json.dumps(tags)


@router.post("/upload", response_model=ContentResponse)
async def upload_content(
    # Optional file upload
    file: Optional[UploadFile] = File(None),
    # Optional text content
    text_content: Optional[str] = Form(None),
    # Common fields
    title: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    bucket: str = Form("shared"),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Unified endpoint for uploading both files and text content.
    
    - For file upload: provide 'file' parameter
    - For text content: provide 'text_content' parameter
    - Both can have optional title and tags
    """
    
    # Validate that either file or text_content is provided, but not both
    if not file and not text_content:
        raise HTTPException(
            status_code=400, 
            detail="Either file or text_content must be provided"
        )
    
    if file and text_content:
        raise HTTPException(
            status_code=400, 
            detail="Cannot upload both file and text content in the same request"
        )
    
    content_id = str(uuid.uuid4())
    bucket = str(current_user.phone_number)
    
    try:
        if file:
            file_content = await file.read()
            file_size = len(file_content)
            
            if file_size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413, 
                    detail=f"File too large. Maximum size allowed is {MAX_FILE_SIZE // (1024*1024)}MB"
                )
            
            # Validate file type
            if file.content_type not in ALLOWED_FILE_TYPES:
                raise HTTPException(
                    status_code=415,
                    detail=f"File type {file.content_type} not allowed"
                )
            
            # Generate unique filename
            file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
            stored_filename = f"{content_id}.{file_extension}" if file_extension else content_id
            
            # Upload to MinIO
            from io import BytesIO
            file_stream = BytesIO(file_content)
            
            minio_client.put_object(
                bucket,
                stored_filename,
                file_stream,
                length=file_size,
                content_type=file.content_type
            )
            
            # Create file content record
            content = Content(
                id=content_id,
                content_type=ContentType.FILE,
                title=title or file.filename,
                user_id=current_user.id,
                filename=stored_filename,
                original_name=file.filename,
                bucket=bucket,
                file_path=f"{bucket}/{stored_filename}",
                file_size=file_size,
                mime_type=file.content_type
            )
            
            logger.info(f"File uploaded: {file.filename} ({file_size} bytes) by user {current_user.phone_number}")
            
        # Handle text content
        else:
            # Validate text content length
            if len(text_content) > 1000000:  # 1MB text limit
                raise HTTPException(
                    status_code=413,
                    detail="Text content too large. Maximum size is 1MB"
                )
            
            # Create text content record
            content = Content(
                id=content_id,
                content_type=ContentType.TEXT,
                title=title or "Text Content",
                user_id=current_user.id,
                text_content=text_content
            )
            
            logger.info(f"Text content created by user {current_user.phone_number}")
        
        # Save to database
        db.add(content)
        db.commit()
        db.refresh(content)
        
        # Prepare response
        response_data = ContentResponse(
            id=content.id,
            content_type=ContentTypeEnum.FILE if content.content_type == ContentType.FILE else ContentTypeEnum.TEXT,
            title=content.title,
            created_at=content.created_at,
            updated_at=content.updated_at,
            text_content=content.text_content,
            filename=content.filename,
            original_name=content.original_name,
            bucket=content.bucket,
            file_size=content.file_size,
            mime_type=content.mime_type,
            download_url=f"/api/v1/content/download/{content.id}" if content.content_type == ContentType.FILE else None
        )
        
        return response_data
        
    except S3Error as e:
        logger.error(f"MinIO error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")
    except Exception as e:
        logger.error(f"Error uploading content: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/list", response_model=ContentListResponse)
async def list_content(
    content_type: Optional[ContentTypeEnum] = None,
    limit: int = 50,
    offset: int = 0,
    search: Optional[str] = None,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        """List all content with optional filtering"""

        query = db.query(Content).filter(Content.user_id == current_user.id)

        # Filter by content type
        if content_type:
            if content_type == ContentTypeEnum.FILE:
                query = query.filter(Content.content_type == ContentType.FILE)
            elif content_type == ContentTypeEnum.TEXT:
                query = query.filter(Content.content_type == ContentType.TEXT)

        # Search in title and text content
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                (Content.title.ilike(search_filter)) |
                (Content.text_content.ilike(search_filter)) |
                (Content.original_name.ilike(search_filter))
            )

        # Get total count
        total_count = query.count()

        # Apply pagination
        contents = query.order_by(Content.created_at.desc()).offset(offset).limit(limit).all()

        # Prepare response
        content_responses = []
        for content in contents:
            response_data = ContentResponse(
                id=content.id,
                content_type=ContentTypeEnum.FILE if content.content_type == ContentType.FILE else ContentTypeEnum.TEXT,
                title=content.title,
                tags=json.loads(content.tags) if content.tags else None,
                created_at=content.created_at,
                updated_at=content.updated_at,
                text_content=content.text_content,
                filename=content.filename,
                original_name=content.original_name,
                bucket=content.bucket,
                file_size=content.file_size,
                mime_type=content.mime_type,
                download_url=f"/api/v1/content/download/{content.id}" if content.content_type == ContentType.FILE else None
            )
            content_responses.append(response_data)

        return ContentListResponse(
            contents=content_responses,
            total_count=total_count
        )
    except Exception as e:
        app_logger.exceptionlogs(f"Error {e}")
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@router.get("/download/{content_id}")
async def download_file(
    content_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download file content"""
    
    content = db.query(Content).filter(
        Content.id == content_id,
        Content.device_id == current_user.id,
        Content.content_type == ContentType.FILE
    ).first()
    
    if not content:
        raise HTTPException(status_code=404, detail="File content not found")
    
    try:
        # Get file from MinIO
        response = minio_client.get_object(content.bucket, content.filename)
        
        def file_generator():
            try:
                while True:
                    data = response.read(8192)  # Read in 8KB chunks
                    if not data:
                        break
                    yield data
            finally:
                response.close()
                response.release_conn()
        
        return StreamingResponse(
            file_generator(),
            media_type=content.mime_type or "application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename={content.original_name}"
            }
        )
        
    except S3Error as e:
        logger.error(f"MinIO error downloading file: {e}")
        raise HTTPException(status_code=404, detail="File not found in storage")
    except Exception as e:
        logger.error(f"Error downloading file: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{content_id}", response_model=ContentResponse)
async def get_content(
    content_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific content by ID (for copying text content)"""
    
    content = db.query(Content).filter(
        Content.id == content_id,
        Content.device_id == current_user.id
    ).first()
    
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    response_data = ContentResponse(
        id=content.id,
        content_type=ContentTypeEnum.FILE if content.content_type == ContentType.FILE else ContentTypeEnum.TEXT,
        title=content.title,
        tags=json.loads(content.tags) if content.tags else None,
        created_at=content.created_at,
        updated_at=content.updated_at,
        text_content=content.text_content,
        filename=content.filename,
        original_name=content.original_name,
        bucket=content.bucket,
        file_size=content.file_size,
        mime_type=content.mime_type,
        download_url=f"/api/v1/content/download/{content.id}" if content.content_type == ContentType.FILE else None
    )
    
    return response_data


@router.delete("/{content_id}")
async def delete_content(
    content_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete content and associated file if applicable"""
    
    content = db.query(Content).filter(
        Content.id == content_id,
        Content.device_id == current_user.id
    ).first()
    
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    # Delete file from MinIO if it's a file content
    if content.content_type == ContentType.FILE and content.bucket and content.filename:
        try:
            minio_client.remove_object(content.bucket, content.filename)
            logger.info(f"File deleted from MinIO: {content.bucket}/{content.filename}")
        except S3Error as e:
            logger.warning(f"Failed to delete file from MinIO: {e}")
    
    # Delete from database
    db.delete(content)
    db.commit()
    
    logger.info(f"Content deleted: {content_id} by user {current_user.phone_number}")
    
    return {"message": "Content deleted successfully"}


@router.get("/stats/summary")
async def get_content_stats(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get content statistics for the current user"""
    
    total_content = db.query(Content).filter(Content.device_id == current_user.id).count()
    text_content = db.query(Content).filter(
        Content.device_id == current_user.id,
        Content.content_type == ContentType.TEXT
    ).count()
    file_content = db.query(Content).filter(
        Content.device_id == current_user.id,
        Content.content_type == ContentType.FILE
    ).count()
    
    # Calculate total file size
    total_file_size = db.query(Content).filter(
        Content.device_id == current_user.id,
        Content.content_type == ContentType.FILE
    ).with_entities(Content.file_size).all()
    
    total_size_bytes = sum(size[0] for size in total_file_size if size[0])
    total_size_mb = round(total_size_bytes / (1024 * 1024), 2)
    
    return {
        "total_content": total_content,
        "text_content": text_content,
        "file_content": file_content,
        "total_file_size_mb": total_size_mb,
        "user_phone": current_user.phone_number
    }
