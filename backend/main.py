import os
import sys
from dotenv import load_dotenv
from starlette.responses import HTMLResponse

load_dotenv('.env')
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from apis.routers import api_router
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="LocalVault API",
    description="Secure local file sharing and content management system with polymorphic content support",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(api_router)

# @app.get("/")
# async def root():
#     return {
#         "message": "LocalVault API v2.0 - Simplified Content Management",
#         "version": "2.0.0",
#         "features": [
#             "User authentication with OTP",
#             "Unified upload endpoint for files and text",
#             "File uploads (max 20MB)",
#             "Text content storage (max 1MB)",
#             "Content listing and search",
#             "File download and content copy",
#             "Content deletion",
#             "MinIO object storage integration"
#         ],
#         "mobile_workflow": {
#             "login": "POST /api/v1/auth/login",
#             "verify_otp": "POST /api/v1/auth/verify-otp",
#             "upload": "POST /api/v1/content/upload (unified for files & text)",
#             "list": "GET /api/v1/content/list",
#             "download": "GET /api/v1/content/download/{content_id}",
#             "copy_text": "GET /api/v1/content/{content_id}",
#             "delete": "DELETE /api/v1/content/{content_id}"
#         },
#         "endpoints": {
#             "auth": "/api/v1/auth/",
#             "content": "/api/v1/content/",
#             "docs": "/docs"
#         }
#     }


@app.get("/", response_class=HTMLResponse)
async def root():
    with open("landing.html", "r") as f:
        return HTMLResponse(content=f.read())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000, reload=True)
