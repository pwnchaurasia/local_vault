from fastapi import APIRouter, Depends, HTTPException, status, UploadFile
from fastapi.responses import StreamingResponse
from db.models import Device, FileMetadata, User
from db.schema import DeviceRegister, DeviceLogin, FileUploadResponse, FileListResponse
from db.db_conn import get_db
from sqlalchemy.orm import Session
from datetime import datetime
import logging
import uuid

from utils.dependencies import get_current_user
from utils.minio_conn import minio_client
from minio.error import S3Error


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["api"])


@router.post("/files/upload", name="file-upload")
def upload_file(
    file: UploadFile,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_id = str(uuid.uuid4())
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
    stored_filename = f"{file_id}.{file_extension}" if file_extension else file_id

    try:
        bucket = str(current_user.phone_number)
        # Upload to MinIO
        minio_client.put_object(
            bucket,
            stored_filename,
            file.file,
            length=-1,  # Unknown length
            part_size=10*1024*1024,  # 10MB parts
            content_type=file.content_type
        )

        # Store metadata in database
        file_metadata = FileMetadata(
            id=file_id,
            filename=stored_filename,
            original_name=file.filename,
            bucket=bucket,
            file_path=f"{bucket}/{stored_filename}",
            file_size=str(file.size) if file.size else "unknown",
            content_type=file.content_type or "application/octet-stream",
            uploaded_by=current_user.id
        )

        db.add(file_metadata)
        db.commit()

        logger.info(f"File uploaded: {file.filename} by {current_user.id}")

        return FileUploadResponse(
            file_id=file_id,
            filename=file.filename,
            bucket=bucket,
            file_size=str(file.size) if file.size else "unknown",
            message="File uploaded successfully"
        )

    except S3Error as e:
        logger.error(f"MinIO error uploading file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/files/list", response_model=FileListResponse)
async def list_files(
    bucket: str = "shared",
    limit: int = 100,
    offset: int = 0,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all files in a bucket"""
    
    files = db.query(FileMetadata)\
              .filter(FileMetadata.bucket == bucket)\
              .offset(offset)\
              .limit(limit)\
              .all()
    
    total_count = db.query(FileMetadata).filter(FileMetadata.bucket == bucket).count()
    
    files_data = []
    for file_meta in files:
        files_data.append({
            "file_id": file_meta.id,
            "filename": file_meta.original_name,
            "file_size": file_meta.file_size,
            "content_type": file_meta.content_type,
            "created_at": file_meta.created_at.isoformat(),
            "uploaded_by": file_meta.uploaded_by,
            "download_url": f"/files/download/{file_meta.id}"
        })
    
    return FileListResponse(
        files=files_data,
        total_count=total_count
    )

@router.get("/files/download/{file_id}")
async def download_file(
    file_id: str,
    current_user: Device = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download a file by ID"""
    
    # Get file metadata
    file_meta = db.query(FileMetadata).filter(FileMetadata.id == file_id).first()
    if not file_meta:
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        # Get file from MinIO
        response = minio_client.get_object(file_meta.bucket, file_meta.filename)
        
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
            media_type=file_meta.content_type,
            headers={
                "Content-Disposition": f"attachment; filename={file_meta.original_name}"
            }
        )
        
    except S3Error as e:
        logger.error(f"MinIO error downloading file: {e}")
        raise HTTPException(status_code=404, detail="File not found in storage")
    except Exception as e:
        logger.error(f"Error downloading file: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/admin/devices")
async def list_devices(
    current_user: Device = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all registered devices (admin endpoint)"""
    
    devices = db.query(Device).all()
    devices_data = []
    
    for device in devices:
        devices_data.append({
            "device_id": device.id,
            "device_name": device.device_name,
            "device_type": device.device_type,
            "mac_address": device.mac_address,
            "is_active": device.is_active,
            "created_at": device.created_at.isoformat(),
            "last_seen": device.last_seen.isoformat() if device.last_seen else None
        })
    
    return {
        "devices": devices_data,
        "total_count": len(devices_data)
    }

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now(datetime.timezone.utc).isoformat()}
