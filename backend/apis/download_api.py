from fastapi import APIRouter, HTTPException
from fastapi.params import Query
from fastapi.responses import StreamingResponse
from minio import S3Error

from utils.minio_conn import MinIOService

router = APIRouter(prefix="/download", tags=["Download"])

@router.get("/extension")
async def download_extension():
    """Download Chrome Extension"""
    try:
        minio_service = MinIOService()
        response = minio_service.client.get_object("downloads", "localvault-extension.zip")

        def file_generator():
            try:
                while True:
                    data = response.read(8192)
                    if not data:
                        break
                    yield data
            finally:
                response.close()
                response.release_conn()

        return StreamingResponse(
            file_generator(),
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=localvault-extension.zip"}
        )
    except Exception as e:
        raise HTTPException(404, "Extension package not found")


@router.get("/mobile")
async def download_mobile(platform: str = Query(..., description="Platform: ios or android")):
    """Download Mobile App for specific platform"""
    try:
        # Validate platform parameter
        if platform.lower() not in ["ios", "android"]:
            raise HTTPException(400, "Platform must be 'ios' or 'android'")

        platform = platform.lower()

        # Determine file based on platform
        if platform == "ios":
            filename = "localvault-ios.zip"
            download_name = "localvault-ios.zip"
        else:  # android
            filename = "localvault-android.apk"  # or .zip if source code
            download_name = "localvault-android.apk"

        minio_service = MinIOService()
        response = minio_service.client.get_object("downloads", filename)

        def file_generator():
            try:
                while True:
                    data = response.read(8192)
                    if not data:
                        break
                    yield data
            finally:
                response.close()
                response.release_conn()

        # Set appropriate media type
        media_type = "application/vnd.android.package-archive" if platform == "android" else "application/zip"

        return StreamingResponse(
            file_generator(),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={download_name}"}
        )
    except S3Error:
        raise HTTPException(404, f"Mobile package for {platform} not found")
    except Exception as e:
        raise HTTPException(500, f"Error downloading mobile package: {str(e)}")