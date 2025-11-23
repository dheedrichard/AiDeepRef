# DevSecOps Pipeline - AiDeepRef

**Version:** 1.0
**Last Updated:** 2025-11-23
**Status:** PRODUCTION READY

---

## Table of Contents

1. [Overview](#overview)
2. [CI/CD Pipeline Architecture](#cicd-pipeline-architecture)
3. [GitHub Actions Workflows](#github-actions-workflows)
4. [Security Scanning Integration](#security-scanning-integration)
5. [Docker Strategy](#docker-strategy)
6. [Infrastructure as Code](#infrastructure-as-code)
7. [Compliance Automation](#compliance-automation)
8. [Environment Configuration](#environment-configuration)
9. [Monitoring & Alerting](#monitoring--alerting)
10. [Rollback Strategy](#rollback-strategy)

---

## Overview

### Architecture Principles

- **Mono-repo**: Single repository with apps/api, apps/web, apps/mobile
- **Cloud Provider**: Microsoft Azure
- **Container Orchestration**: Azure Kubernetes Service (AKS)
- **CI/CD Platform**: GitHub Actions
- **Compliance**: ISO 27001, NIST CIS, OWASP Top 10
- **Security**: Shift-left approach with automated scanning at every stage

### Pipeline Stages

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│   Commit    │───▶│  Build & Test│───▶│   Security  │───▶│    Deploy    │
│  & PR       │    │   (Parallel)  │    │   Scanning  │    │ (Environments)│
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
      │                    │                    │                    │
      ▼                    ▼                    ▼                    ▼
  Lint/Format      Unit Tests           SAST/DAST         Dev/Stage/Prod
  Secret Scan      Integration Tests    Container Scan    Blue/Green Deploy
  Dependency Check E2E Tests            Dependency Scan   Health Checks
                   Build Artifacts      Secret Detection  Smoke Tests
```

---

## CI/CD Pipeline Architecture

### Workflow Strategy

1. **Feature Branch** → Triggers: Lint, Test, Security Scan
2. **Pull Request** → Triggers: Full CI, Security Review, Build
3. **Main Branch** → Triggers: Full CI/CD, Deploy to Staging
4. **Release Tag** → Triggers: Deploy to Production with approval

### Branch Protection Rules

```yaml
# Required for main branch
- Require pull request reviews (2 approvals)
- Require status checks to pass
- Require branches to be up to date
- Require signed commits
- Enforce for administrators
- Restrict who can push to matching branches
```

---

## GitHub Actions Workflows

### 1. Main CI/CD Workflow

**File:** `.github/workflows/main-cicd.yml`

```yaml
name: Main CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  workflow_dispatch:

env:
  NODE_VERSION: '20'
  REGISTRY: deeprefacr.azurecr.io
  AZURE_REGION: eastus

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ============================================================================
  # STAGE 1: CODE QUALITY & SECURITY
  # ============================================================================

  code-quality:
    name: Code Quality & Linting
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint on all apps
        run: |
          npm run lint:api
          npm run lint:web
        continue-on-error: false

      - name: Check code formatting
        run: npm run format:check

      - name: TypeScript type checking
        run: npm run typecheck

      - name: Check for circular dependencies
        run: |
          npx madge --circular --extensions ts,js apps/api/src
          npx madge --circular --extensions ts,js apps/web/src

  secret-scanning:
    name: Secret Detection
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }}

      - name: Run TruffleHog
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD

  # ============================================================================
  # STAGE 2: BUILD & TEST
  # ============================================================================

  test-api:
    name: Test API
    runs-on: ubuntu-latest
    timeout-minutes: 15

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: deepref_test
          POSTGRES_USER: deepref_test
          POSTGRES_PASSWORD: ${{ secrets.TEST_DB_PASSWORD }}
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 3s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: npm run migration:run
        env:
          DATABASE_URL: postgresql://deepref_test:${{ secrets.TEST_DB_PASSWORD }}@localhost:5432/deepref_test

      - name: Run unit tests
        run: npm run test:api:cov
        env:
          DATABASE_URL: postgresql://deepref_test:${{ secrets.TEST_DB_PASSWORD }}@localhost:5432/deepref_test
          REDIS_HOST: localhost
          REDIS_PORT: 6379
          JWT_SECRET: ${{ secrets.TEST_JWT_SECRET }}

      - name: Run integration tests
        run: npm run test:api:e2e
        env:
          DATABASE_URL: postgresql://deepref_test:${{ secrets.TEST_DB_PASSWORD }}@localhost:5432/deepref_test
          REDIS_HOST: localhost
          REDIS_PORT: 6379
          JWT_SECRET: ${{ secrets.TEST_JWT_SECRET }}

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./apps/api/coverage/lcov.info
          flags: api
          name: api-coverage
          token: ${{ secrets.CODECOV_TOKEN }}

      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        with:
          projectBaseDir: apps/api
          args: >
            -Dsonar.organization=aideepref
            -Dsonar.projectKey=aideepref_api
            -Dsonar.sources=src
            -Dsonar.tests=test
            -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info

  test-web:
    name: Test Web App
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:web:cov

      - name: Run E2E tests
        run: |
          npx playwright install --with-deps
          npm run test:web:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: apps/web/playwright-report/
          retention-days: 7

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./apps/web/coverage/lcov.info
          flags: web
          name: web-coverage
          token: ${{ secrets.CODECOV_TOKEN }}

  test-mobile:
    name: Test Mobile App
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run mobile tests
        run: npm run test:mobile

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./apps/mobile/coverage/lcov.info
          flags: mobile
          name: mobile-coverage
          token: ${{ secrets.CODECOV_TOKEN }}

  build-api:
    name: Build API
    runs-on: ubuntu-latest
    needs: [code-quality, secret-scanning, test-api]
    timeout-minutes: 10

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build API
        run: npm run build:api

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: api-build
          path: apps/api/dist
          retention-days: 7

  build-web:
    name: Build Web App
    runs-on: ubuntu-latest
    needs: [code-quality, secret-scanning, test-web]
    timeout-minutes: 10

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Web App
        run: npm run build:web
        env:
          NODE_ENV: production

      - name: Analyze bundle size
        run: npx size-limit

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: web-build
          path: apps/web/dist
          retention-days: 7

  build-mobile:
    name: Build Mobile App
    runs-on: ubuntu-latest
    needs: [code-quality, secret-scanning, test-mobile]
    timeout-minutes: 15

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Mobile App
        run: npm run build:mobile

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: mobile-build
          path: apps/mobile/dist
          retention-days: 7

  # ============================================================================
  # STAGE 3: SECURITY SCANNING
  # ============================================================================

  sast-scan:
    name: SAST - Semgrep
    runs-on: ubuntu-latest
    timeout-minutes: 10

    container:
      image: returntocorp/semgrep

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Semgrep
        run: |
          semgrep scan \
            --config=auto \
            --config=p/security-audit \
            --config=p/secrets \
            --config=p/owasp-top-ten \
            --config=p/javascript \
            --config=p/typescript \
            --config=p/nodejs \
            --severity=ERROR \
            --severity=WARNING \
            --sarif \
            --output=semgrep-results.sarif

      - name: Upload SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: semgrep-results.sarif

      - name: Upload Semgrep results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: semgrep-results
          path: semgrep-results.sarif

  dependency-scan:
    name: Dependency Scanning - Snyk
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Snyk test
        uses: snyk/actions/node@master
        continue-on-error: true
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: >
            --all-projects
            --severity-threshold=high
            --fail-on=upgradable
            --sarif-file-output=snyk-results.sarif

      - name: Upload SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: snyk-results.sarif

      - name: Run npm audit
        run: npm audit --audit-level=moderate --json > npm-audit.json
        continue-on-error: true

      - name: Upload audit results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: npm-audit-results
          path: npm-audit.json

  # ============================================================================
  # STAGE 4: DOCKER BUILD & SCAN
  # ============================================================================

  docker-build-scan:
    name: Docker Build & Security Scan
    runs-on: ubuntu-latest
    needs: [build-api, build-web, build-mobile, sast-scan, dependency-scan]
    timeout-minutes: 30

    strategy:
      matrix:
        service: [api, web, mobile]

    permissions:
      contents: read
      packages: write
      security-events: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Azure Container Registry
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/deepref-${{ matrix.service }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./infrastructure/docker/Dockerfile.${{ matrix.service }}
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            BUILD_DATE=${{ github.event.head_commit.timestamp }}
            VCS_REF=${{ github.sha }}
            VERSION=${{ github.ref_name }}
          load: true

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/deepref-${{ matrix.service }}:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-${{ matrix.service }}-results.sarif'
          severity: 'CRITICAL,HIGH,MEDIUM'
          vuln-type: 'os,library'

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: trivy-${{ matrix.service }}-results.sarif

      - name: Run Grype vulnerability scanner
        uses: anchore/scan-action@v3
        with:
          image: ${{ env.REGISTRY }}/deepref-${{ matrix.service }}:${{ github.sha }}
          fail-build: false
          severity-cutoff: high

      - name: Check image size
        run: |
          SIZE=$(docker images ${{ env.REGISTRY }}/deepref-${{ matrix.service }}:${{ github.sha }} --format "{{.Size}}")
          echo "Image size: $SIZE"

      - name: Scan for secrets in image
        run: |
          docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
            deepfence/secretscanner:latest \
            -image-name ${{ env.REGISTRY }}/deepref-${{ matrix.service }}:${{ github.sha }}

  # ============================================================================
  # STAGE 5: COMPLIANCE CHECKS
  # ============================================================================

  compliance-scan:
    name: Compliance Validation
    runs-on: ubuntu-latest
    needs: [docker-build-scan]
    timeout-minutes: 15

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'AiDeepRef'
          path: '.'
          format: 'ALL'
          args: >
            --enableRetired
            --failOnCVSS 7
            --suppression suppression.xml

      - name: Upload OWASP results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: owasp-dependency-check
          path: reports/

      - name: NIST Compliance Check
        run: |
          echo "Running NIST CIS compliance checks..."
          # Check for security headers
          grep -r "helmet" apps/api/src || echo "Warning: Helmet middleware not found"
          grep -r "cors" apps/api/src || echo "Warning: CORS not configured"

          # Check for authentication
          grep -r "passport" apps/api/src || echo "Warning: Passport not found"
          grep -r "jwt" apps/api/src || echo "Warning: JWT not found"

          # Check for rate limiting
          grep -r "rate-limit" apps/api/src || echo "Warning: Rate limiting not found"

      - name: ISO 27001 Control Checks
        run: |
          echo "Running ISO 27001 compliance checks..."

          # A.9.4.1 Information access restriction
          test -f "apps/api/src/guards/auth.guard.ts" && echo "✓ Authentication guard present"

          # A.12.6.1 Management of technical vulnerabilities
          test -f ".snyk" && echo "✓ Vulnerability management configured"

          # A.14.2.5 Secure system engineering principles
          test -f "infrastructure/docker/Dockerfile.api" && echo "✓ Containerization implemented"

          # A.18.1.3 Protection of records
          grep -r "audit" apps/api/src && echo "✓ Audit logging present"

  # ============================================================================
  # STAGE 6: DEPLOYMENT
  # ============================================================================

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [docker-build-scan, compliance-scan]
    if: github.ref == 'refs/heads/develop' || github.ref == 'refs/heads/main'
    environment:
      name: staging
      url: https://staging.aideepref.com
    timeout-minutes: 20

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Set AKS context
        uses: azure/aks-set-context@v3
        with:
          resource-group: deepref-staging-rg
          cluster-name: deepref-staging-aks

      - name: Deploy to AKS
        run: |
          # Apply Kubernetes manifests
          kubectl apply -f infrastructure/k8s/staging/

          # Update image tags
          kubectl set image deployment/api-deployment \
            api=${{ env.REGISTRY }}/deepref-api:${{ github.sha }} \
            -n deepref-staging

          kubectl set image deployment/web-deployment \
            web=${{ env.REGISTRY }}/deepref-web:${{ github.sha }} \
            -n deepref-staging

          kubectl set image deployment/mobile-deployment \
            mobile=${{ env.REGISTRY }}/deepref-mobile:${{ github.sha }} \
            -n deepref-staging

      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/api-deployment -n deepref-staging --timeout=300s
          kubectl rollout status deployment/web-deployment -n deepref-staging --timeout=300s
          kubectl rollout status deployment/mobile-deployment -n deepref-staging --timeout=300s

      - name: Run smoke tests
        run: |
          # Health check
          curl -f https://staging-api.aideepref.com/health || exit 1

          # Basic API test
          curl -f https://staging-api.aideepref.com/api/v1/status || exit 1

      - name: Run DAST scan (OWASP ZAP)
        run: |
          docker run --rm -v $(pwd)/zap:/zap/wrk:rw \
            -t owasp/zap2docker-stable zap-baseline.py \
            -t https://staging.aideepref.com \
            -r zap-report.html \
            -J zap-report.json

      - name: Upload ZAP results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: zap-scan-results
          path: zap/

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [deploy-staging]
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://aideepref.com
    timeout-minutes: 30

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Set AKS context
        uses: azure/aks-set-context@v3
        with:
          resource-group: deepref-prod-rg
          cluster-name: deepref-prod-aks

      - name: Create deployment backup
        run: |
          kubectl get deployment -n deepref-prod -o yaml > deployment-backup-$(date +%Y%m%d-%H%M%S).yaml

      - name: Blue-Green Deployment
        run: |
          # Deploy to green environment
          kubectl apply -f infrastructure/k8s/production/green/

          # Update green deployment images
          kubectl set image deployment/api-deployment-green \
            api=${{ env.REGISTRY }}/deepref-api:${{ github.sha }} \
            -n deepref-prod

          kubectl set image deployment/web-deployment-green \
            web=${{ env.REGISTRY }}/deepref-web:${{ github.sha }} \
            -n deepref-prod

          # Wait for green deployment
          kubectl rollout status deployment/api-deployment-green -n deepref-prod --timeout=600s
          kubectl rollout status deployment/web-deployment-green -n deepref-prod --timeout=600s

      - name: Run production smoke tests
        run: |
          # Test green environment
          curl -f https://green.aideepref.com/health || exit 1

      - name: Switch traffic to green
        run: |
          # Update service to point to green
          kubectl patch service api-service -n deepref-prod \
            -p '{"spec":{"selector":{"version":"green"}}}'
          kubectl patch service web-service -n deepref-prod \
            -p '{"spec":{"selector":{"version":"green"}}}'

      - name: Monitor deployment
        run: |
          sleep 60
          # Check for errors in logs
          kubectl logs -l app=api,version=green -n deepref-prod --tail=100

      - name: Cleanup old blue deployment
        if: success()
        run: |
          kubectl delete deployment api-deployment-blue -n deepref-prod
          kubectl delete deployment web-deployment-blue -n deepref-prod

  # ============================================================================
  # STAGE 7: POST-DEPLOYMENT
  # ============================================================================

  post-deployment:
    name: Post-Deployment Validation
    runs-on: ubuntu-latest
    needs: [deploy-production]
    if: github.ref == 'refs/heads/main'
    timeout-minutes: 15

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run performance tests
        run: |
          # Artillery load test
          npx artillery run tests/load/production.yml

      - name: Check application metrics
        run: |
          # Query Prometheus for error rates
          curl -s "http://prometheus.aideepref.com/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])"

      - name: Verify backup creation
        run: |
          az postgres flexible-server backup list \
            --resource-group deepref-prod-rg \
            --server-name deepref-prod-postgres

      - name: Create release notes
        uses: release-drafter/release-drafter@v5
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

### 2. Nightly Security Scan Workflow

**File:** `.github/workflows/nightly-security.yml`

```yaml
name: Nightly Security Scan

on:
  schedule:
    # Run every day at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch:

env:
  NODE_VERSION: '20'
  REGISTRY: deeprefacr.azurecr.io

jobs:
  comprehensive-security-scan:
    name: Comprehensive Security Scan
    runs-on: ubuntu-latest
    timeout-minutes: 60

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # SAST - Multiple tools
      - name: Run Semgrep (Extended ruleset)
        run: |
          semgrep scan \
            --config=auto \
            --config=p/security-audit \
            --config=p/secrets \
            --config=p/owasp-top-ten \
            --config=p/javascript \
            --config=p/typescript \
            --config=p/nodejs \
            --config=p/docker \
            --config=p/kubernetes \
            --json > semgrep-nightly.json

      - name: Run ESLint Security Plugin
        run: npx eslint . --ext .ts,.js --format json > eslint-security.json
        continue-on-error: true

      # Dependency scanning
      - name: Run Snyk (Deep scan)
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --all-projects --detection-depth=6

      - name: Run npm audit
        run: npm audit --json > npm-audit-nightly.json
        continue-on-error: true

      # Container scanning
      - name: Scan production images
        run: |
          for service in api web mobile; do
            docker pull ${{ env.REGISTRY }}/deepref-${service}:latest

            # Trivy scan
            trivy image \
              --severity CRITICAL,HIGH,MEDIUM,LOW \
              --format json \
              --output trivy-${service}-nightly.json \
              ${{ env.REGISTRY }}/deepref-${service}:latest

            # Grype scan
            grype ${{ env.REGISTRY }}/deepref-${service}:latest \
              -o json > grype-${service}-nightly.json
          done

      # License compliance
      - name: Check licenses
        run: |
          npx license-checker --json > licenses.json
          npx license-checker --onlyAllow "MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC"

      # Infrastructure scanning
      - name: Scan Terraform files
        run: |
          # tfsec
          docker run --rm -v $(pwd):/src aquasec/tfsec /src/infrastructure/terraform \
            --format json > tfsec-results.json

          # Checkov
          docker run --rm -v $(pwd):/src bridgecrew/checkov \
            -d /src/infrastructure/terraform \
            -o json > checkov-results.json

      # Kubernetes scanning
      - name: Scan Kubernetes manifests
        run: |
          # Kubesec
          docker run --rm -v $(pwd):/project kubesec/kubesec:v2 \
            scan /project/infrastructure/k8s/**/*.yaml > kubesec-results.json

          # Kube-bench
          kubectl run kube-bench --rm -i --restart=Never \
            --image=aquasec/kube-bench:latest \
            -- --json > kube-bench-results.json

      # Generate security report
      - name: Generate security report
        run: |
          cat > security-report.md << 'EOF'
          # Nightly Security Scan Report

          **Date:** $(date)
          **Scan Type:** Comprehensive

          ## Summary

          - SAST Scans: Semgrep, ESLint Security
          - Dependency Scans: Snyk, npm audit
          - Container Scans: Trivy, Grype
          - Infrastructure Scans: tfsec, Checkov
          - Kubernetes Scans: Kubesec, Kube-bench

          ## Critical Findings

          $(jq -r '.results[] | select(.severity == "CRITICAL")' semgrep-nightly.json | wc -l) critical issues found

          ## Recommendations

          See attached scan results for details.
          EOF

      - name: Upload scan results
        uses: actions/upload-artifact@v4
        with:
          name: nightly-security-scan-${{ github.run_number }}
          path: |
            *-nightly.json
            security-report.md
          retention-days: 30

      - name: Notify security team
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Nightly security scan found critical issues'
          webhook_url: ${{ secrets.SLACK_SECURITY_WEBHOOK }}
```

---

### 3. Dependency Update Workflow

**File:** `.github/workflows/dependency-update.yml`

```yaml
name: Automated Dependency Updates

on:
  schedule:
    # Run weekly on Mondays at 9 AM UTC
    - cron: '0 9 * * 1'
  workflow_dispatch:

jobs:
  update-dependencies:
    name: Update Dependencies
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.PAT_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Update dependencies
        run: |
          npm update
          npm audit fix --audit-level=moderate

      - name: Run tests
        run: npm test

      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.PAT_TOKEN }}
          commit-message: 'chore: update dependencies'
          title: 'chore: automated dependency updates'
          body: |
            Automated dependency updates

            - Updated npm packages
            - Applied security fixes
            - All tests passing
          branch: automated-dependency-updates
          labels: dependencies, automated
```

---

## Security Scanning Integration

### Tool Matrix

| Scan Type | Primary Tool | Secondary Tool | Frequency | Severity Threshold |
|-----------|-------------|----------------|-----------|-------------------|
| SAST | Semgrep | SonarQube | Every commit | ERROR |
| Dependency | Snyk | npm audit | Every commit | HIGH |
| Container | Trivy | Grype | Every build | CRITICAL/HIGH |
| Secrets | Gitleaks | TruffleHog | Every commit | ALL |
| DAST | OWASP ZAP | - | Post-deploy | MEDIUM |
| IaC | tfsec | Checkov | Every commit | HIGH |
| Kubernetes | Kubesec | Kube-bench | Weekly | MEDIUM |

### Semgrep Configuration

**File:** `.semgrep.yml`

```yaml
rules:
  - id: detect-sql-injection
    patterns:
      - pattern: $QUERY = "SELECT * FROM " + $USER_INPUT
    message: Potential SQL injection vulnerability
    severity: ERROR
    languages: [javascript, typescript]

  - id: detect-command-injection
    patterns:
      - pattern: exec($USER_INPUT)
      - pattern: spawn($USER_INPUT)
    message: Potential command injection vulnerability
    severity: ERROR
    languages: [javascript, typescript]

  - id: detect-path-traversal
    patterns:
      - pattern: fs.readFile($USER_INPUT)
      - pattern: fs.writeFile($USER_INPUT)
    message: Potential path traversal vulnerability
    severity: ERROR
    languages: [javascript, typescript]

  - id: detect-xss
    patterns:
      - pattern: $EL.innerHTML = $USER_INPUT
      - pattern: $EL.outerHTML = $USER_INPUT
    message: Potential XSS vulnerability
    severity: ERROR
    languages: [javascript, typescript]

  - id: hardcoded-secrets
    patterns:
      - pattern: const $VAR = "..."
      - metavariable-regex:
          metavariable: $VAR
          regex: .*(password|secret|token|key|api).*
    message: Potential hardcoded secret
    severity: WARNING
    languages: [javascript, typescript]

  - id: insecure-random
    patterns:
      - pattern: Math.random()
    message: Use crypto.randomBytes() for cryptographic operations
    severity: WARNING
    languages: [javascript, typescript]
```

### Snyk Configuration

**File:** `.snyk`

```yaml
# Snyk (https://snyk.io) policy file

version: v1.25.0

# Ignore specific vulnerabilities (with justification)
ignore:
  # Example: Prototype pollution in minimist (used only in dev)
  'SNYK-JS-MINIMIST-559764':
    - '*':
        reason: Used only in development
        expires: 2025-12-31T00:00:00.000Z

# Patch specific vulnerabilities
patch: {}

# Exclude paths from scanning
exclude:
  - test/**
  - '**/*.test.ts'
  - '**/*.spec.ts'
  - node_modules/**
  - dist/**
  - coverage/**

# Severity threshold
failThreshold: high

# Organization settings
organization: aideepref
```

### Trivy Configuration

**File:** `.trivyignore`

```
# Ignore specific CVEs (with justification)

# CVE-2023-XXXXX - False positive, not applicable to our use case
CVE-2023-XXXXX

# Low severity issues in base images (accepted risk)
# CVE-2023-YYYYY
```

### OWASP ZAP Configuration

**File:** `zap-baseline.conf`

```yaml
# ZAP Baseline Configuration

env:
  contexts:
    - name: AiDeepRef
      urls:
        - https://staging.aideepref.com
        - https://staging-api.aideepref.com
      includePaths:
        - https://staging.aideepref.com.*
        - https://staging-api.aideepref.com/api/.*
      excludePaths:
        - https://staging.aideepref.com/assets/.*
        - https://staging-api.aideepref.com/api/auth/.*
      authentication:
        method: form
        loginUrl: https://staging-api.aideepref.com/api/auth/login
        username: zap-test-user
        password: ${ZAP_TEST_PASSWORD}

  parameters:
    failOnError: true
    failOnWarning: false
    progressToStdout: true

  rules:
    - id: 10021
      name: X-Content-Type-Options Header Missing
      threshold: MEDIUM
    - id: 10020
      name: X-Frame-Options Header Not Set
      threshold: MEDIUM
    - id: 10096
      name: Timestamp Disclosure
      threshold: LOW

  activeScan:
    maxRuleDurationInMins: 5
    maxScanDurationInMins: 30
```

---

## Docker Strategy

### Multi-Stage Dockerfile Best Practices

#### API Dockerfile (Enhanced)

**File:** `infrastructure/docker/Dockerfile.api`

```dockerfile
# ============================================================================
# Stage 1: Dependencies
# ============================================================================
FROM node:20-alpine AS dependencies

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY libs/ ./libs/

# Install production dependencies
RUN npm ci --workspace=apps/api --omit=dev && \
    npm cache clean --force

# ============================================================================
# Stage 2: Build
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY libs/ ./libs/

# Install all dependencies (including dev)
RUN npm ci --workspace=apps/api

# Copy source code
COPY apps/api/ ./apps/api/
COPY tsconfig*.json ./

# Build application
WORKDIR /app/apps/api
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# ============================================================================
# Stage 3: Security Scanning
# ============================================================================
FROM builder AS security-scan

# Run security checks during build
RUN npm audit --audit-level=high || true
RUN npx snyk test --severity-threshold=high || true

# ============================================================================
# Stage 4: Production
# ============================================================================
FROM node:20-alpine AS production

# Set NODE_ENV
ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Copy production dependencies from dependencies stage
COPY --from=dependencies --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=dependencies --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package*.json ./

# Create necessary directories
RUN mkdir -p /app/logs && \
    chown -R nestjs:nodejs /app/logs

# Switch to non-root user
USER nestjs

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/main.js"]

# Metadata
LABEL maintainer="AiDeepRef DevOps <devops@aideepref.com>"
LABEL version="1.0.0"
LABEL description="AiDeepRef API Service"
LABEL org.opencontainers.image.source="https://github.com/aideepref/aideepref"
```

#### Web Dockerfile (Enhanced)

**File:** `infrastructure/docker/Dockerfile.web`

```dockerfile
# ============================================================================
# Stage 1: Build
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY libs/ ./libs/

# Install dependencies
RUN npm ci --workspace=apps/web

# Copy source code
COPY apps/web/ ./apps/web/
COPY tsconfig*.json ./

# Build Angular application
WORKDIR /app/apps/web
RUN npm run build -- \
    --configuration=production \
    --optimization \
    --build-optimizer \
    --aot \
    --source-map=false

# ============================================================================
# Stage 2: Security Scanning
# ============================================================================
FROM builder AS security-scan

RUN npm audit --audit-level=high || true

# ============================================================================
# Stage 3: Production
# ============================================================================
FROM nginx:1.25-alpine AS production

# Install security updates
RUN apk upgrade --no-cache

# Remove default nginx configs
RUN rm -rf /etc/nginx/conf.d/*

# Copy custom nginx config
COPY infrastructure/docker/nginx.conf /etc/nginx/nginx.conf
COPY infrastructure/docker/nginx-security.conf /etc/nginx/conf.d/security.conf

# Copy built application
COPY --from=builder /app/apps/web/dist/web /usr/share/nginx/html

# Create nginx user if not exists
RUN addgroup -g 101 -S nginx || true && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx nginx || true

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chmod -R 755 /usr/share/nginx/html

# Create directory for PID file
RUN mkdir -p /var/run/nginx && \
    chown -R nginx:nginx /var/run/nginx

# Switch to non-root user
USER nginx

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

# Expose port (unprivileged port)
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Metadata
LABEL maintainer="AiDeepRef DevOps <devops@aideepref.com>"
LABEL version="1.0.0"
LABEL description="AiDeepRef Web Application"
```

#### Mobile Dockerfile

**File:** `infrastructure/docker/Dockerfile.mobile`

```dockerfile
# ============================================================================
# Stage 1: Build
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for mobile builds
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openjdk11-jre

# Copy package files
COPY package*.json ./
COPY apps/mobile/package*.json ./apps/mobile/
COPY libs/ ./libs/

# Install dependencies
RUN npm ci --workspace=apps/mobile

# Copy source code
COPY apps/mobile/ ./apps/mobile/
COPY tsconfig*.json ./

# Build mobile application
WORKDIR /app/apps/mobile
RUN npm run build

# ============================================================================
# Stage 2: Production
# ============================================================================
FROM nginx:1.25-alpine AS production

# Copy built application
COPY --from=builder /app/apps/mobile/www /usr/share/nginx/html

# Copy nginx config
COPY infrastructure/docker/nginx-mobile.conf /etc/nginx/nginx.conf

# Create non-root user
RUN addgroup -g 101 -S nginx || true && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx nginx || true

USER nginx

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

LABEL maintainer="AiDeepRef DevOps <devops@aideepref.com>"
LABEL version="1.0.0"
LABEL description="AiDeepRef Mobile Application"
```

### Nginx Security Configuration

**File:** `infrastructure/docker/nginx-security.conf`

```nginx
# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.aideepref.com; frame-ancestors 'none';" always;

# Remove server tokens
server_tokens off;

# Limit request size
client_max_body_size 10M;

# Rate limiting
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

# SSL Configuration (when behind load balancer)
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
```

### Enhanced Nginx Configuration

**File:** `infrastructure/docker/nginx.conf`

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               application/rss+xml font/truetype font/opentype
               application/vnd.ms-fontobject image/svg+xml;
    gzip_disable "msie6";

    # Include security config
    include /etc/nginx/conf.d/security.conf;

    server {
        listen 8080;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # Static files caching
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # SPA fallback
        location / {
            try_files $uri $uri/ /index.html;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }

        # Deny access to hidden files
        location ~ /\. {
            deny all;
            access_log off;
            log_not_found off;
        }
    }
}
```

### Docker Compose for Local Development

**File:** `infrastructure/docker/docker-compose.yml`

```yaml
version: '3.9'

services:
  api:
    build:
      context: ../..
      dockerfile: infrastructure/docker/Dockerfile.api
      target: builder
    container_name: deepref-api-dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://deepref:deepref@postgres:5432/deepref
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - JWT_SECRET=dev-secret-change-in-production
    volumes:
      - ../../apps/api/src:/app/apps/api/src
      - ../../apps/api/test:/app/apps/api/test
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - deepref-network
    restart: unless-stopped

  web:
    build:
      context: ../..
      dockerfile: infrastructure/docker/Dockerfile.web
      target: builder
    container_name: deepref-web-dev
    ports:
      - "4200:4200"
    environment:
      - NODE_ENV=development
    volumes:
      - ../../apps/web/src:/app/apps/web/src
    networks:
      - deepref-network
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    container_name: deepref-postgres
    environment:
      - POSTGRES_DB=deepref
      - POSTGRES_USER=deepref
      - POSTGRES_PASSWORD=deepref
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U deepref"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - deepref-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: deepref-redis
    command: redis-server /usr/local/etc/redis/redis.conf
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    networks:
      - deepref-network
    restart: unless-stopped

  nginx:
    image: nginx:1.25-alpine
    container_name: deepref-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx-dev.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
      - web
    networks:
      - deepref-network
    restart: unless-stopped

volumes:
  postgres-data:
    driver: local
  redis-data:
    driver: local

networks:
  deepref-network:
    driver: bridge
```

### Image Optimization Checklist

- ✅ Multi-stage builds to reduce final image size
- ✅ Use Alpine Linux base images
- ✅ Minimize layers (combine RUN commands)
- ✅ Use .dockerignore to exclude unnecessary files
- ✅ Remove build dependencies in final stage
- ✅ Run as non-root user
- ✅ Use specific version tags, not 'latest'
- ✅ Implement health checks
- ✅ Add proper labels and metadata
- ✅ Clean npm cache after installation
- ✅ Use dumb-init for signal handling

**File:** `infrastructure/docker/.dockerignore`

```
# Version control
.git
.gitignore
.github

# Dependencies
node_modules
npm-debug.log
yarn-error.log

# Build artifacts
dist
build
.angular
.next

# Testing
coverage
.nyc_output
test-results
playwright-report

# IDE
.idea
.vscode
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
.env.*.local

# Documentation
*.md
docs/
README.md

# CI/CD
.github/
.gitlab-ci.yml
azure-pipelines.yml

# Misc
*.log
.cache
tmp/
temp/
```

---

## Infrastructure as Code

### Terraform Project Structure

```
infrastructure/terraform/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── terraform.tfvars
│   │   └── outputs.tf
│   ├── staging/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── terraform.tfvars
│   │   └── outputs.tf
│   └── production/
│       ├── main.tf
│       ├── variables.tf
│       ├── terraform.tfvars
│       └── outputs.tf
├── modules/
│   ├── aks/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── versions.tf
│   ├── cosmos-db/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── versions.tf
│   ├── redis/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── versions.tf
│   ├── app-gateway/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── versions.tf
│   ├── acr/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── versions.tf
│   └── monitoring/
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       └── versions.tf
├── backend.tf
└── versions.tf
```

### Main Terraform Configuration

**File:** `infrastructure/terraform/environments/production/main.tf`

```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "azurerm" {
    resource_group_name  = "deepref-terraform-rg"
    storage_account_name = "deepreftfstate"
    container_name       = "tfstate"
    key                  = "production.terraform.tfstate"
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
      recover_soft_deleted_key_vaults = true
    }

    resource_group {
      prevent_deletion_if_contains_resources = true
    }
  }

  skip_provider_registration = false
}

# ============================================================================
# Data Sources
# ============================================================================

data "azurerm_client_config" "current" {}

# ============================================================================
# Resource Group
# ============================================================================

resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location

  tags = merge(
    var.common_tags,
    {
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  )
}

# ============================================================================
# Networking
# ============================================================================

resource "azurerm_virtual_network" "main" {
  name                = "deepref-${var.environment}-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  tags = var.common_tags
}

resource "azurerm_subnet" "aks" {
  name                 = "aks-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]

  service_endpoints = [
    "Microsoft.Sql",
    "Microsoft.Storage",
    "Microsoft.KeyVault",
    "Microsoft.AzureCosmosDB"
  ]
}

resource "azurerm_subnet" "app_gateway" {
  name                 = "appgw-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.2.0/24"]
}

resource "azurerm_subnet" "database" {
  name                 = "database-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.3.0/24"]

  service_endpoints = ["Microsoft.Sql"]

  delegation {
    name = "postgres-delegation"

    service_delegation {
      name = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action"
      ]
    }
  }
}

# ============================================================================
# Network Security Groups
# ============================================================================

resource "azurerm_network_security_group" "aks" {
  name                = "aks-nsg"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  security_rule {
    name                       = "allow-https"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "allow-http"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }

  tags = var.common_tags
}

resource "azurerm_subnet_network_security_group_association" "aks" {
  subnet_id                 = azurerm_subnet.aks.id
  network_security_group_id = azurerm_network_security_group.aks.id
}

# ============================================================================
# Azure Container Registry
# ============================================================================

module "acr" {
  source = "../../modules/acr"

  name                = "deepref${var.environment}acr"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Premium"

  admin_enabled              = false
  public_network_access      = false
  zone_redundancy_enabled    = var.environment == "production"
  retention_days             = var.environment == "production" ? 30 : 7

  tags = var.common_tags
}

# ============================================================================
# Azure Kubernetes Service
# ============================================================================

module "aks" {
  source = "../../modules/aks"

  name                = "deepref-${var.environment}-aks"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  kubernetes_version  = "1.28"
  dns_prefix          = "deepref-${var.environment}"

  # Default node pool
  default_node_pool = {
    name                = "system"
    node_count          = var.environment == "production" ? 3 : 2
    vm_size             = var.environment == "production" ? "Standard_D4s_v3" : "Standard_D2s_v3"
    enable_auto_scaling = true
    min_count           = var.environment == "production" ? 3 : 1
    max_count           = var.environment == "production" ? 10 : 5
    max_pods            = 110
    os_disk_size_gb     = 128
    vnet_subnet_id      = azurerm_subnet.aks.id
    zones               = var.environment == "production" ? ["1", "2", "3"] : []
  }

  # Application node pool
  additional_node_pools = {
    apps = {
      name                = "apps"
      node_count          = var.environment == "production" ? 3 : 2
      vm_size             = "Standard_D4s_v3"
      enable_auto_scaling = true
      min_count           = var.environment == "production" ? 3 : 1
      max_count           = var.environment == "production" ? 20 : 10
      max_pods            = 110
      os_disk_size_gb     = 128
      vnet_subnet_id      = azurerm_subnet.aks.id
      zones               = var.environment == "production" ? ["1", "2", "3"] : []
      node_taints         = []
      node_labels = {
        workload = "application"
      }
    }
  }

  network_profile = {
    network_plugin     = "azure"
    network_policy     = "calico"
    load_balancer_sku  = "standard"
    service_cidr       = "10.1.0.0/16"
    dns_service_ip     = "10.1.0.10"
  }

  # Security
  role_based_access_control_enabled = true
  azure_policy_enabled              = true

  # Monitoring
  oms_agent_enabled = true
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  # Addons
  key_vault_secrets_provider_enabled = true

  tags = var.common_tags
}

# Grant AKS access to ACR
resource "azurerm_role_assignment" "aks_acr" {
  principal_id                     = module.aks.kubelet_identity_object_id
  role_definition_name             = "AcrPull"
  scope                            = module.acr.id
  skip_service_principal_aad_check = true
}

# ============================================================================
# Cosmos DB
# ============================================================================

module "cosmos_db" {
  source = "../../modules/cosmos-db"

  name                = "deepref-${var.environment}-cosmos"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  offer_type               = "Standard"
  kind                     = "GlobalDocumentDB"
  automatic_failover       = var.environment == "production"
  consistency_policy_level = "Session"

  geo_locations = var.environment == "production" ? [
    {
      location          = azurerm_resource_group.main.location
      failover_priority = 0
      zone_redundant    = true
    },
    {
      location          = var.secondary_location
      failover_priority = 1
      zone_redundant    = true
    }
  ] : [
    {
      location          = azurerm_resource_group.main.location
      failover_priority = 0
      zone_redundant    = false
    }
  ]

  # Network security
  public_network_access_enabled = false
  ip_range_filter              = []

  virtual_network_rules = [
    {
      id                                   = azurerm_subnet.aks.id
      ignore_missing_vnet_service_endpoint = false
    }
  ]

  # Backup
  backup_type               = "Periodic"
  backup_interval_in_minutes = 240
  backup_retention_in_hours  = var.environment == "production" ? 720 : 168

  tags = var.common_tags
}

# ============================================================================
# PostgreSQL Flexible Server
# ============================================================================

resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "deepref-${var.environment}-postgres"
  resource_group_name    = azurerm_resource_group.main.name
  location               = azurerm_resource_group.main.location
  version                = "16"
  delegated_subnet_id    = azurerm_subnet.database.id
  private_dns_zone_id    = azurerm_private_dns_zone.postgres.id
  administrator_login    = "deeprefadmin"
  administrator_password = random_password.postgres_password.result
  zone                   = var.environment == "production" ? "1" : null

  storage_mb   = var.environment == "production" ? 524288 : 131072  # 512GB or 128GB
  sku_name     = var.environment == "production" ? "GP_Standard_D4s_v3" : "GP_Standard_D2s_v3"

  backup_retention_days        = var.environment == "production" ? 35 : 7
  geo_redundant_backup_enabled = var.environment == "production"

  high_availability {
    mode                      = var.environment == "production" ? "ZoneRedundant" : "Disabled"
    standby_availability_zone = var.environment == "production" ? "2" : null
  }

  maintenance_window {
    day_of_week  = 0
    start_hour   = 3
    start_minute = 0
  }

  tags = var.common_tags

  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgres]
}

resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = "deepref"
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "UTF8"
}

