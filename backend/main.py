import os
import sys
from dotenv import load_dotenv
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
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "message": "LocalVault API v2.0 - Polymorphic Content Management",
        "version": "2.0.0",
        "features": [
            "User authentication with OTP",
            "Device-based authentication", 
            "File uploads (max 20MB)",
            "Text content storage",
            "Polymorphic content model",
            "Content search and filtering",
            "MinIO object storage integration"
        ],
        "endpoints": {
            "auth": "/api/v1/auth/",
            "content": "/api/v1/content/",
            "legacy_files": "/api/v1/files/",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "LocalVault API",
        "version": "2.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000, reload=True)
