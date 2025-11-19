# Integration Test Execution Guide

## Quick Start

### Step 1: Set Up Test Database

```bash
# Option A: Using the provided script (requires sudo/postgres access)
cd /home/user/AiDeepRef/apps/api
sudo scripts/setup-test-db.sh

# Option B: Manual setup
psql -U postgres <<EOF
DROP DATABASE IF EXISTS deepref_test;
DROP USER IF EXISTS deepref_test;
CREATE USER deepref_test WITH PASSWORD 'test_password';
CREATE DATABASE deepref_test OWNER deepref_test;
GRANT ALL PRIVILEGES ON DATABASE deepref_test TO deepref_test;
EOF
```

### Step 2: Verify Environment Configuration

```bash
# Check .env.test file exists
cat /home/user/AiDeepRef/apps/api/.env.test

# Key configurations should be:
# NODE_ENV=test
# TEST_DATABASE_NAME=deepref_test
# TEST_DATABASE_USERNAME=deepref_test
# TEST_DATABASE_PASSWORD=test_password
```

### Step 3: Run Tests

```bash
cd /home/user/AiDeepRef/apps/api

# Run all integration tests
npm run test:e2e

# Run with verbose output
npm run test:e2e -- --verbose

# Run specific test file
npm run test:e2e -- auth.e2e-spec
npm run test:e2e -- seekers.e2e-spec
npm run test:e2e -- references.e2e-spec
npm run test:e2e -- bundles.e2e-spec
npm run test:e2e -- database.e2e-spec

# Run with coverage report
npm run test:e2e -- --coverage

# Run in watch mode (for development)
npm run test:e2e -- --watch
```

## Expected Output

### Successful Test Run

```
PASS test/auth.e2e-spec.ts
  Auth Endpoints (E2E)
    POST /api/v1/auth/signup
      ✓ should successfully register a new user (XXXms)
      ✓ should hash the password correctly (XXXms)
      ✓ should generate email verification code (XXXms)
      ... (25 more tests)

PASS test/seekers.e2e-spec.ts
  Seekers Endpoints (E2E)
    GET /api/v1/seekers/:id/profile
      ✓ should get seeker profile with valid token (XXXms)
      ... (17 more tests)

PASS test/references.e2e-spec.ts
PASS test/bundles.e2e-spec.ts
PASS test/database.e2e-spec.ts

Test Suites: 5 passed, 5 total
Tests:       119 passed, 119 total
Snapshots:   0 total
Time:        XX.XXXs
```

## Troubleshooting

### Issue: Database Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL if not running
sudo systemctl start postgresql

# Verify connection
psql -U postgres -c "SELECT version();"
```

### Issue: Database Does Not Exist

```
Error: database "deepref_test" does not exist
```

**Solution:**
```bash
# Recreate test database
psql -U postgres -c "CREATE DATABASE deepref_test;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE deepref_test TO deepref_test;"
```

### Issue: Permission Denied

```
Error: permission denied for database deepref_test
```

**Solution:**
```bash
# Grant proper permissions
psql -U postgres -c "ALTER DATABASE deepref_test OWNER TO deepref_test;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE deepref_test TO deepref_test;"
```

### Issue: Tests Timeout

```
Timeout - Async callback was not invoked within the 30000 ms timeout
```

**Solution:**
1. Increase timeout in `test/jest-e2e.json`:
   ```json
   {
     "testTimeout": 60000
   }
   ```

2. Check database performance:
   ```bash
   psql -U postgres -d deepref_test -c "ANALYZE;"
   ```

### Issue: Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution:**
```bash
# Find and kill process using port 3001
lsof -ti:3001 | xargs kill -9

# Or use a different port in .env.test
PORT=3002
```

## Test Database Management

### Reset Test Database

```bash
# Drop and recreate (clean slate)
psql -U postgres <<EOF
DROP DATABASE IF EXISTS deepref_test;
CREATE DATABASE deepref_test OWNER deepref_test;
EOF
```

### Check Test Database State

```bash
# Connect to test database
psql -U deepref_test -d deepref_test

# List tables
\dt

# Check table contents
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM references;
SELECT COUNT(*) FROM bundles;

# Exit
\q
```

### Manual Cleanup (if needed)

```bash
psql -U deepref_test -d deepref_test <<EOF
TRUNCATE TABLE kyc_documents CASCADE;
TRUNCATE TABLE bundle_references CASCADE;
TRUNCATE TABLE bundles CASCADE;
TRUNCATE TABLE references CASCADE;
TRUNCATE TABLE users CASCADE;
EOF
```

## Running Tests in CI/CD

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: deepref_test
          POSTGRES_USER: deepref_test
          POSTGRES_PASSWORD: test_password
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:e2e
        env:
          TEST_DATABASE_HOST: localhost
          TEST_DATABASE_PORT: 5432
          TEST_DATABASE_NAME: deepref_test
          TEST_DATABASE_USERNAME: deepref_test
          TEST_DATABASE_PASSWORD: test_password

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        if: always()
        with:
          files: ./coverage-e2e/lcov.info
```