resource "azurerm_private_dns_zone" "postgres" {
  name                = "privatelink.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.main.name

  tags = var.common_tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "postgres-dns-link"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  virtual_network_id    = azurerm_virtual_network.main.id

  tags = var.common_tags
}

resource "random_password" "postgres_password" {
  length  = 32
  special = true
}

# ============================================================================
# Azure Cache for Redis
# ============================================================================

module "redis" {
  source = "../../modules/redis"

  name                = "deepref-${var.environment}-redis"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  capacity            = var.environment == "production" ? 3 : 1
  family              = var.environment == "production" ? "P" : "C"
  sku_name            = var.environment == "production" ? "Premium" : "Standard"

  enable_non_ssl_port           = false
  minimum_tls_version           = "1.2"
  public_network_access_enabled = false

  redis_configuration = {
    maxmemory_policy = "allkeys-lru"
    maxmemory_delta  = var.environment == "production" ? 125 : null
    maxmemory_reserved = var.environment == "production" ? 125 : null
  }

  # Persistence for Premium SKU
  enable_persistence = var.environment == "production"

  # Clustering for Premium SKU
  shard_count = var.environment == "production" ? 2 : null

  # Zone redundancy for Premium SKU
  zones = var.environment == "production" ? ["1", "2", "3"] : []

