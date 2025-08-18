# LocalVault API v2.0 - Polymorphic Content Management System

A secure local file sharing and content management system with support for both file uploads and text content storage using a polymorphic model architecture.

## 🚀 Features

- **Polymorphic Content Model**: Single unified model for both file uploads and text content
- **Dual Authentication**: Support for both user-based (OTP) and device-based authentication
- **File Upload Support**: Upload files up to 20MB with support for images, documents, archives, etc.
- **Text Content Storage**: Store and manage long text content (up to 1MB)
- **MinIO Integration**: Secure object storage for file management
- **Content Search**: Search across titles, text content, and filenames
- **Tagging System**: Organize content with custom tags
- **RESTful API**: Comprehensive REST API with OpenAPI documentation

## 📋 Requirements

- Python 3.8+
- FastAPI
- SQLAlchemy
- MinIO
- PostgreSQL/SQLite (configurable)
- JWT for authentication

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd local_vault
```

2. Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run the application:
```bash
python main.py
```

The API will be available at `http://localhost:9000`

## 📚 API Documentation

### Base URL
```
http://localhost:9000/api/v1
```

### Interactive Documentation
- Swagger UI: `http://localhost:9000/docs`
- ReDoc: `http://localhost:9000/redoc`

## 🔐 Authentication

The system supports two authentication methods:

### 1. User Authentication (OTP-based)
```bash
# Request OTP
POST /api/v1/auth/request-otp
{
  "phone_number": "+919876543210"
}

# Verify OTP and get tokens
POST /api/v1/auth/verify-otp
{
  "phone_number": "+919876543210",
  "otp": "123456"
}
```

### 2. Device Authentication (API Key-based)
```bash
# Register device
POST /api/v1/auth/register-device
{
  "device_name": "My Laptop",
  "device_type": "chrome",
  "mac_address": "00:11:22:33:44:55"
}

# Login with device
POST /api/v1/auth/login
{
  "device_id": "device-uuid",
  "api_key": "your-api-key"
}
```

## 📝 Content Management API

### Create Text Content
```bash
POST /api/v1/content/text
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "title": "My Notes",
  "text_content": "This is my long text content...",
  "tags": ["notes", "important"]
}
```

### Upload File Content
```bash
POST /api/v1/content/file
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data

file: <file-upload>
title: "My Document"
tags: "documents,work"
bucket: "shared"
```

### List Content
```bash
GET /api/v1/content/list?content_type=text&limit=20&offset=0&search=notes
Authorization: Bearer <jwt-token>
```

### Get Specific Content
```bash
GET /api/v1/content/{content_id}
Authorization: Bearer <jwt-token>
```

### Update Content
```bash
PUT /api/v1/content/{content_id}
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "title": "Updated Title",
  "tags": ["updated", "notes"],
  "text_content": "Updated text content..."
}
```

### Delete Content
```bash
DELETE /api/v1/content/{content_id}
Authorization: Bearer <jwt-token>
```

### Download File
```bash
GET /api/v1/content/download/{content_id}
Authorization: Bearer <jwt-token>
```

### Content Statistics
```bash
GET /api/v1/content/stats/summary
Authorization: Bearer <jwt-token>
```

## 🗄️ Database Schema

### Content Model (Polymorphic)
```sql
CREATE TABLE contents (
    id VARCHAR PRIMARY KEY,
    content_type ENUM('file', 'text') NOT NULL,
    title VARCHAR,
    tags TEXT, -- JSON string
    user_id INTEGER REFERENCES users(id),
    device_id VARCHAR REFERENCES devices(id),
    
    -- Text content fields
    text_content TEXT,
    
    -- File content fields
    filename VARCHAR,
    original_name VARCHAR,
    bucket VARCHAR,
    file_path VARCHAR,
    file_size BIGINT,
    mime_type VARCHAR,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### User Model
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name VARCHAR,
    email VARCHAR UNIQUE,
    phone_number VARCHAR UNIQUE NOT NULL,
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT FALSE,
    profile_picture_url VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Device Model
```sql
CREATE TABLE devices (
    id VARCHAR PRIMARY KEY,
    device_name VARCHAR NOT NULL,
    device_type VARCHAR NOT NULL,
    mac_address VARCHAR,
    api_key_hash VARCHAR NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP
);
```

## 📁 File Upload Specifications

### Supported File Types
- **Images**: JPEG, PNG, GIF, WebP, SVG
- **Documents**: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx)
- **Text Files**: TXT, CSV, HTML, CSS, JavaScript, JSON, XML
- **Archives**: ZIP, RAR, 7Z
- **Other**: Binary files (application/octet-stream)

### File Size Limits
- Maximum file size: **20MB**
- Text content limit: **1MB**

## 🏗️ Architecture

### Polymorphic Content Model
The system uses a single `Content` model that can handle both file uploads and text content:

- **File Content**: Stores file metadata and references to MinIO storage
- **Text Content**: Stores text directly in the database
- **Common Fields**: Title, tags, timestamps, ownership (user/device)

### Benefits
1. **Unified API**: Single set of endpoints for all content types
2. **Consistent Search**: Search across both files and text content
3. **Flexible Tagging**: Common tagging system for all content
4. **Simplified Management**: Single interface for content operations

## 🔧 Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=sqlite:///./local_vault.db

# JWT
JWT_SECRET=your-super-secret-jwt-key

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_SECURE=false

# API
API_HOST=0.0.0.0
API_PORT=9000
```

## 🧪 Testing

### Test File Upload
```bash
curl -X POST "http://localhost:9000/api/v1/content/file" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -F "file=@test.pdf" \
  -F "title=Test Document" \
  -F "tags=test,document"
```

### Test Text Content
```bash
curl -X POST "http://localhost:9000/api/v1/content/text" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Note",
    "text_content": "This is a test note with some content.",
    "tags": ["test", "note"]
  }'
```

## 📊 Response Examples

### Content Response
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "content_type": "text",
  "title": "My Important Notes",
  "tags": ["notes", "important"],
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "text_content": "This is my important note content...",
  "filename": null,
  "original_name": null,
  "bucket": null,
  "file_size": null,
  "mime_type": null,
  "download_url": null
}
```

### File Content Response
```json
{
  "id": "456e7890-e89b-12d3-a456-426614174001",
  "content_type": "file",
  "title": "Project Document",
  "tags": ["work", "project"],
  "created_at": "2024-01-15T11:00:00Z",
  "updated_at": "2024-01-15T11:00:00Z",
  "text_content": null,
  "filename": "456e7890-e89b-12d3-a456-426614174001.pdf",
  "original_name": "project_document.pdf",
  "bucket": "shared",
  "file_size": 1048576,
  "mime_type": "application/pdf",
  "download_url": "/api/v1/content/download/456e7890-e89b-12d3-a456-426614174001"
}
```

## 🚀 Deployment

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Production Considerations
1. Use PostgreSQL instead of SQLite
2. Set up proper MinIO cluster
3. Configure HTTPS/TLS
4. Set up proper logging and monitoring
5. Use Redis for OTP storage instead of in-memory
6. Configure proper CORS origins
7. Set up backup strategies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the API documentation at `/docs`
- Review the logs for debugging information

---

**LocalVault API v2.0** - Secure, flexible, and powerful content management system.
