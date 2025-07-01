from fastapi import APIRouter, Header, HTTPException, Depends
from fastapi.responses import FileResponse
from ..schemas import UpdateResponse, UpdateInfo, User
from ..auth import get_current_user
import os
import json
import hashlib
from typing import Optional
import semver

router = APIRouter(prefix="/version", tags=["updates"])

# Configuration - In production, these should come from environment variables
RELEASES_DIR = os.getenv("RELEASES_DIR", "/app/releases")
CURRENT_VERSION = "1.0.0"
RELEASE_CONFIG_FILE = os.path.join(RELEASES_DIR, "release-config.json")

# Default release configuration
DEFAULT_RELEASE_CONFIG = {
    "latest_version": "1.0.0",
    "releases": {
        "1.0.0": {
            "mandatory": False,
            "release_notes": "Initial release of CMDR v1.0.0\n• Terminal sharing functionality\n• Web-based interface\n• Session persistence\n• Multi-platform support",
            "files": {
                "windows": {
                    "filename": "cmdr-1.0.0-windows.exe",
                    "size": 15728640,
                    "checksum": "a1b2c3d4e5f6"
                },
                "macos": {
                    "filename": "cmdr-1.0.0-macos.dmg", 
                    "size": 18874368,
                    "checksum": "b2c3d4e5f6a1"
                },
                "linux": {
                    "filename": "cmdr-1.0.0-linux.AppImage",
                    "size": 16777216,
                    "checksum": "c3d4e5f6a1b2"
                },
                "web": {
                    "filename": "cmdr-1.0.0-web.tar.gz",
                    "size": 5242880,
                    "checksum": "d4e5f6a1b2c3"
                }
            }
        }
    }
}

def load_release_config() -> dict:
    """Load release configuration from file or return default"""
    try:
        if os.path.exists(RELEASE_CONFIG_FILE):
            with open(RELEASE_CONFIG_FILE, 'r') as f:
                return json.load(f)
        else:
            # Create default config file
            os.makedirs(os.path.dirname(RELEASE_CONFIG_FILE), exist_ok=True)
            save_release_config(DEFAULT_RELEASE_CONFIG)
            return DEFAULT_RELEASE_CONFIG
    except Exception as e:
        print(f"Error loading release config: {e}")
        return DEFAULT_RELEASE_CONFIG