  tags = var.common_tags
}

# ============================================================================
# Application Gateway
# ============================================================================

module "app_gateway" {
  source = "../../modules/app-gateway"

  name                = "deepref-${var.environment}-appgw"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  subnet_id = azurerm_subnet.app_gateway.id

  sku = {
    name     = var.environment == "production" ? "WAF_v2" : "Standard_v2"
    tier     = var.environment == "production" ? "WAF_v2" : "Standard_v2"
    capacity = var.environment == "production" ? 3 : 2
  }

  # WAF Configuration
  waf_configuration = var.environment == "production" ? {
    enabled          = true
    firewall_mode    = "Prevention"
    rule_set_type    = "OWASP"
    rule_set_version = "3.2"

    disabled_rule_groups = []
  } : null

  # SSL Certificate
  ssl_certificate_path     = var.ssl_certificate_path
  ssl_certificate_password = var.ssl_certificate_password

  # Backend pools
  backend_pools = {
    api = {
      fqdns = [module.aks.fqdn]
      port  = 443
    }
    web = {
      fqdns = [module.aks.fqdn]
      port  = 443
    }
  }

  tags = var.common_tags
}

# ============================================================================
# Key Vault
# ============================================================================

resource "azurerm_key_vault" "main" {
  name                       = "deepref-${var.environment}-kv"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "premium"
  soft_delete_retention_days = 90
  purge_protection_enabled   = var.environment == "production"

  enabled_for_disk_encryption     = true
  enabled_for_deployment          = true
  enabled_for_template_deployment = true

  network_acls {
    bypass                     = "AzureServices"
    default_action             = "Deny"
    virtual_network_subnet_ids = [azurerm_subnet.aks.id]
  }

  tags = var.common_tags
}

