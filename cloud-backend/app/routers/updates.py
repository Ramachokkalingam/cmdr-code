from fastapi import APIRouter, Header, HTTPException, Depends, Query
from fastapi.responses import FileResponse
from ..schemas import UpdateResponse, UpdateInfo, User
from ..auth import get_current_user
import os
import json
import hashlib
from typing import Optional
import semver
import subprocess
import asyncio
from datetime import datetime

router = APIRouter(prefix="/version", tags=["updates"])

# Additional router for C client compatibility
api_router = APIRouter(prefix="/api", tags=["updates-api"])

# Configuration - In production, these should come from environment variables
RELEASES_DIR = os.getenv("RELEASES_DIR", "/app/releases")
CURRENT_VERSION = "1.2.0"  # Updated version
GITHUB_REPO = "Ramachokkalingam/cmdr-code"
DOWNLOAD_BASE_URL = f"https://github.com/{GITHUB_REPO}/releases/download"

# Platform mapping for C client
PLATFORM_MAPPING = {
    "linux": "linux-x86_64",
    "windows": "windows-x86_64.exe", 
    "macos": "macos-x86_64",
    "darwin": "macos-x86_64"
}

# Mock release data for C client compatibility
RELEASES = {
    "1.2.0": {
        "version": "1.2.0",
        "releaseDate": "2025-09-14T10:00:00Z",
        "critical": False,
        "changelog": """## What's New in v1.2.0

### Features
- 🚀 Auto-update system implementation
- 📱 Enhanced WebSocket protocol for real-time updates  
- 🔐 Improved session persistence
- 🎨 Better terminal UI with progress indicators

### Bug Fixes
- Fixed memory leaks in terminal buffer management
- Resolved WebSocket connection issues on slow networks
- Fixed session restoration edge cases

### Performance
- 30% faster terminal rendering
- Reduced memory usage by 20%
- Optimized JSON parsing
        """,
        "downloadSizes": {
            "linux": 2048576,    # 2MB
            "windows": 2359296,  # 2.25MB  
            "macos": 2097152     # 2MB
        },
        "checksums": {
            "linux": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            "windows": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b856", 
            "macos": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b857"
        }
    },
    "1.1.0": {
        "version": "1.1.0", 
        "releaseDate": "2025-09-01T10:00:00Z",
        "critical": False,
        "changelog": "Previous version with basic functionality",
        "downloadSizes": {
            "linux": 1048576,
            "windows": 1310720,
            "macos": 1048576  
        },
        "checksums": {
            "linux": "d3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            "windows": "d3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b856",
            "macos": "d3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b857"
        }
    }
}

# Add C client compatible endpoints
@api_router.get("/test")
async def test_endpoint():
    """Simple test endpoint without authentication"""
    return {"status": "working", "message": "No auth required"}

@api_router.get("/version/check")
async def check_version_c_client(
    current_version: Optional[str] = Header(None, alias="X-Current-Version"),
    platform: Optional[str] = Header(None, alias="X-Platform"),
    user_agent: Optional[str] = Header(None, alias="User-Agent")
):
    """Check if an update is available for the C client"""
    if not current_version:
        raise HTTPException(400, "X-Current-Version header required")
    
    if not platform:
        raise HTTPException(400, "X-Platform header required")
    
    # Normalize platform
    normalized_platform = platform.lower()
    if normalized_platform not in PLATFORM_MAPPING:
        raise HTTPException(400, f"Unsupported platform: {platform}")
    
    try:
        # Compare versions using semantic versioning
        has_update = semver.compare(CURRENT_VERSION, current_version) > 0
    except ValueError:
        raise HTTPException(400, f"Invalid version format: {current_version}")
    
    if not has_update:
        return {
            "updateAvailable": False,
            "currentVersion": current_version,
            "latestVersion": CURRENT_VERSION,
            "message": "You are running the latest version"
        }
    
    # Get release info
    latest_release = RELEASES.get(CURRENT_VERSION)
    if not latest_release:
        raise HTTPException(500, "Release information not found")
    
    platform_file = PLATFORM_MAPPING[normalized_platform]
    download_url = f"{DOWNLOAD_BASE_URL}/v{CURRENT_VERSION}/cmdr-{platform_file}"
    
    return {
        "updateAvailable": True,
        "version": CURRENT_VERSION,
        "currentVersion": current_version,
        "downloadUrl": download_url,
        "downloadSize": latest_release["downloadSizes"].get(normalized_platform, 0),
        "checksum": latest_release["checksums"].get(normalized_platform),
        "changelog": latest_release["changelog"],
        "critical": latest_release["critical"],
        "releaseDate": latest_release["releaseDate"],
        "rolloutPercentage": 100
    }

