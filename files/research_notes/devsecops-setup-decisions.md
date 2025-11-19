# DevSecOps Setup - Architecture & Design Decisions

**Date**: 2025-11-19
**Author**: DevSecOps Lead Agent
**Status**: Completed

## Overview

This document details all architecture and design decisions made during the DevSecOps infrastructure setup for DeepRef.

## Table of Contents

1. [Docker Configuration](#docker-configuration)
2. [CI/CD Pipeline](#cicd-pipeline)
3. [Security Scanning](#security-scanning)
4. [Development Workflow](#development-workflow)
5. [Git Hooks](#git-hooks)
6. [Environment Configuration](#environment-configuration)
7. [Documentation](#documentation)

---

## Docker Configuration

### Decision: Multi-stage Docker Builds

**Choice**: Implemented multi-stage builds for both API and Web applications

**Rationale**:
- **Smaller image sizes**: Production images don't include build tools
- **Security**: Fewer packages = smaller attack surface
- **Build caching**: Faster builds with layer caching
- **Separation of concerns**: Clear distinction between build and runtime

**Implementation**:
- Stage 1 (Builder): Node.js 20-alpine with build tools
- Stage 2 (Production): Minimal runtime environment

**Alternatives Considered**:
- Single-stage builds: Rejected due to larger image size
- Different base images (debian, ubuntu): Rejected in favor of alpine for size

### Decision: Nginx for Angular Frontend

**Choice**: Use Nginx 1.25-alpine to serve Angular application

**Rationale**:
- **Performance**: Nginx is highly optimized for static content
- **Security**: Well-maintained with good security track record
- **Features**: Built-in gzip, caching, security headers
- **Size**: Alpine variant keeps image small (~25MB)

**Configuration Highlights**:
- Gzip compression enabled
- Security headers (CSP, X-Frame-Options, etc.)
- Angular routing support (try_files)
- Health check endpoint

**Alternatives Considered**:
- serve (npm package): Less performant, larger image
- Apache: More overhead, unnecessary features

### Decision: Non-root User for API Container

**Choice**: Run API container as non-root user (nestjs:nodejs)

**Rationale**:
- **Security Best Practice**: Principle of least privilege
- **Container Security**: Prevents privilege escalation attacks
- **Compliance**: Required for many security audits

**Implementation**:
```dockerfile
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001
USER nestjs
```

### Decision: Docker Compose for Local Development

**Choice**: Comprehensive docker-compose.yml with all services

**Services Included**:
- PostgreSQL 16-alpine (database)
- Redis 7-alpine (cache)
- NestJS API (backend)
- Angular Web (frontend)
- Adminer (database management)

**Rationale**:
- **Developer Experience**: One command to start entire stack
- **Consistency**: Same environment for all developers
- **Isolation**: No conflicts with local installations
- **Production Parity**: Similar to production architecture

**Configuration Decisions**:
- Health checks for all services
- Volume mounts for hot-reloading in development
- Custom network for service isolation
- Named volumes for data persistence

---

## CI/CD Pipeline

### Decision: GitHub Actions for CI/CD

**Choice**: Use GitHub Actions for all automation

**Rationale**:
- **Integration**: Native GitHub integration
- **Cost**: Free for public repos, generous limits for private
- **Community**: Large ecosystem of actions
- **Features**: Matrix builds, artifacts, caching, environments

**Alternatives Considered**:
- Jenkins: Too complex for our needs
- CircleCI: Additional service to manage
- GitLab CI: Would require GitLab migration

### Decision: Three Separate Workflows

**Workflows**:
1. `ci.yml` - Continuous Integration
2. `security-scan.yml` - Security Scanning
3. `deploy-staging.yml` - Deployment

**Rationale**:
- **Separation of Concerns**: Each workflow has clear responsibility
- **Parallel Execution**: Security scans don't slow down CI
- **Flexibility**: Can trigger independently
- **Clarity**: Easier to understand and maintain

**Alternatives Considered**:
- Single monolithic workflow: Rejected due to complexity
- Per-app workflows: Would create duplication

### Decision: CI Workflow Structure

**Job Flow**:
```
lint-and-format → test-api → build-api → docker-build
                → test-web → build-web ↗
```

**Key Decisions**:
- **Parallel testing**: API and Web tests run concurrently
- **Fail fast**: Linting runs first to catch obvious issues
- **Artifact upload**: Build artifacts saved for debugging
- **Docker build cache**: GitHub Actions cache for faster builds
- **Service containers**: PostgreSQL and Redis for API tests

**Matrix Strategy**:
- Docker builds use matrix for API and Web
- Reduces duplication, maintains clarity

### Decision: Staging Deployment Workflow

**Trigger**: Push to `develop` branch or manual dispatch

**Flow**:
1. Build and push Docker images to GHCR
2. Deploy to Kubernetes staging namespace
3. Run database migrations
4. Execute smoke tests
5. Send Slack notification

**Rationale**:
- **Automation**: Reduces manual deployment errors
- **Testing**: Validates in staging before production
- **Rollback**: Easy to revert with container tags
- **Visibility**: Team notified of deployments

**Key Decisions**:
- Use GitHub Container Registry (GHCR) for images
- Environment protection rules for staging
- Smoke tests as quality gate
- Slack integration for team communication

---

## Security Scanning

### Decision: Multi-layer Security Approach

**Layers**:
1. **SAST**: Semgrep for static code analysis
2. **Dependency Scanning**: Snyk + npm audit
3. **Secret Scanning**: Gitleaks
4. **Container Scanning**: Trivy
5. **Dependency Review**: GitHub native

**Rationale**: Defense in depth - multiple tools catch different issues

### Decision: Semgrep for SAST

**Choice**: Semgrep with OWASP and security-focused rulesets

**Rationale**:
- **Speed**: Fast scanning, suitable for CI
- **Accuracy**: Low false-positive rate
- **Customization**: Easy to add custom rules
- **Coverage**: Excellent JavaScript/TypeScript support
- **Cost**: Free for open source

**Rulesets Used**:
- `p/security-audit` - General security issues
- `p/secrets` - Hardcoded secrets
- `p/owasp-top-ten` - OWASP vulnerabilities
- `p/javascript` - JS-specific issues
- `p/typescript` - TS-specific issues
- `p/nodejs` - Node.js best practices
- `p/react` - React security
- `p/docker` - Dockerfile security

**Alternatives Considered**:
- SonarQube: Too heavy, requires separate server
- CodeQL: Slower, less suitable for quick feedback
- ESLint security: Used in addition, not replacement

### Decision: Snyk for Dependency Scanning

**Choice**: Snyk with GitHub Security integration

**Rationale**:
- **Comprehensive Database**: Excellent vulnerability coverage
- **Fix Suggestions**: Provides remediation advice
- **Integration**: Works with GitHub Security tab
- **Monitoring**: Continuous monitoring of dependencies
- **Developer-Friendly**: Good CLI and API

**Configuration**:
- Scan all workspace packages
- Fail on high severity or above
- SARIF output for GitHub Security
- Weekly scheduled scans

**Alternatives Considered**:
- OWASP Dependency-Check: Slower, less accurate
- GitHub Dependabot: Used in addition, not replacement
- npm audit alone: Less comprehensive database

### Decision: Gitleaks for Secret Scanning

**Choice**: Gitleaks with custom configuration

**Rationale**:
- **Comprehensive**: Detects many secret types
- **Fast**: Suitable for pre-commit hooks
- **Configurable**: Custom rules and allowlists
- **No Cloud**: Runs locally, privacy preserved

**Custom Rules Added**:
- API keys (generic pattern)
- AWS credentials
- GitHub tokens
- Slack tokens
- Private keys
- JWT tokens

**Allowlist**:
- `.env.example` files
- Test passwords/secrets
- Documentation examples

### Decision: Trivy for Container Scanning

**Choice**: Trivy for Docker image vulnerability scanning

**Rationale**:
- **Comprehensive**: Scans OS packages and application dependencies
- **Fast**: Quick scanning, suitable for CI
- **Accurate**: Low false-positive rate
- **Integration**: SARIF output for GitHub Security
- **Free**: No licensing costs

**Configuration**:
- Scan for CRITICAL and HIGH severity
- SARIF format for GitHub integration
- Scan both API and Web images

---

## Development Workflow

### Decision: npm Workspaces for Monorepo

**Choice**: Use npm workspaces (built-in)

**Rationale**:
- **Native**: No additional tools (no Lerna, Nx, Turborepo)
- **Simplicity**: Easier to understand and maintain
- **Performance**: Efficient dependency management
- **Compatibility**: Works with all npm tooling

**Structure**:
```json
"workspaces": [
  "apps/*",
  "libs/*"
]
```

**Alternatives Considered**:
- Nx: Too complex for current needs
- Lerna: Maintenance concerns
- Turborepo: Additional dependency

### Decision: Comprehensive npm Scripts

**Categories**:
- **Development**: dev, dev:api, dev:web, dev:docker
- **Building**: build, build:api, build:web
- **Testing**: test, test:api, test:web, test:e2e
- **Quality**: lint, format, typecheck
- **Security**: security:scan, security:semgrep, security:snyk
- **Docker**: docker:build, docker:up, docker:down
- **Database**: migration:create, migration:run
- **Cleanup**: clean, clean:all

**Rationale**:
- **Consistency**: Standard commands across projects
- **Documentation**: Scripts self-document capabilities
- **Automation**: Easy to use in CI/CD
- **Developer Experience**: Quick access to common tasks

### Decision: Concurrent Development Servers

**Choice**: Use `concurrently` to run API and Web together

**Command**: `npm run dev`

**Rationale**:
- **Single Command**: Start full stack with one command
- **Combined Output**: See logs from both services
- **Process Management**: Kills both when stopped

**Alternatives Considered**:
- Separate terminals: Less convenient
- tmux/screen: Not cross-platform
- PM2: Overkill for development

---

## Git Hooks

### Decision: Husky + lint-staged

**Choice**: Husky for Git hooks, lint-staged for staged files

**Rationale**:
- **Developer Experience**: Catches issues before commit
- **Quality Gate**: Prevents bad code from entering repo
- **Fast**: Only lints staged files
- **Configurable**: Easy to customize per project

**Hooks Implemented**:

1. **pre-commit**:
   - Run lint-staged (lint + format staged files)
   - Run type checking

2. **pre-push**:
   - Run all tests
   - Run secret scanning

3. **commit-msg**:
   - Enforce Conventional Commits format
   - Validate commit message structure

**Alternatives Considered**:
- No hooks: Would reduce code quality
- Server-side hooks only: Too late to catch issues
- Custom scripts: More maintenance burden

### Decision: Conventional Commits

**Format**: `type(scope): subject`

**Types**: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert

**Rationale**:
- **Standardization**: Industry standard format
- **Automation**: Enables automated changelog generation
- **Clarity**: Clear commit purpose
- **Tooling**: Supported by many tools (semantic-release, etc.)

**Enforcement**: commit-msg hook validates format

---

## Environment Configuration

### Decision: Separate .env Files Per Application

**Structure**:
- `/home/user/AiDeepRef/.env` - Root/Docker Compose
- `/home/user/AiDeepRef/apps/api/.env` - API configuration
- `/home/user/AiDeepRef/apps/web/.env` - Web configuration

**Rationale**:
- **Separation**: Each app manages its own config
- **Clarity**: No confusion about which vars apply where
- **Security**: Apps can't access each other's secrets
- **Flexibility**: Different values per environment

**Alternatives Considered**:
- Single .env file: Would mix concerns
- Config service: Overkill for current needs

### Decision: Comprehensive .env.example Files

**Contents**:
- All available configuration options
- Comments explaining each variable
- Safe default values
- Required vs optional clearly marked
- External service documentation

**Rationale**:
- **Documentation**: Self-documenting configuration
- **Onboarding**: New developers know what to configure
- **Security**: Prevents accidental secret commits
- **Completeness**: Nothing hidden or undocumented

### Decision: Environment Variable Naming

**Convention**:
- UPPERCASE_WITH_UNDERSCORES
- Grouped by prefix (DATABASE_, REDIS_, JWT_, etc.)
- Clear, descriptive names

**Examples**:
- `DATABASE_URL` not `DB`
- `JWT_SECRET` not `SECRET`
- `OPENAI_API_KEY` not `AI_KEY`

**Rationale**:
- **Clarity**: Obvious what each variable does
- **Organization**: Easy to find related variables
- **Standards**: Follows industry conventions

---

## Documentation

### Decision: Comprehensive Documentation Set

**Documents Created**:
1. `CONTRIBUTING.md` - Contribution guidelines
2. `SECURITY.md` - Security policies and practices
3. `docs/DEVELOPMENT_SETUP.md` - Detailed setup guide
4. `files/research_notes/devsecops-setup-decisions.md` - This document

**Rationale**:
- **Onboarding**: Reduces time to first contribution
- **Quality**: Clear standards improve code quality
- **Security**: Documented security practices
- **Knowledge Transfer**: Preserves institutional knowledge

### Decision: Development Setup Scripts

**Scripts Created**:
- `scripts/setup-dev.sh` - Automated setup
- `scripts/check-deps.sh` - Security checks

**Rationale**:
- **Automation**: Reduces setup errors
- **Consistency**: Same setup for all developers
- **Speed**: Faster onboarding
- **Validation**: Checks prerequisites

### Decision: Documentation in Markdown

**Choice**: All documentation in Markdown format

**Rationale**:
- **Readability**: Easy to read in plain text and rendered
- **Version Control**: Git-friendly format
- **Portability**: Works everywhere (GitHub, VS Code, etc.)
- **Standards**: Industry standard for technical docs

---

## Tool Selections Summary

| Category | Tool | Rationale |
|----------|------|-----------|
| Container Runtime | Docker 27+ | Industry standard, excellent tooling |
| Orchestration | Docker Compose | Simple for local dev, Kubernetes for prod |
| Base Images | Alpine Linux | Small size, security, performance |
| Web Server | Nginx | Performance, security, features |
| CI/CD | GitHub Actions | Native integration, free, powerful |
| SAST | Semgrep | Fast, accurate, customizable |
| Dependency Scan | Snyk | Comprehensive, actionable |
| Secret Scan | Gitleaks | Fast, configurable, privacy |
| Container Scan | Trivy | Accurate, comprehensive, fast |
| Linting | ESLint | JavaScript/TypeScript standard |
| Formatting | Prettier | Opinionated, consistent |
| Git Hooks | Husky | Simple, reliable, popular |
| Staged Files | lint-staged | Fast, efficient |
| Package Manager | npm | Native, reliable, workspace support |

---

## Security Posture

### Defense in Depth Layers

1. **Development Time**:
   - ESLint security plugin
   - TypeScript strict mode
   - Pre-commit hooks

2. **Commit Time**:
   - Secret scanning (Gitleaks)
   - Conventional commits enforcement

3. **Pre-Push**:
   - All tests must pass
   - Type checking

4. **Pull Request**:
   - SAST (Semgrep)
   - Dependency scanning (Snyk)
   - Code review required
   - All CI checks must pass

5. **Container Build**:
   - Multi-stage builds
   - Non-root users
   - Minimal base images
   - Container scanning (Trivy)

6. **Runtime**:
   - Health checks
   - Resource limits
   - Network isolation
   - Secrets management

### OWASP Top 10 Coverage

| Risk | Mitigation |
|------|------------|
| A01: Broken Access Control | RBAC implementation, authentication guards |
| A02: Cryptographic Failures | TLS, bcrypt, secure secret management |
| A03: Injection | Parameterized queries, input validation |
| A04: Insecure Design | Security requirements, threat modeling |
| A05: Security Misconfiguration | Security headers, default configs reviewed |
| A06: Vulnerable Components | Snyk, npm audit, automated updates |
| A07: Authentication Failures | JWT, MFA support, secure session management |
| A08: Software and Data Integrity | Signed commits, dependency verification |
| A09: Security Logging | Comprehensive logging, monitoring |
| A10: Server-Side Request Forgery | Input validation, allowlisting |

---

## Performance Considerations

### Docker Optimization

- **Layer Caching**: Dependency installation before source copy
- **Multi-stage Builds**: Smaller final images
- **Alpine Base**: ~5MB vs ~150MB for full Node image
- **Build Cache**: GitHub Actions cache for Docker layers

### CI/CD Optimization

- **Parallel Jobs**: API and Web tests run concurrently
- **Matrix Builds**: Efficient Docker builds
- **Dependency Caching**: npm cache in GitHub Actions
- **Artifact Upload**: Only when needed, 7-day retention

### Development Optimization

- **Hot Reload**: Volume mounts for live code updates
- **Service Dependencies**: Health checks prevent premature starts
- **Named Volumes**: Persist data between restarts
- **Workspace Configuration**: Efficient dependency management

---

## Monitoring & Observability

### Health Checks

All services include health checks:
- **API**: HTTP endpoint `/health`
- **Web**: nginx health endpoint
- **PostgreSQL**: `pg_isready`
- **Redis**: `redis-cli ping`

**Rationale**: Enables orchestration systems to manage services properly

### Logging

- **Structured Logging**: JSON format for machine parsing
- **Log Levels**: Configurable per environment
- **Centralized**: Future integration with ELK/Datadog
- **Security**: No sensitive data in logs

### Metrics

- **Application Metrics**: Future Prometheus integration
- **Health Endpoints**: Ready for monitoring
- **Performance**: Response time tracking

---

## Future Improvements

### Short Term (Next Sprint)

1. Add Kubernetes manifests for production
2. Implement semantic-release for versioning
3. Add end-to-end tests with Playwright
4. Set up code coverage thresholds
5. Configure Renovate for dependency updates

### Medium Term (Next Quarter)

1. Implement feature flags
2. Add performance monitoring (APM)
3. Set up staging environment
4. Implement blue-green deployments
5. Add load testing

### Long Term (Next Year)

1. Multi-region deployment
2. Advanced observability (tracing)
3. Chaos engineering
4. Compliance certifications (SOC 2)
5. Security bug bounty program

---

## Lessons Learned

### What Went Well

- Multi-stage Docker builds significantly reduced image size
- GitHub Actions provides excellent developer experience
- Comprehensive security scanning catches issues early
- Good documentation reduces support burden
- Automated setup scripts save time

### Challenges

- Balancing security with developer experience
- Configuring service dependencies in Docker Compose
- Managing secrets across environments
- Keeping documentation synchronized with code

### Best Practices Established

1. Security is everyone's responsibility
2. Automate everything that can be automated
3. Document decisions, not just implementations
4. Test early and often
5. Use industry standards and conventions
6. Optimize for developer experience
7. Defense in depth for security
8. Make the right thing the easy thing

---

## Conclusion

The DevSecOps infrastructure for DeepRef provides:

✅ **Complete Development Environment**: One-command setup with Docker
✅ **Robust CI/CD Pipeline**: Automated testing, building, and deployment
✅ **Comprehensive Security**: Multiple scanning tools, defense in depth
✅ **Developer Experience**: Clear documentation, helpful scripts
✅ **Code Quality**: Automated linting, formatting, type checking
✅ **Maintainability**: Well-documented, standard practices
✅ **Scalability**: Ready for growth and additional services

The infrastructure balances security, developer experience, and operational excellence, providing a solid foundation for the DeepRef platform.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-19
**Next Review**: 2025-12-19