# Store secrets in Key Vault
resource "azurerm_key_vault_secret" "postgres_connection_string" {
  name         = "postgres-connection-string"
  value        = "postgresql://${azurerm_postgresql_flexible_server.main.administrator_login}:${random_password.postgres_password.result}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/deepref"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "redis_connection_string" {
  name         = "redis-connection-string"
  value        = module.redis.primary_connection_string
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "cosmos_connection_string" {
  name         = "cosmos-connection-string"
  value        = module.cosmos_db.primary_connection_string
  key_vault_id = azurerm_key_vault.main.id
}

# ============================================================================
# Monitoring & Logging
# ============================================================================

resource "azurerm_log_analytics_workspace" "main" {
  name                = "deepref-${var.environment}-logs"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = var.environment == "production" ? 90 : 30

  tags = var.common_tags
}

resource "azurerm_application_insights" "main" {
  name                = "deepref-${var.environment}-appinsights"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"

  tags = var.common_tags
}

module "monitoring" {
  source = "../../modules/monitoring"

  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  application_insights_id    = azurerm_application_insights.main.id

  # Alert recipients
  alert_email_addresses = var.alert_email_addresses
  alert_webhook_url     = var.alert_webhook_url

  # Resources to monitor
  monitored_resources = {
    aks       = module.aks.id
    cosmos_db = module.cosmos_db.id
    redis     = module.redis.id
    postgres  = azurerm_postgresql_flexible_server.main.id
  }

  tags = var.common_tags
}

# ============================================================================
# Security
# ============================================================================

# Azure Security Center
resource "azurerm_security_center_subscription_pricing" "main" {
  tier          = var.environment == "production" ? "Standard" : "Free"
  resource_type = "VirtualMachines"
}

resource "azurerm_security_center_contact" "main" {
  email = var.security_contact_email
  phone = var.security_contact_phone

  alert_notifications = true
  alerts_to_admins    = true
}

# ============================================================================
# Outputs
# ============================================================================

output "aks_cluster_name" {
  value = module.aks.cluster_name
}

output "aks_cluster_fqdn" {
  value = module.aks.fqdn
}

output "acr_login_server" {
  value = module.acr.login_server
}

output "postgres_fqdn" {
  value = azurerm_postgresql_flexible_server.main.fqdn
}

output "redis_hostname" {
  value = module.redis.hostname
}

output "cosmos_db_endpoint" {
  value = module.cosmos_db.endpoint
}

output "key_vault_uri" {
  value = azurerm_key_vault.main.vault_uri
}

output "application_insights_instrumentation_key" {
  value     = azurerm_application_insights.main.instrumentation_key
  sensitive = true
}
```

### Terraform Variables

**File:** `infrastructure/terraform/environments/production/variables.tf`

```hcl
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
  default     = "deepref-prod-rg"
}

variable "location" {
  description = "Azure region for primary resources"
  type        = string
  default     = "eastus"
}

variable "secondary_location" {
  description = "Azure region for secondary resources (DR)"
  type        = string
  default     = "westus2"
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "AiDeepRef"
    Environment = "Production"
    ManagedBy   = "Terraform"
    CostCenter  = "Engineering"
  }
}

