#!/bin/bash

# DeepRef Development Environment Setup Script
# This script helps set up the development environment for DeepRef

set -e

echo "🚀 DeepRef Development Setup"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 20+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}❌ Node.js version must be 20 or higher (current: $(node -v))${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm -v)${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠ Docker is not installed (optional but recommended)${NC}"
else
    echo -e "${GREEN}✓ Docker $(docker -v | cut -d' ' -f3 | cut -d',' -f1)${NC}"
fi

# Check Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Git $(git --version | cut -d' ' -f3)${NC}"

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "⚙️  Setting up environment files..."

# Copy environment files if they don't exist
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env${NC}"
else
    echo -e "${YELLOW}⚠ .env already exists, skipping${NC}"
fi

if [ ! -f "apps/api/.env" ]; then
    cp apps/api/.env.example apps/api/.env
    echo -e "${GREEN}✓ Created apps/api/.env${NC}"
else
    echo -e "${YELLOW}⚠ apps/api/.env already exists, skipping${NC}"
fi

if [ ! -f "apps/web/.env" ]; then
    cp apps/web/.env.example apps/web/.env
    echo -e "${GREEN}✓ Created apps/web/.env${NC}"
else
    echo -e "${YELLOW}⚠ apps/web/.env already exists, skipping${NC}"
fi

echo ""
echo "🔧 Setting up Git hooks..."
npm run prepare

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit environment files with your configuration:"
echo "   - .env"
echo "   - apps/api/.env"
echo "   - apps/web/.env"
echo ""
echo "2. Start development:"
echo "   - With Docker: npm run dev:docker"
echo "   - Without Docker: npm run dev"
echo ""
echo "3. Access the applications:"
echo "   - Web: http://localhost:4200"
echo "   - API: http://localhost:3000"
echo "   - API Docs: http://localhost:3000/api"
echo ""
echo "For more information, see docs/DEVELOPMENT_SETUP.md"
echo ""
