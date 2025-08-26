from fastapi import APIRouter

from .content_api import router as content_router
from .auth_api import router as auth_router
from .download_api import router as download_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/api/v1")
api_router.include_router(content_router, prefix="/api/v1")
api_router.include_router(download_router)