@api_router.get("/version/download/{version}/{platform}")
async def download_version_c_client(version: str, platform: str):
    """Get download information for C client"""
    if version not in RELEASES:
        raise HTTPException(404, f"Version {version} not found")
    
    normalized_platform = platform.lower()
    if normalized_platform not in PLATFORM_MAPPING:
        raise HTTPException(400, f"Unsupported platform: {platform}")
    
    release = RELEASES[version]
    platform_file = PLATFORM_MAPPING[normalized_platform]
    download_url = f"{DOWNLOAD_BASE_URL}/v{version}/cmdr-{platform_file}"
    
    return {
        "version": version,
        "platform": platform,
        "downloadUrl": download_url,
        "downloadSize": release["downloadSizes"].get(normalized_platform, 0),
        "checksum": release["checksums"].get(normalized_platform),
        "releaseDate": release["releaseDate"]
    }
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

@router.post("/git/update")
async def git_update(
    update_request: dict,
    current_user: Optional[User] = Depends(get_current_user)
):
    """Perform git update from GitHub repository"""
    try:
        action = update_request.get("action", "pull")
        repository = update_request.get("repository", "origin")
        branch = update_request.get("branch", "main")
        
        # Get the project root directory (assuming the script is in cloud-backend/app/routers)
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
        
        # Change to project directory
        original_cwd = os.getcwd()
        os.chdir(project_root)
        
        result = {
            "success": False,
            "message": "",
            "output": "",
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            if action == "pull":
                # First, fetch the latest changes
                fetch_process = subprocess.run(
                    ["git", "fetch", repository],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if fetch_process.returncode != 0:
                    result["message"] = f"Git fetch failed: {fetch_process.stderr}"
                    return result
                
                # Then pull the changes
                pull_process = subprocess.run(
                    ["git", "pull", repository, branch],
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                
                if pull_process.returncode == 0:
                    result["success"] = True
                    result["message"] = "Git update successful"
                    result["output"] = pull_process.stdout
                    
                    # Also get the latest commit info
                    commit_process = subprocess.run(
                        ["git", "log", "-1", "--pretty=format:%H %s"],
                        capture_output=True,
                        text=True,
                        timeout=10
                    )
                    
                    if commit_process.returncode == 0:
                        result["latest_commit"] = commit_process.stdout
                        
                else:
                    result["message"] = f"Git pull failed: {pull_process.stderr}"
                    result["output"] = pull_process.stdout
                    
            else:
                result["message"] = f"Unsupported action: {action}"
                
        except subprocess.TimeoutExpired:
            result["message"] = "Git operation timed out"
        except Exception as e:
            result["message"] = f"Git operation failed: {str(e)}"
        finally:
            # Always restore the original working directory
            os.chdir(original_cwd)
        
        return result
        
    except Exception as e:
        print(f"Error in git update: {e}")
        raise HTTPException(status_code=500, detail=f"Git update failed: {str(e)}")

@router.get("/git/status")
async def git_status(current_user: Optional[User] = Depends(get_current_user)):
    """Get current git status and latest commit info"""
    try:
        # Get the project root directory
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
        
        # Change to project directory
        original_cwd = os.getcwd()
        os.chdir(project_root)
        
        result = {
            "current_branch": "",
            "latest_commit": "",
            "status": "",
            "remote_url": "",
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            # Get current branch
            branch_process = subprocess.run(
                ["git", "rev-parse", "--abbrev-ref", "HEAD"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if branch_process.returncode == 0:
                result["current_branch"] = branch_process.stdout.strip()
            
            # Get latest commit
            commit_process = subprocess.run(
                ["git", "log", "-1", "--pretty=format:%H %s (%cr)"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if commit_process.returncode == 0:
                result["latest_commit"] = commit_process.stdout.strip()
            
            # Get git status
            status_process = subprocess.run(
                ["git", "status", "--porcelain"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if status_process.returncode == 0:
                result["status"] = "clean" if not status_process.stdout.strip() else "modified"
            
            # Get remote URL
            remote_process = subprocess.run(
                ["git", "config", "--get", "remote.origin.url"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if remote_process.returncode == 0:
                result["remote_url"] = remote_process.stdout.strip()
                
        except subprocess.TimeoutExpired:
            result["error"] = "Git operation timed out"
        except Exception as e:
            result["error"] = f"Git operation failed: {str(e)}"
        finally:
            # Always restore the original working directory
            os.chdir(original_cwd)
        
        return result
        
    except Exception as e:
        print(f"Error getting git status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get git status: {str(e)}")
