cd /home/ram/project/terminal/cmdr/cloud-backend && source myenv/bin/activate && uvicorn app.main:app --reload

sudo service postgresql start

# CMDR Cloud Backend

Python FastAPI backend for CMDR terminal sharing application with Firebase authentication.

## Features

- 🔐 Firebase Authentication with Google OAuth
- 📊 PostgreSQL database with SQLAlchemy ORM
- 🖥️ Terminal session management
- 📝 Command history tracking
- 📁 File upload/download operations
- 🚀 FastAPI with automatic OpenAPI documentation

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL
- Firebase project with Authentication enabled

### Installation

1. **Clone and setup**
   ```bash
   cd cloud-backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database setup**
   ```bash
   # Create database
   createdb cmdr
   
   # Run migrations
   alembic upgrade head
   ```

4. **Firebase setup**
   - Create a Firebase project
   - Enable Authentication with Google provider
   - Download service account key
   - Update `.env` with Firebase configuration

5. **Run the server**
   ```bash
   uvicorn app.main:app --reload
   ```

   The API will be available at `http://localhost:8000`
   API documentation at `http://localhost:8000/docs`

## API Endpoints

### Authentication
- `POST /api/auth/verify-token` - Verify Firebase token
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout

### Sessions
- `GET /api/sessions/` - List user sessions
- `POST /api/sessions/` - Create new session
- `GET /api/sessions/{id}` - Get specific session
- `PUT /api/sessions/{id}` - Update session
- `DELETE /api/sessions/{id}` - Delete session

### Command History
- `GET /api/history/` - Get command history
- `POST /api/history/` - Add command to history
- `GET /api/history/search` - Search command history
- `DELETE /api/history/{id}` - Delete command
- `DELETE /api/history/session/{id}` - Clear session history

### File Operations
- `POST /api/files/upload` - Upload file
- `GET /api/files/download/{id}` - Download file
- `GET /api/files/` - List file operations
- `DELETE /api/files/{id}` - Delete file

## Development

### Docker Setup

```bash
# Build and run with Docker Compose
docker-compose -f ../docker-compose.dev.yml up --build
```

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=app
```

## Configuration

Key environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_SERVICE_ACCOUNT_KEY` - Path to service account JSON
- `SECRET_KEY` - JWT secret key
- `ALLOWED_ORIGINS` - CORS allowed origins
- `MAX_FILE_SIZE` - Maximum file upload size
- `UPLOAD_DIR` - File upload directory

## Architecture

```
app/
├── main.py              # FastAPI application
├── config.py            # Configuration settings
├── database.py          # Database models and connection
├── schemas.py           # Pydantic schemas
├── auth.py              # Authentication utilities
└── routers/
    ├── auth.py          # Authentication routes
    ├── sessions.py      # Session management routes
    ├── history.py       # Command history routes
    └── files.py         # File operation routes
```

## Integration with CMDR

The cloud backend integrates with the existing CMDR C/C++ application:

1. CMDR validates Firebase tokens via HTTP calls
2. Session data is synchronized between local and cloud
3. Command history is automatically saved
4. File operations are tracked and managed

## Security

- Firebase handles user authentication
- JWT tokens for API access
- CORS protection
- File upload size limits
- User data isolation
- SQL injection protection via SQLAlchemy