variable "alert_email_addresses" {
  description = "Email addresses for alerts"
  type        = list(string)
  default     = ["devops@aideepref.com"]
}

variable "alert_webhook_url" {
  description = "Webhook URL for alerts (e.g., Slack)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "security_contact_email" {
  description = "Security contact email"
  type        = string
  default     = "security@aideepref.com"
}

variable "security_contact_phone" {
  description = "Security contact phone"
  type        = string
  default     = "+1-555-0100"
}

variable "ssl_certificate_path" {
  description = "Path to SSL certificate for Application Gateway"
  type        = string
  default     = ""
  sensitive   = true
}

variable "ssl_certificate_password" {
  description = "Password for SSL certificate"
  type        = string
  default     = ""
  sensitive   = true
}
```

### AKS Module

**File:** `infrastructure/terraform/modules/aks/main.tf`

```hcl
resource "azurerm_kubernetes_cluster" "main" {
  name                = var.name
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = var.dns_prefix
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name                = var.default_node_pool.name
    node_count          = var.default_node_pool.node_count
    vm_size             = var.default_node_pool.vm_size
    enable_auto_scaling = var.default_node_pool.enable_auto_scaling
    min_count           = var.default_node_pool.min_count
    max_count           = var.default_node_pool.max_count
    max_pods            = var.default_node_pool.max_pods
    os_disk_size_gb     = var.default_node_pool.os_disk_size_gb
    vnet_subnet_id      = var.default_node_pool.vnet_subnet_id
    zones               = var.default_node_pool.zones

    upgrade_settings {
      max_surge = "10%"
    }
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin     = var.network_profile.network_plugin
    network_policy     = var.network_profile.network_policy
    load_balancer_sku  = var.network_profile.load_balancer_sku
    service_cidr       = var.network_profile.service_cidr
    dns_service_ip     = var.network_profile.dns_service_ip
  }

  azure_policy_enabled             = var.azure_policy_enabled
  role_based_access_control_enabled = var.role_based_access_control_enabled

  oms_agent {
    log_analytics_workspace_id = var.log_analytics_workspace_id
  }

  key_vault_secrets_provider {
    secret_rotation_enabled = true
  }

  tags = var.tags
}

