import os
import shutil
import json
from pathlib import Path

# Configuration
RELEASES_DIR = Path("releases")
VERSION = "1.0.0"

def create_release_structure():
    """Create the releases directory structure"""
    version_dir = RELEASES_DIR / VERSION
    version_dir.mkdir(parents=True, exist_ok=True)
    
    # Create mock release files (in production these would be actual builds)
    release_files = {
        "windows": f"cmdr-{VERSION}-windows.exe",
        "macos": f"cmdr-{VERSION}-macos.dmg", 
        "linux": f"cmdr-{VERSION}-linux.AppImage",
        "web": f"cmdr-{VERSION}-web.tar.gz"
    }
    
    for platform, filename in release_files.items():
        file_path = version_dir / filename
        if not file_path.exists():
            # Create mock file with some content
            with open(file_path, 'wb') as f:
                # Write some dummy data to simulate a real file
                dummy_data = f"Mock CMDR {VERSION} for {platform}".encode() * 1000
                f.write(dummy_data)
            print(f"Created mock release file: {file_path}")
    
    # Create release config
    config = {
        "latest_version": VERSION,
        "releases": {
            VERSION: {
                "mandatory": False,
                "release_notes": f"CMDR v{VERSION} Release\n• Initial production release\n• Auto-update system\n• Web-based terminal sharing\n• Session persistence\n• Multi-platform support",
                "files": {}
            }
        }
    }
    
    # Calculate file sizes and add to config
    for platform, filename in release_files.items():
        file_path = version_dir / filename
        file_size = file_path.stat().st_size if file_path.exists() else 0
        
        config["releases"][VERSION]["files"][platform] = {
            "filename": filename,
            "size": file_size,
            "checksum": f"mock_checksum_{platform}"
        }
    
    # Save config
    config_path = RELEASES_DIR / "release-config.json"
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"Created release configuration: {config_path}")
    return config

def update_version(new_version, mandatory=False):
    """Update to a new version"""
    config_path = RELEASES_DIR / "release-config.json"
    
    if config_path.exists():
        with open(config_path, 'r') as f:
            config = json.load(f)
    else:
        config = {"latest_version": "1.0.0", "releases": {}}
    
    # Update latest version
    config["latest_version"] = new_version
    
    # Create new version entry
    version_dir = RELEASES_DIR / new_version
    version_dir.mkdir(parents=True, exist_ok=True)
    
    config["releases"][new_version] = {
        "mandatory": mandatory,
        "release_notes": f"CMDR v{new_version} Update\n• Bug fixes and improvements\n• Performance enhancements\n• New features",
        "files": {
            "windows": {
                "filename": f"cmdr-{new_version}-windows.exe",
                "size": 16777216,  # 16MB
                "checksum": f"checksum_{new_version}_windows"
            },
            "macos": {
                "filename": f"cmdr-{new_version}-macos.dmg",
                "size": 20971520,  # 20MB
                "checksum": f"checksum_{new_version}_macos"
            },
            "linux": {
                "filename": f"cmdr-{new_version}-linux.AppImage",
                "size": 18874368,  # 18MB
                "checksum": f"checksum_{new_version}_linux"
            },
            "web": {
                "filename": f"cmdr-{new_version}-web.tar.gz",
                "size": 5242880,  # 5MB
                "checksum": f"checksum_{new_version}_web"
            }
        }
    }
    
    # Save updated config
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"Updated to version {new_version} (mandatory: {mandatory})")

def list_releases():
    """List all available releases"""
    config_path = RELEASES_DIR / "release-config.json"
    
    if not config_path.exists():
        print("No releases found. Run 'setup' first.")
        return
    
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    print(f"Latest version: {config.get('latest_version', 'Unknown')}")
    print("\nAvailable releases:")
    
    for version, info in config.get('releases', {}).items():
        mandatory = " (MANDATORY)" if info.get('mandatory', False) else ""
        print(f"  {version}{mandatory}")
        print(f"    {info.get('release_notes', '').split(chr(10))[0]}")

def main():
    import sys
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python release_manager.py setup                    # Create initial release structure")
        print("  python release_manager.py update <version> [--mandatory]  # Add new version")
        print("  python release_manager.py list                     # List all releases")
        print("  python release_manager.py clean                    # Clean up releases")
        return
    
    command = sys.argv[1]
    
    if command == "setup":
        print("Setting up release structure...")
        config = create_release_structure()
        print("Setup complete!")
        print(f"Latest version: {config['latest_version']}")
        
    elif command == "update":
        if len(sys.argv) < 3:
            print("Usage: python release_manager.py update <version> [--mandatory]")
            return
        
        new_version = sys.argv[2]
        mandatory = "--mandatory" in sys.argv
        update_version(new_version, mandatory)
        
    elif command == "list":
        list_releases()
        
    elif command == "clean":
        if RELEASES_DIR.exists():
            shutil.rmtree(RELEASES_DIR)
            print("Cleaned up releases directory")
        else:
            print("No releases directory found")
    
    else:
        print(f"Unknown command: {command}")

if __name__ == "__main__":
    main()
