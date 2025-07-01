# CMDR Auto-Update System

This document describes the auto-update system implemented in CMDR v1.0.0.

## Overview

The CMDR auto-update system provides seamless updates for both web and native applications, ensuring users always have access to the latest features and security patches.

## Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│     Client App      │    │   Cloud Backend     │    │   Release Server    │
│  (Web/Native)       │    │   (FastAPI)         │    │   (File Storage)    │
├─────────────────────┤    ├─────────────────────┤    ├─────────────────────┤
│ • UpdateChecker     │───▶│ • Version Check API │───▶│ • Release Files     │
│ • UpdateModal       │    │ • Download API      │    │ • Release Config    │
│ • UpdateService     │    │ • Release Config    │    │ • Checksums         │
│ • Version Display   │    │ • Authentication    │    │ • Metadata          │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

## Components

### 1. Frontend (TypeScript/Preact)

- **UpdateService**: Handles version checking, downloading, and installation
- **UpdateChecker**: Periodic background update checking
- **UpdateModal**: User interface for update notifications
- **Integration**: Seamlessly integrated into the main app

### 2. Backend (Python/FastAPI)

- **Update Router**: API endpoints for version checking and file downloads
- **Release Config**: JSON configuration for available versions
- **Authentication**: Secure access to update endpoints
- **Platform Support**: Multi-platform file serving

### 3. Native Client (C++)

- **Updater Class**: Native update installation and file replacement
- **Platform Handlers**: OS-specific update procedures
- **Backup/Restore**: Safe update with rollback capability
- **Auto-restart**: Application restart after successful update

## Update Flow

```
1. User opens application
2. UpdateChecker runs automatic version check
3. Backend compares client version with latest
4. If update available, UpdateModal is displayed
5. User chooses to install or skip
6. If install: download → verify → install → restart
7. Application restarts with new version
```

## API Endpoints

### Check for Updates
```http
GET /api/version/check
Headers:
  Current-Version: 1.0.0
  Platform: linux|windows|macos|web

Response:
{
  "updateAvailable": true,
  "update": {
    "version": "1.1.0",
    "downloadUrl": "/api/version/download/1.1.0/linux",
    "releaseNotes": "Bug fixes and improvements",
    "mandatory": false,
    "size": 16777216,
    "checksum": "sha256..."
  }
}
```

### Download Update
```http
GET /api/version/download/{version}/{platform}

Response: Binary file stream
Headers:
  Content-Disposition: attachment; filename=cmdr-1.1.0-linux.AppImage
  X-File-Checksum: sha256...
  X-File-Version: 1.1.0
```

## Release Management

### Creating a New Release

1. **Automated (via GitHub Actions)**:
   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```

2. **Manual (via script)**:
   ```bash
   cd scripts
   python release_manager.py update 1.1.0 --mandatory
   ```

### Release Configuration

```json
{
  "latest_version": "1.1.0",
  "releases": {
    "1.1.0": {
      "mandatory": false,
      "release_notes": "CMDR v1.1.0\n• New terminal features\n• Performance improvements",
      "files": {
        "linux": {
          "filename": "cmdr-1.1.0-linux.AppImage",
          "size": 16777216,
          "checksum": "abc123..."
        },
        "windows": {
          "filename": "cmdr-1.1.0-windows.exe", 
          "size": 18874368,
          "checksum": "def456..."
        },
        "macos": {
          "filename": "cmdr-1.1.0-macos.dmg",
          "size": 20971520,
          "checksum": "ghi789..."
        },
        "web": {
          "filename": "cmdr-1.1.0-web.tar.gz",
          "size": 5242880,
          "checksum": "jkl012..."
        }
      }
    }
  }
}
```

## Deployment

### Development Setup

1. **Setup release structure**:
   ```bash
   cd scripts
   python release_manager.py setup
   ```

2. **Start backend with releases**:
   ```bash
   cd cloud-backend
   RELEASES_DIR=../releases python -m uvicorn app.main:app --reload
   ```

3. **Build and run frontend**:
   ```bash
   cd html
   npm install
   npm run build
   ```

### Production Deployment

1. **Using Docker Compose**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Manual deployment**:
   ```bash
   # Deploy backend
   cd cloud-backend
   pip install -r requirements.txt
   uvicorn app.main:app --host 0.0.0.0 --port 8000

   # Serve releases
   mkdir -p /app/releases
   cp -r releases/* /app/releases/
   ```

## Security Features

- **Checksum Verification**: All downloads verified against SHA256 checksums
- **Secure Downloads**: HTTPS-only file transfers in production
- **Authentication**: Optional user authentication for downloads
- **Backup/Restore**: Automatic backup before update installation
- **Rollback**: Ability to restore previous version on failure

## Platform Support

| Platform | Package Format | Auto-Install | Auto-Restart |
|----------|----------------|--------------|--------------|
| Linux    | AppImage       | ✅           | ✅           |
| Windows  | .exe           | ✅           | ✅           |
| macOS    | .dmg           | ✅           | ✅           |
| Web      | Progressive    | ✅           | ✅           |

## Configuration

### Environment Variables

```bash
# Backend
RELEASES_DIR=/app/releases
DATABASE_URL=postgresql://user:pass@localhost/cmdr
FIREBASE_PROJECT_ID=your-project

# Frontend
REACT_APP_API_URL=https://api.cmdr.app
REACT_APP_VERSION=1.0.0
```

### Update Policies

- **Check Frequency**: Every hour + on app focus
- **Mandatory Updates**: Force update for major versions
- **Skip Preference**: Users can skip non-mandatory updates
- **Notification**: Desktop notifications for available updates

## Monitoring

### Metrics to Track

- Update check frequency
- Download success/failure rates  
- Installation success/failure rates
- Version adoption rates
- User skip patterns

### Logging

- All update checks logged
- Download attempts and results
- Installation attempts and results
- Error conditions and rollbacks

## Troubleshooting

### Common Issues

1. **Update check fails**:
   - Check network connectivity
   - Verify API endpoint availability
   - Check authentication tokens

2. **Download fails**:
   - Verify file exists on server
   - Check disk space
   - Verify network stability

3. **Installation fails**:
   - Check file permissions
   - Verify sufficient disk space
   - Check antivirus interference

### Recovery

- Automatic backup restoration on installation failure
- Manual rollback using `.backup` files
- Safe mode startup if update corrupts application

## Future Enhancements

- Delta updates for bandwidth efficiency
- Update scheduling for specific times
- Enterprise deployment features
- Offline update packages
- Update analytics dashboard

## Testing

### Manual Testing

```bash
# Test update check
curl -H "Current-Version: 1.0.0" -H "Platform: linux" \
     http://localhost:8000/api/version/check

# Test download
curl -o test-download.AppImage \
     http://localhost:8000/api/version/download/1.0.0/linux
```

### Automated Testing

Run the test suite:
```bash
cd cloud-backend
python -m pytest tests/test_updates.py
```

## Contributing

When adding new update features:

1. Update version schemas in `schemas.py`
2. Add new endpoints to `routers/updates.py`
3. Update frontend services and components
4. Add comprehensive tests
5. Update this documentation

---

For more information, see the main [CMDR documentation](../README.md).
