# DeepRef Development Setup Guide

Complete guide to setting up your development environment for DeepRef.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)
- [IDE Setup](#ide-setup)

## Prerequisites

### Required Software

1. **Node.js and npm**
   - Version: Node.js 20+ and npm 10+
   - Download: https://nodejs.org/
   - Verify installation:
     ```bash
     node --version  # Should be v20.x.x or higher
     npm --version   # Should be 10.x.x or higher
     ```

2. **Docker and Docker Compose**
   - Version: Docker 27+
   - Download: https://www.docker.com/products/docker-desktop
   - Verify installation:
     ```bash
     docker --version         # Should be 27.x.x or higher
     docker-compose --version # Should be 2.x.x or higher
     ```

3. **Git**
   - Download: https://git-scm.com/
   - Verify installation:
     ```bash
     git --version
     ```

### Optional Software

For local development without Docker:

- **PostgreSQL 16+**: https://www.postgresql.org/download/
- **Redis 7+**: https://redis.io/download

## Installation

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/YOUR_ORG/AiDeepRef.git
cd AiDeepRef

# If you forked the repo, clone your fork instead
git clone https://github.com/YOUR_USERNAME/AiDeepRef.git
cd AiDeepRef

# Add upstream remote (if you forked)
git remote add upstream https://github.com/YOUR_ORG/AiDeepRef.git
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# This will:
# - Install root dependencies
# - Install API dependencies
# - Install Web dependencies
# - Set up Git hooks (Husky)
```

### 3. Set Up Environment Variables

```bash
# Copy environment templates
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Edit the .env files with your local configuration
# Use your preferred editor (vim, nano, code, etc.)
code apps/api/.env  # VS Code example
```

#### API Environment Variables

Edit `apps/api/.env` and update:

```env
# Database - Update if not using Docker
DATABASE_URL=postgresql://deepref:your_password@localhost:5432/deepref

# JWT - Generate secure secrets
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here

# OpenAI - Add your API key
OPENAI_API_KEY=sk-your-actual-openai-api-key

# External APIs - Add your keys
SEMANTIC_SCHOLAR_API_KEY=your_semantic_scholar_api_key
```

#### Web Environment Variables

Edit `apps/web/.env` (usually works with defaults):

```env
API_URL=http://localhost:3000
```

## Configuration

### Option A: Docker Setup (Recommended)

Best for most developers. Provides isolated environment with all services.

```bash
# Start all services
npm run dev:docker:build

# This starts:
# - PostgreSQL database (port 5432)
# - Redis cache (port 6379)
# - API server (port 3000)
# - Web application (port 4200)
# - Adminer DB admin (port 8080)
```

**Access Points:**
- Web App: http://localhost:4200
- API: http://localhost:3000
- API Docs (Swagger): http://localhost:3000/api
- Adminer (DB): http://localhost:8080

**Adminer Login:**
- System: PostgreSQL
- Server: postgres
- Username: deepref
- Password: deepref_dev_password
- Database: deepref

### Option B: Local Development Setup

For developers who prefer running services locally.

#### 1. Start Database Services

**PostgreSQL:**
```bash
# macOS (Homebrew)
brew services start postgresql@16

# Ubuntu/Debian
sudo systemctl start postgresql

# Create database
createdb deepref
createdb deepref_test  # for testing
```

**Redis:**
```bash
# macOS (Homebrew)
brew services start redis

# Ubuntu/Debian
sudo systemctl start redis
```

#### 2. Run Migrations

```bash
npm run migration:run
```

#### 3. Start Development Servers

```bash
# Start both API and Web
npm run dev

# Or start individually
npm run dev:api  # API only
npm run dev:web  # Web only
```

## Running the Application

### Development Mode

```bash
# Option 1: Docker (full stack)
npm run dev:docker

# Option 2: Local (API + Web)
npm run dev

# Option 3: Individual services
npm run dev:api  # API only on port 3000
npm run dev:web  # Web only on port 4200
```

### Building for Production

```bash
# Build both applications
npm run build

# Build individually
npm run build:api
npm run build:web
```

### Running Tests

```bash
# Run all tests
npm test

# Run API tests
npm run test:api
npm run test:api:e2e
npm run test:api:cov

# Run Web tests
npm run test:web
npm run test:web:cov
```

### Code Quality Checks

```bash
# Lint code
npm run lint
npm run lint:fix

# Format code
npm run format
npm run format:check

# Type checking
npm run typecheck
```

### Security Scanning

```bash
# Run all security scans
npm run security:scan

# Individual scans
npm run security:semgrep  # SAST scanning
npm run security:snyk     # Dependency scanning
npm run security:audit    # npm audit
npm run security:secrets  # Secret detection
```

## Development Workflow

### Daily Development

1. **Pull Latest Changes**
   ```bash
   git checkout develop
   git pull upstream develop
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Start Development Environment**
   ```bash
   npm run dev:docker  # or npm run dev
   ```

4. **Make Changes**
   - Edit code in your IDE
   - Hot reload will automatically refresh
   - Check console for errors

5. **Run Tests**
   ```bash
   npm test
   ```

6. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat(scope): your commit message"
   # Pre-commit hooks will automatically run
   ```

7. **Push Changes**
   ```bash
   git push origin feature/your-feature-name
   # Pre-push hooks will run tests
   ```

### Database Management

```bash
# Create a new migration
npm run migration:create -- CreateUsersTable

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Reset database (Docker)
npm run docker:clean
npm run dev:docker:build
```

### Docker Management

```bash
# Start services
npm run docker:up

# Stop services
npm run docker:down

# View logs
npm run docker:logs

# Rebuild containers
npm run dev:docker:build

# Clean everything (removes volumes)
npm run docker:clean
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker ps  # If using Docker

# Check connection string in apps/api/.env
# Should match Docker service or local PostgreSQL

# Reset database (Docker)
npm run docker:clean
npm run dev:docker:build
```

### Module Not Found Errors

```bash
# Clear and reinstall dependencies
npm run clean:all
npm install

# Clear Docker volumes
npm run docker:clean
npm run dev:docker:build
```

### Git Hooks Failing

```bash
# Reinstall Husky
rm -rf .husky
npm run prepare

# Skip hooks temporarily (not recommended)
git commit --no-verify
```

### Build Failures

```bash
# Clear build artifacts
npm run clean

# Rebuild
npm run build

# Check for TypeScript errors
npm run typecheck
```

## IDE Setup

### Visual Studio Code

Recommended extensions:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "angular.ng-template",
    "ms-vscode.vscode-typescript-next",
    "firsttris.vscode-jest-runner",
    "ms-azuretools.vscode-docker",
    "redhat.vscode-yaml",
    "editorconfig.editorconfig"
  ]
}
```

Settings (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### IntelliJ IDEA / WebStorm

1. Enable ESLint:
   - Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
   - Check "Automatic ESLint configuration"

2. Enable Prettier:
   - Settings → Languages & Frameworks → JavaScript → Prettier
   - Check "On save" and "On code reformat"

3. Configure TypeScript:
   - Settings → Languages & Frameworks → TypeScript
   - Use TypeScript from project: `node_modules/typescript/lib`

## Project Structure

```
AiDeepRef/
├── .github/              # GitHub Actions workflows
├── .husky/               # Git hooks
├── apps/
│   ├── api/              # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   ├── common/
│   │   │   └── main.ts
│   │   ├── test/
│   │   └── package.json
│   ├── web/              # Angular frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── assets/
│   │   │   └── environments/
│   │   └── package.json
│   └── mobile/           # React Native (future)
├── libs/                 # Shared libraries
│   ├── shared/
│   └── types/
├── infrastructure/
│   ├── docker/           # Docker configs
│   └── k8s/              # Kubernetes manifests
├── docs/                 # Documentation
├── files/
│   ├── architecture/
│   └── research_notes/
├── .env.example          # Environment template
├── package.json          # Root package.json
├── tsconfig.json         # TypeScript config
├── .eslintrc.json        # ESLint config
└── .prettierrc           # Prettier config
```

## Next Steps

After setup:

1. Review [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines
2. Check [SECURITY.md](../SECURITY.md) for security practices
3. Explore the API documentation at http://localhost:3000/api
4. Join our development community

## Getting Help

- Check [GitHub Issues](https://github.com/YOUR_ORG/AiDeepRef/issues)
- Read the [FAQ](./FAQ.md)
- Join our [Discord/Slack](LINK)
- Email: dev@deepref.com

---

Happy coding!
