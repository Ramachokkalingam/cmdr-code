#!/bin/bash

# CMDR Cloud Setup Script
# This script helps set up the development environment for CMDR with cloud features

set -e

echo "🚀 CMDR Cloud Setup"
echo "==================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "CMakeLists.txt" ] || [ ! -f "cloud-backend/requirements.txt" ]; then
    echo -e "${RED}Error: Please run this script from the cmdr project root directory${NC}"
    exit 1
fi

echo -e "${BLUE}Checking prerequisites...${NC}"

# Check for required tools
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed${NC}"
        echo "Please install $1 and try again"
        exit 1
    fi
    echo -e "${GREEN}✓ $1 found${NC}"
}

check_command "docker"
check_command "docker-compose"
check_command "node"
check_command "npm"
check_command "python3"
check_command "pip3"

echo -e "${BLUE}Setting up environment files...${NC}"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cp .env.development .env
    echo -e "${GREEN}✓ Created .env file${NC}"
    echo -e "${YELLOW}Please edit .env file with your Firebase configuration${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Create cloud-backend .env file
if [ ! -f "cloud-backend/.env" ]; then
    echo -e "${YELLOW}Creating cloud-backend/.env file...${NC}"
    cp cloud-backend/.env.example cloud-backend/.env
    echo -e "${GREEN}✓ Created cloud-backend/.env file${NC}"
    echo -e "${YELLOW}Please edit cloud-backend/.env file with your configuration${NC}"
else
    echo -e "${GREEN}✓ cloud-backend/.env file already exists${NC}"
fi

echo -e "${BLUE}Installing frontend dependencies...${NC}"
cd html
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
cd ..

echo -e "${BLUE}Installing backend dependencies...${NC}"
cd cloud-backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating Python virtual environment...${NC}"
    python3 -m venv venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
fi

# Activate virtual environment and install dependencies
echo -e "${YELLOW}Installing Python dependencies...${NC}"
source venv/bin/activate
pip install -r requirements.txt
echo -e "${GREEN}✓ Python dependencies installed${NC}"
cd ..

echo -e "${BLUE}Setting up database...${NC}"

# Check if PostgreSQL is running via Docker
if ! docker ps | grep -q postgres; then
    echo -e "${YELLOW}Starting PostgreSQL with Docker...${NC}"
    docker run -d \
        --name cmdr-postgres \
        -e POSTGRES_DB=cmdr \
        -e POSTGRES_USER=cmdr \
        -e POSTGRES_PASSWORD=password \
        -p 5432:5432 \
        postgres:13
    
    echo -e "${YELLOW}Waiting for PostgreSQL to start...${NC}"
    sleep 10
    echo -e "${GREEN}✓ PostgreSQL started${NC}"
else
    echo -e "${GREEN}✓ PostgreSQL is already running${NC}"
fi

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
cd cloud-backend
source venv/bin/activate
alembic upgrade head
echo -e "${GREEN}✓ Database migrations completed${NC}"
cd ..

echo -e "${BLUE}Building CMDR...${NC}"

# Create build directory if it doesn't exist
if [ ! -d "build" ]; then
    mkdir build
fi

cd build
cmake ..
make -j$(nproc)
echo -e "${GREEN}✓ CMDR built successfully${NC}"
cd ..

echo
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo
echo -e "${BLUE}Next steps:${NC}"
echo "1. Edit .env files with your Firebase configuration:"
echo "   - .env (for frontend)"
echo "   - cloud-backend/.env (for backend)"
echo
echo "2. Set up Firebase project:"
echo "   - Create a Firebase project at https://console.firebase.google.com"
echo "   - Enable Authentication with Google provider"
echo "   - Download service account key and update FIREBASE_SERVICE_ACCOUNT_KEY_PATH"
echo
echo "3. Start the development environment:"
echo "   ${YELLOW}docker-compose -f docker-compose.dev.yml up${NC}"
echo
echo "4. Or start services individually:"
echo "   Backend: ${YELLOW}cd cloud-backend && source venv/bin/activate && uvicorn app.main:app --reload${NC}"
echo "   Frontend: ${YELLOW}cd html && npm run dev${NC}"
echo "   CMDR: ${YELLOW}./build/cmdr --port 6969${NC}"
echo
echo -e "${BLUE}Documentation:${NC}"
echo "- Frontend: http://localhost:6969"
echo "- Backend API: http://localhost:8000/docs"
echo "- Cloud Backend README: cloud-backend/README.md"
echo
echo -e "${GREEN}Happy coding! 🚀${NC}"
