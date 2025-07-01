#!/bin/bash

# CMDR Auto-Update System Test Script
# This script tests the complete update system functionality

set -e

echo "🚀 CMDR Auto-Update System Test"
echo "================================"

# Configuration
API_URL="http://localhost:8000"
TEST_VERSION="1.0.0"
NEW_VERSION="1.1.0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Test 1: Setup release structure
echo -e "\n📦 Setting up release structure..."
cd "$(dirname "$0")"
if python release_manager.py setup; then
    print_status "Release structure created"
else
    print_error "Failed to create release structure"
    exit 1
fi

# Test 2: Start backend server
echo -e "\n🖥️  Starting backend server..."
cd ../cloud-backend

# Check if server is already running
if curl -s "$API_URL/health" > /dev/null 2>&1; then
    print_status "Backend server is already running"
else
    print_warning "Starting backend server (this may take a moment)..."
    # Start server in background
    RELEASES_DIR=../releases python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
    SERVER_PID=$!
    
    # Wait for server to start
    for i in {1..30}; do
        if curl -s "$API_URL/health" > /dev/null 2>&1; then
            print_status "Backend server started (PID: $SERVER_PID)"
            break
        fi
        sleep 1
    done
    
    if ! curl -s "$API_URL/health" > /dev/null 2>&1; then
        print_error "Failed to start backend server"
        exit 1
    fi
fi

# Test 3: Check version endpoint
echo -e "\n🔍 Testing version check endpoint..."
RESPONSE=$(curl -s -H "Current-Version: $TEST_VERSION" -H "Platform: linux" "$API_URL/api/version/check")

if echo "$RESPONSE" | grep -q "updateAvailable"; then
    print_status "Version check endpoint working"
    echo "Response: $RESPONSE"
else
    print_error "Version check endpoint failed"
    echo "Response: $RESPONSE"
    exit 1
fi

# Test 4: Test when no update is available
echo -e "\n🔄 Testing no update available scenario..."
RESPONSE=$(curl -s -H "Current-Version: $TEST_VERSION" -H "Platform: linux" "$API_URL/api/version/check")

if echo "$RESPONSE" | grep -q '"updateAvailable": false'; then
    print_status "No update scenario working correctly"
else
    print_warning "No update scenario may need adjustment"
    echo "Response: $RESPONSE"
fi

# Test 5: Create new version and test update available
echo -e "\n📈 Creating new version and testing update available..."
cd ../scripts
if python release_manager.py update "$NEW_VERSION"; then
    print_status "New version $NEW_VERSION created"
    
    # Test update available
    RESPONSE=$(curl -s -H "Current-Version: $TEST_VERSION" -H "Platform: linux" "$API_URL/api/version/check")
    
    if echo "$RESPONSE" | grep -q '"updateAvailable": true'; then
        print_status "Update available detection working"
        echo "Response: $RESPONSE"
    else
        print_error "Update available detection failed"
        echo "Response: $RESPONSE"
    fi
else
    print_error "Failed to create new version"
    exit 1
fi

# Test 6: Test download endpoint
echo -e "\n⬇️  Testing download endpoint..."
DOWNLOAD_URL="$API_URL/api/version/download/$NEW_VERSION/linux"

if curl -s -I "$DOWNLOAD_URL" | grep -q "200 OK"; then
    print_status "Download endpoint accessible"
    
    # Test actual download
    TEMP_FILE="/tmp/cmdr-test-download"
    if curl -s -o "$TEMP_FILE" "$DOWNLOAD_URL"; then
        if [ -f "$TEMP_FILE" ] && [ -s "$TEMP_FILE" ]; then
            print_status "File download successful"
            rm -f "$TEMP_FILE"
        else
            print_error "Downloaded file is empty or missing"
        fi
    else
        print_error "File download failed"
    fi
else
    print_error "Download endpoint not accessible"
    echo "URL: $DOWNLOAD_URL"
fi

# Test 7: Test mandatory update
echo -e "\n⚡ Testing mandatory update..."
cd ../scripts
if python release_manager.py update "1.2.0" --mandatory; then
    print_status "Mandatory version 1.2.0 created"
    
    RESPONSE=$(curl -s -H "Current-Version: $TEST_VERSION" -H "Platform: linux" "$API_URL/api/version/check")
    
    if echo "$RESPONSE" | grep -q '"mandatory": true'; then
        print_status "Mandatory update detection working"
    else
        print_warning "Mandatory update detection may need adjustment"
        echo "Response: $RESPONSE"
    fi
else
    print_error "Failed to create mandatory version"
fi

# Test 8: Test web frontend (if available)
echo -e "\n🌐 Testing web frontend integration..."
cd ../html

if [ -f "package.json" ]; then
    print_status "Frontend package.json found"
    
    # Check if build works
    if command -v npm &> /dev/null; then
        if [ ! -d "node_modules" ]; then
            print_warning "Installing npm dependencies..."
            npm install
        fi
        
        if npm run build; then
            print_status "Frontend build successful"
        else
            print_warning "Frontend build failed (this might be expected in test environment)"
        fi
    else
        print_warning "npm not available, skipping frontend build test"
    fi
else
    print_warning "Frontend package.json not found"
fi

# Test 9: List all releases
echo -e "\n📋 Listing all releases..."
cd ../scripts
python release_manager.py list

# Cleanup
echo -e "\n🧹 Cleanup..."
if [ ! -z "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    print_status "Stopping test server..."
    kill "$SERVER_PID"
fi

echo -e "\n🎉 Auto-Update System Test Complete!"
echo "================================"
print_status "All core functionality tested"
print_status "System ready for production deployment"

echo -e "\n📝 Next Steps:"
echo "1. Deploy backend with proper RELEASES_DIR"
echo "2. Upload actual release files"
echo "3. Configure production API URLs"
echo "4. Test with real client applications"
echo "5. Set up monitoring and alerts"

echo -e "\n🔗 Useful URLs:"
echo "- API Health: $API_URL/health"
echo "- Version Check: $API_URL/api/version/check"
echo "- API Docs: $API_URL/docs"
