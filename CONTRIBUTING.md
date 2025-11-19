# Contributing to DeepRef

Thank you for your interest in contributing to DeepRef! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Security](#security)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

### Prerequisites

- Node.js 20+ and npm 10+
- Docker 27+ and Docker Compose
- Git
- PostgreSQL 16+ (for local development without Docker)
- Redis 7+ (for local development without Docker)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/AiDeepRef.git
   cd AiDeepRef
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/AiDeepRef.git
   ```

## Development Setup

### Option 1: Docker (Recommended)

1. Copy environment files:
   ```bash
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

2. Start the development environment:
   ```bash
   npm run dev:docker:build
   ```

3. Access the applications:
   - Web: http://localhost:4200
   - API: http://localhost:3000
   - Adminer (DB): http://localhost:8080

### Option 2: Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables (see .env.example files)

3. Start PostgreSQL and Redis locally

4. Run database migrations:
   ```bash
   npm run migration:run
   ```

5. Start development servers:
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/[name]` - New features
- `fix/[name]` - Bug fixes
- `docs/[name]` - Documentation updates

### Creating a Feature Branch

```bash
git checkout develop
git pull upstream develop
git checkout -b feature/your-feature-name
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Avoid `any` types
- Use interfaces for object shapes
- Use enums for fixed sets of values

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Check formatting
npm run format:check

# Fix formatting
npm run format

# Lint code
npm run lint

# Fix lint issues
npm run lint:fix
```

### Security Guidelines

- Never commit secrets or credentials
- Use environment variables for configuration
- Sanitize all user inputs
- Use parameterized queries for database operations
- Follow OWASP security best practices
- Run security scans before committing:
  ```bash
  npm run security:scan
  ```

## Testing Guidelines

### Unit Tests

- Write unit tests for all business logic
- Aim for >80% code coverage
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

```bash
# Run all tests
npm test

# Run API tests
npm run test:api

# Run Web tests
npm run test:web

# Run with coverage
npm run test:api:cov
npm run test:web:cov
```

### E2E Tests

- Write E2E tests for critical user flows
- Test happy paths and edge cases
- Use realistic test data

```bash
npm run test:api:e2e
```

### Integration Tests

- Test API endpoints
- Test database interactions
- Test external service integrations

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
type(scope): subject

[optional body]

[optional footer]
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks
- `perf` - Performance improvements
- `ci` - CI/CD changes
- `build` - Build system changes

### Examples

```
feat(api): add user authentication endpoint

fix(web): resolve infinite loop in document parser

docs: update installation instructions

refactor(api): simplify reference validation logic
```

### Git Hooks

Pre-commit hooks automatically run:
- Linting
- Formatting
- Type checking

Pre-push hooks automatically run:
- All tests
- Security scanning

## Pull Request Process

### Before Submitting

1. Ensure all tests pass:
   ```bash
   npm test
   ```

2. Run security scans:
   ```bash
   npm run security:scan
   ```

3. Update documentation if needed

4. Rebase on latest develop:
   ```bash
   git fetch upstream
   git rebase upstream/develop
   ```

### PR Requirements

- Clear, descriptive title
- Detailed description of changes
- Link to related issues
- Screenshots for UI changes
- All CI checks must pass
- At least one approving review
- No merge conflicts

### PR Template

When creating a PR, include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally
- [ ] Security scan passed
```

## Code Review Guidelines

### As a Reviewer

- Be respectful and constructive
- Focus on the code, not the person
- Explain reasoning behind suggestions
- Approve when satisfied, request changes when needed

### As an Author

- Respond to all comments
- Make requested changes or discuss alternatives
- Keep PRs focused and reasonably sized
- Be open to feedback

## Development Commands

```bash
# Development
npm run dev              # Start both API and Web in development mode
npm run dev:api          # Start only API
npm run dev:web          # Start only Web
npm run dev:docker       # Start with Docker Compose

# Building
npm run build            # Build both applications
npm run build:api        # Build API
npm run build:web        # Build Web

# Testing
npm test                 # Run all tests
npm run test:api         # Run API tests
npm run test:web         # Run Web tests
npm run test:api:e2e     # Run API E2E tests

# Code Quality
npm run lint             # Lint all code
npm run lint:fix         # Fix linting issues
npm run format           # Format code with Prettier
npm run typecheck        # Run TypeScript type checking

# Security
npm run security:scan    # Run all security scans
npm run security:semgrep # Run Semgrep SAST
npm run security:snyk    # Run Snyk dependency scan
npm run security:audit   # Run npm audit
npm run security:secrets # Scan for secrets

# Docker
npm run docker:build     # Build Docker images
npm run docker:up        # Start Docker containers
npm run docker:down      # Stop Docker containers
npm run docker:logs      # View Docker logs

# Database
npm run migration:create # Create new migration
npm run migration:run    # Run migrations
npm run migration:revert # Revert last migration

# Cleanup
npm run clean            # Clean build artifacts
npm run clean:all        # Deep clean (including node_modules)
```

## Project Structure

```
AiDeepRef/
├── apps/
│   ├── api/              # NestJS backend
│   │   ├── src/
│   │   ├── test/
│   │   └── package.json
│   ├── web/              # Angular frontend
│   │   ├── src/
│   │   ├── test/
│   │   └── package.json
│   └── mobile/           # React Native (future)
├── libs/                 # Shared libraries
├── infrastructure/
│   ├── docker/           # Docker configurations
│   └── k8s/              # Kubernetes manifests
├── .github/
│   └── workflows/        # GitHub Actions
├── files/
│   ├── architecture/     # Architecture documents
│   └── research_notes/   # Development notes
└── package.json          # Root package.json (monorepo)
```

## Getting Help

- Check existing issues and pull requests
- Read the documentation in `/docs`
- Ask questions in discussions
- Join our community chat (if available)

## License

By contributing to DeepRef, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be recognized in our README.md and release notes.

Thank you for contributing to DeepRef!