def save_release_config(config: dict):
    """Save release configuration to file"""
    try:
        os.makedirs(os.path.dirname(RELEASE_CONFIG_FILE), exist_ok=True)
        with open(RELEASE_CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        print(f"Error saving release config: {e}")

def compare_versions(version1: str, version2: str) -> int:
    """Compare two semantic versions. Returns -1, 0, or 1"""
    try:
        v1_parts = [int(x) for x in version1.split('.')]
        v2_parts = [int(x) for x in version2.split('.')]
        
        # Pad with zeros if needed
        max_len = max(len(v1_parts), len(v2_parts))
        v1_parts.extend([0] * (max_len - len(v1_parts)))
        v2_parts.extend([0] * (max_len - len(v2_parts)))
        
        for i in range(max_len):
            if v1_parts[i] < v2_parts[i]:
                return -1
            elif v1_parts[i] > v2_parts[i]:
                return 1
        return 0
    except:
        # Fallback to string comparison
        if version1 < version2:
            return -1
        elif version1 > version2:
            return 1
        return 0

def is_mandatory_update(current_version: str, latest_version: str, release_config: dict) -> bool:
    """Determine if update is mandatory based on version rules"""
    try:
        # Check if this specific version is marked as mandatory
        if latest_version in release_config.get("releases", {}):
            release_info = release_config["releases"][latest_version]
            if release_info.get("mandatory", False):
                return True
        
        # Check for major version difference (force update for major versions)
        current_major = int(current_version.split('.')[0])
        latest_major = int(latest_version.split('.')[0])
        
        return latest_major > current_major
    except:
        return False

def get_file_size(file_path: str) -> int:
    """Get file size, return 0 if file doesn't exist"""
    try:
        return os.path.getsize(file_path) if os.path.exists(file_path) else 0
    except:
        return 0

def calculate_checksum(file_path: str) -> str:
    """Calculate SHA256 checksum of file"""
    try:
        if not os.path.exists(file_path):
            return ""
        
        hash_sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()[:12]  # First 12 characters
    except:
        return ""

@router.get("/check", response_model=UpdateResponse)
async def check_for_updates(
    current_version: str = Header(..., alias="Current-Version"),
    platform: str = Header(..., alias="Platform"),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Check if updates are available for the given version and platform"""
    try:
        # Load current release configuration
        release_config = load_release_config()
        latest_version = release_config.get("latest_version", CURRENT_VERSION)
        
        # Compare versions
        if compare_versions(current_version, latest_version) >= 0:
            return UpdateResponse(updateAvailable=False)
        
        # Get release information
        releases = release_config.get("releases", {})
        if latest_version not in releases:
            return UpdateResponse(updateAvailable=False)
        
        release_info = releases[latest_version]
        
        # Get platform-specific file info
        platform_files = release_info.get("files", {})
        if platform not in platform_files:
            # Default to web if platform not found
            platform = "web"
        
        if platform not in platform_files:
            return UpdateResponse(updateAvailable=False)
        
        file_info = platform_files[platform]
        file_path = os.path.join(RELEASES_DIR, latest_version, file_info["filename"])
        
        # Check if file exists and get actual size/checksum
        actual_size = get_file_size(file_path)
        actual_checksum = calculate_checksum(file_path)
        
        # Use actual values if file exists, otherwise use configured values
        file_size = actual_size if actual_size > 0 else file_info.get("size", 0)
        checksum = actual_checksum if actual_checksum else file_info.get("checksum", "")
        
        # Determine if update is mandatory
        mandatory = is_mandatory_update(current_version, latest_version, release_config)
        
        update_info = UpdateInfo(
            version=latest_version,
            downloadUrl=f"/api/version/download/{latest_version}/{platform}",
            releaseNotes=release_info.get("release_notes", "Bug fixes and improvements"),
            mandatory=mandatory,
            size=file_size,
            checksum=checksum
        )
        
        return UpdateResponse(
            updateAvailable=True,
            update=update_info
        )
        
    except Exception as e:
        print(f"Error checking for updates: {e}")
        return UpdateResponse(updateAvailable=False)

@router.get("/download/{version}/{platform}")
async def download_update(
    version: str, 
    platform: str,
    current_user: Optional[User] = Depends(get_current_user)
):
    """Download update file for specified version and platform"""
    try:
        # Load release configuration
        release_config = load_release_config()
        releases = release_config.get("releases", {})
        
        if version not in releases:
            raise HTTPException(status_code=404, detail="Version not found")
        
        release_info = releases[version]
        platform_files = release_info.get("files", {})
        
        if platform not in platform_files:
            raise HTTPException(status_code=404, detail="Platform not supported")
        
        file_info = platform_files[platform]
        filename = file_info["filename"]
        file_path = os.path.join(RELEASES_DIR, version, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Update file not found")
        
        return FileResponse(
            file_path,
            media_type='application/octet-stream',
            filename=filename,
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "X-File-Checksum": file_info.get("checksum", ""),
                "X-File-Version": version
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error downloading update: {e}")
        raise HTTPException(status_code=500, detail="Download failed")

@router.get("/info/{version}")
async def get_version_info(version: str):
    """Get detailed information about a specific version"""
    try:
        release_config = load_release_config()
        releases = release_config.get("releases", {})
        
        if version not in releases:
            raise HTTPException(status_code=404, detail="Version not found")
        
        return releases[version]
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting version info: {e}")
        raise HTTPException(status_code=500, detail="Failed to get version info")

@router.post("/config")
async def update_release_config(
    config: dict,
    current_user: User = Depends(get_current_user)
):
    """Update release configuration (admin only)"""
    # TODO: Add admin role check
    try:
        save_release_config(config)
        return {"message": "Release configuration updated successfully"}
    except Exception as e:
        print(f"Error updating release config: {e}")
        raise HTTPException(status_code=500, detail="Failed to update configuration")

@router.get("/current")
async def get_current_version():
    """Get current server version"""
    return {
        "version": CURRENT_VERSION,
        "build_date": "2025-07-01T00:00:00Z",
        "git_commit": "initial"
    }