### GitLab CI Example

```yaml
test:integration:
  image: node:18
  services:
    - postgres:15
  variables:
    POSTGRES_DB: deepref_test
    POSTGRES_USER: deepref_test
    POSTGRES_PASSWORD: test_password
    TEST_DATABASE_HOST: postgres
    TEST_DATABASE_PORT: 5432
    TEST_DATABASE_NAME: deepref_test
    TEST_DATABASE_USERNAME: deepref_test
    TEST_DATABASE_PASSWORD: test_password
  script:
    - npm ci
    - npm run test:e2e
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage-e2e/cobertura-coverage.xml
```

## Performance Monitoring

### Track Test Execution Time

```bash
# Run with timing information
npm run test:e2e -- --verbose 2>&1 | tee test-results.log

# Extract timing information
grep -E "PASS|Time:" test-results.log
```

### Benchmark Individual Tests

Add to specific tests:
```typescript
it('should handle operation within acceptable time', async () => {
  const startTime = Date.now();

  // Your test code here
  await request(app.getHttpServer())
    .get('/api/v1/endpoint')
    .expect(200);

  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log(`Test duration: ${duration}ms`);
  expect(duration).toBeLessThan(500);
});
```

## Test Coverage Reports

### Generate Coverage Report

```bash
cd /home/user/AiDeepRef/apps/api

# Generate HTML coverage report
npm run test:e2e -- --coverage --coverageReporters=html

# View coverage report
open coverage-e2e/index.html
# or
xdg-open coverage-e2e/index.html
```

### Coverage Thresholds

Update `test/jest-e2e.json` to enforce coverage thresholds:

```json
{
  "coverageThreshold": {
    "global": {
      "branches": 70,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

## Development Workflow

### During Development

1. **Run tests in watch mode:**
   ```bash
   npm run test:e2e -- --watch
   ```

2. **Run specific test file:**
   ```bash
   npm run test:e2e -- auth.e2e-spec --watch
   ```

3. **Run specific test:**
   ```bash
   npm run test:e2e -- -t "should successfully register a new user"
   ```

### Before Committing

```bash
# Run full test suite
npm run test:e2e

# Check for TypeScript errors
npm run build

# Run linter
npm run lint
```

### Before Deploying

```bash
# Full test suite with coverage
npm run test:e2e -- --coverage

# Ensure all tests pass
# Review coverage report
# Check for any warnings
```

## Test Data Management

### Using Test Fixtures

```typescript
import { testUsers, testReferenceRequest } from './fixtures/test-data';

// Use in your tests
await request(app.getHttpServer())
  .post('/api/v1/auth/signup')
  .send(testUsers.seeker1);
```

### Creating Custom Test Data

```typescript
// In your test file
const customUser = {
  firstName: 'Custom',
  lastName: 'User',
  email: 'custom@test.com',
  password: 'CustomPass123!',
  role: UserRole.SEEKER,
};
```

## Best Practices

1. **Always clean up:** Tests use `afterEach` hooks to clean database
2. **Use fixtures:** Leverage pre-defined test data from `fixtures/test-data.ts`
3. **Test isolation:** Each test should be independent
4. **Descriptive names:** Use clear, descriptive test names
5. **Test both success and failure:** Cover happy paths and error cases
6. **Check API contracts:** Validate response structures
7. **Monitor performance:** Include timing assertions where appropriate

## Getting Help

### Documentation
- Test Documentation: `/home/user/AiDeepRef/apps/api/test/TEST_DOCUMENTATION.md`
- Test Summary: `/home/user/AiDeepRef/apps/api/test/TEST_SUMMARY.md`
- This Guide: `/home/user/AiDeepRef/apps/api/test/EXECUTION_GUIDE.md`

### Common Commands Reference

```bash
# List all test files
npm run test:e2e -- --listTests

# Run with debug output
NODE_ENV=test DEBUG=* npm run test:e2e

# Run single test file with full output
npm run test:e2e -- auth.e2e-spec --verbose

# Check Jest configuration
cat test/jest-e2e.json

# Check environment configuration
cat .env.test
```

## Success Criteria

Your test suite is working correctly when:
- ✅ All tests pass
- ✅ No timeout errors
- ✅ No database connection errors
- ✅ Coverage reports are generated
- ✅ Tests complete in reasonable time (<2 minutes)
- ✅ Database is properly cleaned between tests