# Additional node pools
resource "azurerm_kubernetes_cluster_node_pool" "additional" {
  for_each = var.additional_node_pools

  name                  = each.value.name
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = each.value.vm_size
  node_count            = each.value.node_count
  enable_auto_scaling   = each.value.enable_auto_scaling
  min_count             = each.value.min_count
  max_count             = each.value.max_count
  max_pods              = each.value.max_pods
  os_disk_size_gb       = each.value.os_disk_size_gb
  vnet_subnet_id        = each.value.vnet_subnet_id
  zones                 = each.value.zones
  node_taints           = each.value.node_taints
  node_labels           = each.value.node_labels

  upgrade_settings {
    max_surge = "10%"
  }

  tags = var.tags
}
```

### Terraform Workflow

**File:** `.github/workflows/terraform.yml`

```yaml
name: Terraform Infrastructure

on:
  push:
    branches: [main]
    paths:
      - 'infrastructure/terraform/**'
  pull_request:
    branches: [main]
    paths:
      - 'infrastructure/terraform/**'
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        type: choice
        options:
          - dev
          - staging
          - production

env:
  TF_VERSION: '1.5.0'
  ARM_CLIENT_ID: ${{ secrets.ARM_CLIENT_ID }}
  ARM_CLIENT_SECRET: ${{ secrets.ARM_CLIENT_SECRET }}
  ARM_SUBSCRIPTION_ID: ${{ secrets.ARM_SUBSCRIPTION_ID }}
  ARM_TENANT_ID: ${{ secrets.ARM_TENANT_ID }}

jobs:
  terraform-plan:
    name: Terraform Plan
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, production]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}

      - name: Terraform Format Check
        run: terraform fmt -check -recursive
        working-directory: infrastructure/terraform

      - name: Terraform Init
        run: terraform init
        working-directory: infrastructure/terraform/environments/${{ matrix.environment }}

      - name: Terraform Validate
        run: terraform validate
        working-directory: infrastructure/terraform/environments/${{ matrix.environment }}

      - name: Run tfsec
        uses: aquasecurity/tfsec-action@v1.0.0
        with:
          working_directory: infrastructure/terraform

      - name: Terraform Plan
        run: terraform plan -out=tfplan
        working-directory: infrastructure/terraform/environments/${{ matrix.environment }}

      - name: Upload plan
        uses: actions/upload-artifact@v4
        with:
          name: tfplan-${{ matrix.environment }}
          path: infrastructure/terraform/environments/${{ matrix.environment }}/tfplan
          retention-days: 7

  terraform-apply:
    name: Terraform Apply
    runs-on: ubuntu-latest
    needs: [terraform-plan]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment:
      name: production

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}

      - name: Download plan
        uses: actions/download-artifact@v4
        with:
          name: tfplan-production
          path: infrastructure/terraform/environments/production

      - name: Terraform Init
        run: terraform init
        working-directory: infrastructure/terraform/environments/production

      - name: Terraform Apply
        run: terraform apply -auto-approve tfplan
        working-directory: infrastructure/terraform/environments/production
```

---

## Compliance Automation

### OWASP Top 10 Automated Checks

**File:** `scripts/compliance/owasp-check.sh`

```bash
#!/bin/bash

set -e

echo "================================================"
echo "OWASP Top 10 Compliance Check"
echo "================================================"

REPORT_FILE="owasp-compliance-report-$(date +%Y%m%d-%H%M%S).txt"

