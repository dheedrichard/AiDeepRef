# DeepRef Infrastructure

This directory contains all infrastructure configuration for the DeepRef platform.

## Contents

### Docker (`/docker`)
- **Dockerfile.web** - Angular frontend container (multi-stage, Nginx-based)
- **Dockerfile.api** - NestJS backend container (multi-stage, non-root user)
- **docker-compose.yml** - Local development environment
- **nginx.conf** - Optimized Nginx configuration with security headers
- **.dockerignore** - Build context optimization

### Kubernetes (`/k8s`)
- Kubernetes manifests for production deployment (TBD)
- Will include deployments, services, ingress, configmaps, secrets

## Quick Start

### Development with Docker

```bash
# From project root
npm run dev:docker

# Or with rebuild
npm run dev:docker:build
```

Access:
- Web: http://localhost:4200
- API: http://localhost:3000
- API Docs: http://localhost:3000/api
- Adminer: http://localhost:8080

### Building Images

```bash
# Build both images
npm run docker:build

# Build individually
npm run docker:build:api
npm run docker:build:web
```

### Docker Management

```bash
# Start services
npm run docker:up

# Stop services
npm run docker:down

# View logs
npm run docker:logs

# Clean everything (removes volumes)
npm run docker:clean
```

## Architecture

### Development Stack
```
┌─────────────────────────────────────┐
│         Docker Compose              │
├─────────────────────────────────────┤
│  ┌──────────┐  ┌──────────────┐    │
│  │   Web    │  │     API      │    │
│  │ (Angular)│  │   (NestJS)   │    │
│  │  :4200   │  │    :3000     │    │
│  └────┬─────┘  └──────┬───────┘    │
│       │               │             │
│       └───────┬───────┘             │
│               │                     │
│  ┌────────────┴──────────┐         │
│  │     PostgreSQL        │         │
│  │        :5432          │         │
│  └───────────────────────┘         │
│               │                     │
│  ┌────────────┴──────────┐         │
│  │        Redis          │         │
│  │        :6379          │         │
│  └───────────────────────┘         │
│                                     │
│  ┌───────────────────────┐         │
│  │      Adminer          │         │
│  │       :8080           │         │
│  └───────────────────────┘         │
└─────────────────────────────────────┘
```

### Container Details

#### Web Container
- **Base**: nginx:1.25-alpine (~25MB)
- **Build**: Multi-stage (Node.js builder → Nginx runtime)
- **Features**: Gzip, security headers, Angular routing support
- **Health Check**: `/health` endpoint

#### API Container
- **Base**: node:20-alpine (~150MB production)
- **Build**: Multi-stage (builder → production)
- **User**: Non-root (nestjs:1001)
- **Health Check**: HTTP GET `/health`

#### PostgreSQL
- **Image**: postgres:16-alpine
- **Volume**: Named volume `postgres_data`
- **Health Check**: `pg_isready`

#### Redis
- **Image**: redis:7-alpine
- **Volume**: Named volume `redis_data`
- **Health Check**: `redis-cli ping`

## Environment Variables

Required environment files:
- `/.env` - Docker Compose variables
- `/apps/api/.env` - API configuration
- `/apps/web/.env` - Web configuration

See respective `.env.example` files for all options.

## Security Features

### Container Security
- ✅ Multi-stage builds (smaller attack surface)
- ✅ Non-root users
- ✅ Minimal base images (Alpine Linux)
- ✅ Health checks
- ✅ Resource limits (in production)
- ✅ Network isolation

### Web Security
- ✅ Security headers (CSP, X-Frame-Options, etc.)
- ✅ Gzip compression
- ✅ Static asset caching
- ✅ Hidden files blocked

### API Security
- ✅ Non-root user (UID 1001)
- ✅ Production-only dependencies
- ✅ Health check endpoint
- ✅ Clean npm cache

## Production Deployment

### CI/CD Pipeline
See `.github/workflows/` for automated pipelines:
- **ci.yml** - Tests and builds on every PR
- **security-scan.yml** - Security scanning
- **deploy-staging.yml** - Automated staging deployment

### Kubernetes (Coming Soon)
Production deployment will use:
- Kubernetes for orchestration
- GHCR for container registry
- Helm charts for deployment
- ArgoCD for GitOps (optional)

## Troubleshooting

### Port Conflicts
```bash
# Check what's using a port
lsof -i :4200  # macOS/Linux
netstat -ano | findstr :4200  # Windows

# Kill the process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Database Issues
```bash
# Reset database
npm run docker:clean
npm run dev:docker:build
```

### Container Won't Start
```bash
# Check logs
docker-compose -f infrastructure/docker/docker-compose.yml logs

# Check specific service
docker-compose -f infrastructure/docker/docker-compose.yml logs api
```

### Build Failures
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose -f infrastructure/docker/docker-compose.yml build --no-cache
```

## Best Practices

### Development
1. Always use Docker for development (consistency)
2. Never commit `.env` files
3. Use health checks in services
4. Keep images small (multi-stage builds)
5. Run security scans regularly

### Production
1. Use specific image tags (not `latest`)
2. Set resource limits
3. Enable monitoring and logging
4. Use secrets management (not env files)
5. Regular security updates
6. Automated backups

## Monitoring

### Health Checks
All services expose health endpoints:
- Web: `http://localhost:4200/health`
- API: `http://localhost:3000/health`
- PostgreSQL: via `pg_isready`
- Redis: via `redis-cli ping`

### Logs
```bash
# All services
npm run docker:logs

# Specific service
docker-compose -f infrastructure/docker/docker-compose.yml logs -f api

# With timestamps
docker-compose -f infrastructure/docker/docker-compose.yml logs -f --timestamps
```

## Performance

### Image Sizes
- Web (production): ~25MB
- API (production): ~150MB
- PostgreSQL: ~250MB
- Redis: ~30MB

### Build Times
- First build: ~5-10 minutes
- Cached rebuild: ~1-2 minutes
- Code changes only: ~30 seconds

### Optimization
- Layer caching enabled
- Multi-stage builds
- .dockerignore configured
- GitHub Actions cache

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)

## Support

For infrastructure issues:
1. Check this README
2. Review `/docs/DEVELOPMENT_SETUP.md`
3. Check Docker logs
4. Create GitHub issue with logs

---

**Last Updated**: 2025-11-19
**Maintained By**: DevSecOps Team
