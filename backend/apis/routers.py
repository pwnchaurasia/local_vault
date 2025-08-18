from fastapi import APIRouter

from .content_api import router as content_router
from .auth_api import router as auth_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(content_router)