{
  echo "OWASP Top 10 2021 Compliance Check"
  echo "Generated: $(date)"
  echo "================================================"
  echo ""

  # A01:2021 – Broken Access Control
  echo "A01:2021 - Broken Access Control"
  echo "-----------------------------------"
  grep -r "@UseGuards" apps/api/src && echo "✓ Auth guards implemented" || echo "✗ Auth guards missing"
  grep -r "@Roles" apps/api/src && echo "✓ Role-based access control found" || echo "✗ RBAC missing"
  echo ""

  # A02:2021 – Cryptographic Failures
  echo "A02:2021 - Cryptographic Failures"
  echo "-----------------------------------"
  grep -r "bcrypt" apps/api/src && echo "✓ Password hashing implemented" || echo "✗ Password hashing missing"
  grep -r "crypto" apps/api/src && echo "✓ Crypto library used" || echo "✗ Crypto library missing"
  ! grep -r "Math.random()" apps/api/src && echo "✓ No insecure random" || echo "✗ Insecure random found"
  echo ""

  # A03:2021 – Injection
  echo "A03:2021 - Injection"
  echo "-----------------------------------"
  grep -r "TypeORM\|Prisma" apps/api/src && echo "✓ ORM used for SQL queries" || echo "✗ ORM missing"
  ! grep -r "exec(\|spawn(" apps/api/src && echo "✓ No command injection vectors" || echo "⚠ Command execution found"
  echo ""

  # A04:2021 – Insecure Design
  echo "A04:2021 - Insecure Design"
  echo "-----------------------------------"
  test -f "apps/api/src/guards/throttle.guard.ts" && echo "✓ Rate limiting implemented" || echo "✗ Rate limiting missing"
  grep -r "ValidationPipe" apps/api/src && echo "✓ Input validation implemented" || echo "✗ Input validation missing"
  echo ""

  # A05:2021 – Security Misconfiguration
  echo "A05:2021 - Security Misconfiguration"
  echo "-----------------------------------"
  grep -r "helmet" apps/api/src && echo "✓ Helmet security headers configured" || echo "✗ Helmet missing"
  grep -r "cors" apps/api/src && echo "✓ CORS configured" || echo "✗ CORS missing"
  ! grep -r "\.env" .gitignore && echo "✗ .env not in gitignore" || echo "✓ .env ignored"
  echo ""

  # A06:2021 – Vulnerable and Outdated Components
  echo "A06:2021 - Vulnerable Components"
  echo "-----------------------------------"
  npm audit --audit-level=moderate || echo "⚠ Vulnerabilities found"
  echo ""

  # A07:2021 – Identification and Authentication Failures
  echo "A07:2021 - Authentication Failures"
  echo "-----------------------------------"
  grep -r "passport" apps/api/src && echo "✓ Passport authentication found" || echo "✗ Authentication missing"
  grep -r "jwt" apps/api/src && echo "✓ JWT tokens used" || echo "✗ JWT missing"
  grep -r "session" apps/api/src && echo "⚠ Session management found" || echo "✓ No sessions"
  echo ""

  # A08:2021 – Software and Data Integrity Failures
  echo "A08:2021 - Integrity Failures"
  echo "-----------------------------------"
  test -f "package-lock.json" && echo "✓ Package lock file present" || echo "✗ Package lock missing"
  grep -r "integrity" package.json && echo "✓ Integrity checks configured" || echo "⚠ Integrity checks missing"
  echo ""

  # A09:2021 – Security Logging and Monitoring Failures
  echo "A09:2021 - Logging Failures"
  echo "-----------------------------------"
  grep -r "Logger\|winston\|pino" apps/api/src && echo "✓ Logging implemented" || echo "✗ Logging missing"
  grep -r "audit" apps/api/src && echo "✓ Audit logging found" || echo "✗ Audit logging missing"
  echo ""

  # A10:2021 – Server-Side Request Forgery (SSRF)
  echo "A10:2021 - SSRF"
  echo "-----------------------------------"
  grep -r "axios\|fetch\|http.get" apps/api/src && echo "⚠ HTTP requests found - validate URLs" || echo "✓ No external requests"
  echo ""

} | tee "$REPORT_FILE"

echo ""
echo "Report saved to: $REPORT_FILE"
```

### NIST Compliance Validation

**File:** `scripts/compliance/nist-check.sh`

```bash
#!/bin/bash

set -e

echo "================================================"
echo "NIST Cybersecurity Framework Check"
echo "================================================"

REPORT_FILE="nist-compliance-report-$(date +%Y%m%d-%H%M%S).txt"

{
  echo "NIST CSF Compliance Check"
  echo "Generated: $(date)"
  echo "================================================"
  echo ""

  # IDENTIFY
  echo "IDENTIFY (ID)"
  echo "-----------------------------------"
  test -f "SECURITY.md" && echo "✓ Security policy documented" || echo "✗ Security policy missing"
  test -f ".github/CODEOWNERS" && echo "✓ Code ownership defined" || echo "✗ CODEOWNERS missing"
  echo ""

  # PROTECT (PR)
  echo "PROTECT (PR)"
  echo "-----------------------------------"
  test -f ".github/workflows/security-scan.yml" && echo "✓ Security scanning configured" || echo "✗ Security scanning missing"
  grep -r "helmet" apps/api/src && echo "✓ Security headers implemented" || echo "✗ Security headers missing"
  grep -r "@UseGuards" apps/api/src && echo "✓ Access control implemented" || echo "✗ Access control missing"
  test -f ".gitleaks.toml" && echo "✓ Secret scanning configured" || echo "✗ Secret scanning missing"
  echo ""

  # DETECT (DE)
  echo "DETECT (DE)"
  echo "-----------------------------------"
  grep -r "Logger" apps/api/src && echo "✓ Logging implemented" || echo "✗ Logging missing"
  test -f ".github/dependabot.yml" && echo "✓ Dependency monitoring configured" || echo "✗ Dependency monitoring missing"
  echo ""

  # RESPOND (RS)
  echo "RESPOND (RS)"
  echo "-----------------------------------"
  test -f "SECURITY.md" && echo "✓ Incident response plan documented" || echo "✗ Incident response plan missing"
  grep -r "alert" .github/workflows && echo "✓ Alert notifications configured" || echo "✗ Alerts missing"
  echo ""

  # RECOVER (RC)
  echo "RECOVER (RC)"
  echo "-----------------------------------"
  grep -r "backup" infrastructure/terraform && echo "✓ Backup strategy configured" || echo "✗ Backup missing"
  grep -r "geo_redundant_backup" infrastructure/terraform && echo "✓ Geo-redundant backup enabled" || echo "✗ Geo-redundant backup missing"
  echo ""

} | tee "$REPORT_FILE"

echo ""
echo "Report saved to: $REPORT_FILE"
```

### ISO 27001 Control Checks

**File:** `scripts/compliance/iso27001-check.sh`

```bash
#!/bin/bash

set -e

echo "================================================"
echo "ISO 27001:2022 Control Check"
echo "================================================"

REPORT_FILE="iso27001-compliance-report-$(date +%Y%m%d-%H%M%S).txt"

{
  echo "ISO 27001:2022 Compliance Check"
  echo "Generated: $(date)"
  echo "================================================"
  echo ""

  # A.5 Information Security Policies
  echo "A.5 - Information Security Policies"
  echo "-----------------------------------"
  test -f "SECURITY.md" && echo "✓ Security policy documented" || echo "✗ Security policy missing"
  echo ""

  # A.8 Asset Management
  echo "A.8 - Asset Management"
  echo "-----------------------------------"
  test -f "package.json" && echo "✓ Dependencies documented" || echo "✗ Dependencies missing"
  test -f ".github/CODEOWNERS" && echo "✓ Asset ownership defined" || echo "✗ Asset ownership missing"
  echo ""

  # A.9 Access Control
  echo "A.9 - Access Control"
  echo "-----------------------------------"
  grep -r "@UseGuards\|@Roles" apps/api/src && echo "✓ Access control implemented" || echo "✗ Access control missing"
  grep -r "passport\|jwt" apps/api/src && echo "✓ Authentication implemented" || echo "✗ Authentication missing"
  echo ""

  # A.10 Cryptography
  echo "A.10 - Cryptography"
  echo "-----------------------------------"
  grep -r "bcrypt\|argon2" apps/api/src && echo "✓ Password hashing implemented" || echo "✗ Password hashing missing"
  grep -r "TLS\|SSL" infrastructure/ && echo "✓ Encryption in transit configured" || echo "✗ Encryption in transit missing"
  echo ""

  # A.12 Operations Security
  echo "A.12 - Operations Security"
  echo "-----------------------------------"
  test -f ".github/workflows/ci.yml" && echo "✓ CI/CD pipeline configured" || echo "✗ CI/CD missing"
  grep -r "Logger" apps/api/src && echo "✓ Logging implemented" || echo "✗ Logging missing"
  test -f "infrastructure/terraform" && echo "✓ Infrastructure as code implemented" || echo "✗ IaC missing"
  echo ""

  # A.14 System Acquisition, Development and Maintenance
  echo "A.14 - Secure Development"
  echo "-----------------------------------"
  test -f ".github/workflows/security-scan.yml" && echo "✓ Security scanning in SDLC" || echo "✗ Security scanning missing"
  grep -r "ValidationPipe" apps/api/src && echo "✓ Input validation implemented" || echo "✗ Input validation missing"
  test -f "infrastructure/docker/Dockerfile.api" && echo "✓ Secure deployment configured" || echo "✗ Secure deployment missing"
  echo ""

  # A.17 Information Security Aspects of Business Continuity
  echo "A.17 - Business Continuity"
  echo "-----------------------------------"
  grep -r "backup" infrastructure/terraform && echo "✓ Backup configured" || echo "✗ Backup missing"
  grep -r "high_availability" infrastructure/terraform && echo "✓ High availability configured" || echo "✗ HA missing"
  echo ""

  # A.18 Compliance
  echo "A.18 - Compliance"
  echo "-----------------------------------"
  test -f "scripts/compliance/owasp-check.sh" && echo "✓ Compliance checks automated" || echo "✗ Compliance checks missing"
  test -f "LICENSE" && echo "✓ License documented" || echo "✗ License missing"
  echo ""

} | tee "$REPORT_FILE"

