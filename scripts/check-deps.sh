#!/bin/bash

# DeepRef Dependency Security Check Script
# Checks for security vulnerabilities in dependencies

set -e

echo "🔍 DeepRef Dependency Security Check"
echo "====================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ISSUES_FOUND=0

echo "1️⃣  Running npm audit..."
if npm audit --audit-level=moderate; then
    echo -e "${GREEN}✓ npm audit passed${NC}"
else
    echo -e "${YELLOW}⚠ npm audit found issues${NC}"
    ISSUES_FOUND=1
fi
echo ""

echo "2️⃣  Checking for outdated packages..."
npm outdated || true
echo ""

echo "3️⃣  Running Snyk (if available)..."
if command -v snyk &> /dev/null; then
    if snyk test --severity-threshold=high; then
        echo -e "${GREEN}✓ Snyk scan passed${NC}"
    else
        echo -e "${YELLOW}⚠ Snyk found vulnerabilities${NC}"
        ISSUES_FOUND=1
    fi
else
    echo -e "${YELLOW}⚠ Snyk not installed, skipping${NC}"
fi
echo ""

echo "4️⃣  Scanning for secrets..."
if command -v gitleaks &> /dev/null; then
    if gitleaks detect --verbose; then
        echo -e "${GREEN}✓ No secrets detected${NC}"
    else
        echo -e "${RED}❌ Secrets detected!${NC}"
        ISSUES_FOUND=1
    fi
else
    echo -e "${YELLOW}⚠ Gitleaks not installed, skipping${NC}"
fi
echo ""

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ All security checks passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some issues found. Please review above.${NC}"
    exit 1
fi