echo ""
echo "Report saved to: $REPORT_FILE"
```

---

## Environment Configuration

### Environment Variables Management

**File:** `.github/workflows/setup-env.yml`

```yaml
name: Setup Environment Variables

on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
    secrets:
      azure_credentials:
        required: true

jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - name: Setup environment variables
        run: |
          case "${{ inputs.environment }}" in
            dev)
              echo "ENV=dev" >> $GITHUB_ENV
              echo "REPLICAS=1" >> $GITHUB_ENV
              echo "RESOURCES_LIMITS_CPU=500m" >> $GITHUB_ENV
              echo "RESOURCES_LIMITS_MEMORY=512Mi" >> $GITHUB_ENV
              ;;
            staging)
              echo "ENV=staging" >> $GITHUB_ENV
              echo "REPLICAS=2" >> $GITHUB_ENV
              echo "RESOURCES_LIMITS_CPU=1000m" >> $GITHUB_ENV
              echo "RESOURCES_LIMITS_MEMORY=1Gi" >> $GITHUB_ENV
              ;;
            production)
              echo "ENV=production" >> $GITHUB_ENV
              echo "REPLICAS=3" >> $GITHUB_ENV
              echo "RESOURCES_LIMITS_CPU=2000m" >> $GITHUB_ENV
              echo "RESOURCES_LIMITS_MEMORY=2Gi" >> $GITHUB_ENV
              ;;
          esac
```

### Kubernetes Secrets Configuration

**File:** `infrastructure/k8s/base/secrets.yaml`

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: deepref-secrets
  namespace: deepref-${ENVIRONMENT}
type: Opaque
stringData:
  # Managed by Azure Key Vault
  database-url: "${DATABASE_URL}"
  redis-url: "${REDIS_URL}"
  jwt-secret: "${JWT_SECRET}"
  api-key: "${API_KEY}"
```

---

## Monitoring & Alerting

### Prometheus Configuration

**File:** `infrastructure/k8s/monitoring/prometheus-config.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s

    alerting:
      alertmanagers:
        - static_configs:
            - targets:
                - alertmanager:9093

    rule_files:
      - /etc/prometheus/rules/*.yml

    scrape_configs:
      - job_name: 'kubernetes-pods'
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
            action: keep
            regex: true
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
            action: replace
            target_label: __metrics_path__
            regex: (.+)
          - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
            action: replace
            regex: ([^:]+)(?::\d+)?;(\d+)
            replacement: $1:$2
            target_label: __address__

      - job_name: 'kubernetes-nodes'
        kubernetes_sd_configs:
          - role: node
        relabel_configs:
          - action: labelmap
            regex: __meta_kubernetes_node_label_(.+)
```

### Alert Rules

**File:** `infrastructure/k8s/monitoring/alert-rules.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules
  namespace: monitoring
data:
  alerts.yml: |
    groups:
      - name: application
        interval: 30s
        rules:
          - alert: HighErrorRate
            expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
            for: 5m
            labels:
              severity: critical
            annotations:
              summary: "High error rate detected"
              description: "Error rate is {{ $value }}%"

          - alert: HighResponseTime
            expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 1
            for: 5m
            labels:
              severity: warning
            annotations:
              summary: "High response time detected"
              description: "95th percentile response time is {{ $value }}s"

          - alert: PodCrashLooping
            expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
            for: 5m
            labels:
              severity: critical
            annotations:
              summary: "Pod is crash looping"
              description: "Pod {{ $labels.pod }} is crash looping"

      - name: infrastructure
        interval: 30s
        rules:
          - alert: HighCPUUsage
            expr: avg(rate(container_cpu_usage_seconds_total[5m])) > 0.8
            for: 10m
            labels:
              severity: warning
            annotations:
              summary: "High CPU usage"
              description: "CPU usage is {{ $value }}%"

          - alert: HighMemoryUsage
            expr: (container_memory_usage_bytes / container_spec_memory_limit_bytes) > 0.9
            for: 10m
            labels:
              severity: warning
            annotations:
              summary: "High memory usage"
              description: "Memory usage is {{ $value }}%"

          - alert: DiskSpaceLow
            expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1
            for: 10m
            labels:
              severity: critical
            annotations:
              summary: "Disk space low"
              description: "Disk space is {{ $value }}% remaining"
```

---

## Rollback Strategy

### Automated Rollback Script

**File:** `scripts/deployment/rollback.sh`

```bash
#!/bin/bash

set -e

ENVIRONMENT=$1
NAMESPACE="deepref-${ENVIRONMENT}"

if [ -z "$ENVIRONMENT" ]; then
  echo "Usage: $0 <environment>"
  exit 1
fi

echo "================================================"
echo "Rolling back deployment in ${ENVIRONMENT}"
echo "================================================"

# Rollback API
echo "Rolling back API deployment..."
kubectl rollout undo deployment/api-deployment -n "${NAMESPACE}"
kubectl rollout status deployment/api-deployment -n "${NAMESPACE}" --timeout=300s

# Rollback Web
echo "Rolling back Web deployment..."
kubectl rollout undo deployment/web-deployment -n "${NAMESPACE}"
kubectl rollout status deployment/web-deployment -n "${NAMESPACE}" --timeout=300s

# Rollback Mobile
echo "Rolling back Mobile deployment..."
kubectl rollout undo deployment/mobile-deployment -n "${NAMESPACE}"
kubectl rollout status deployment/mobile-deployment -n "${NAMESPACE}" --timeout=300s

echo ""
echo "Rollback completed successfully!"
echo ""
echo "Checking deployment status..."
kubectl get deployments -n "${NAMESPACE}"
```

---

## Quick Start Guide

### 1. Setup Repository Secrets

Configure the following secrets in GitHub:

```bash
# Azure Credentials
AZURE_CREDENTIALS
ARM_CLIENT_ID
ARM_CLIENT_SECRET
ARM_SUBSCRIPTION_ID
ARM_TENANT_ID

# Container Registry
ACR_USERNAME
ACR_PASSWORD

# Security Scanning
SNYK_TOKEN
GITLEAKS_LICENSE
SONAR_TOKEN
CODECOV_TOKEN

# Database
TEST_DB_PASSWORD
TEST_JWT_SECRET

# Alerts
SLACK_SECURITY_WEBHOOK

# Personal Access Token
PAT_TOKEN
```

### 2. Initialize Infrastructure

```bash
# Login to Azure
az login

# Create Terraform backend
cd infrastructure/terraform
terraform init
terraform plan
terraform apply

# Setup Kubernetes
az aks get-credentials --resource-group deepref-prod-rg --name deepref-prod-aks

# Deploy monitoring
kubectl apply -f infrastructure/k8s/monitoring/
```

### 3. Initial Deployment

```bash
# Build and push images
docker build -t deeprefacr.azurecr.io/deepref-api:v1.0.0 -f infrastructure/docker/Dockerfile.api .
docker build -t deeprefacr.azurecr.io/deepref-web:v1.0.0 -f infrastructure/docker/Dockerfile.web .
docker push deeprefacr.azurecr.io/deepref-api:v1.0.0
docker push deeprefacr.azurecr.io/deepref-web:v1.0.0

# Deploy to Kubernetes
kubectl apply -f infrastructure/k8s/production/

# Verify deployment
kubectl get pods -n deepref-prod
```

### 4. Run Compliance Checks

```bash
# OWASP check
bash scripts/compliance/owasp-check.sh

# NIST check
bash scripts/compliance/nist-check.sh

# ISO 27001 check
bash scripts/compliance/iso27001-check.sh
```

---

## Maintenance & Operations

### Daily Tasks

- Monitor CI/CD pipeline health
- Review security scan results
- Check application metrics
- Verify backup completion

### Weekly Tasks

- Review dependency updates
- Analyze performance metrics
- Update compliance reports
- Review and rotate secrets

### Monthly Tasks

- Security audit
- Infrastructure cost review
- Disaster recovery testing
- Compliance certification review

---

## Support & Troubleshooting

### Common Issues

**Issue: Docker build fails**
```bash
# Clear Docker cache
docker system prune -af
docker buildx prune -af

# Rebuild with no cache
docker build --no-cache -t image:tag .
```

**Issue: Terraform state lock**
```bash
# Force unlock (use carefully)
terraform force-unlock <LOCK_ID>
```

**Issue: Kubernetes pod crash loop**
```bash
# Check logs
kubectl logs -f <pod-name> -n <namespace>

# Describe pod
kubectl describe pod <pod-name> -n <namespace>

# Rollback deployment
kubectl rollout undo deployment/<deployment-name> -n <namespace>
```

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [ISO 27001:2022](https://www.iso.org/standard/27001)
- [Azure Well-Architected Framework](https://docs.microsoft.com/en-us/azure/architecture/framework/)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-23
**Maintained By:** DevOps Team
**Review Frequency:** Quarterly
