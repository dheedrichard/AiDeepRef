# DeepRef API Integration Test Suite

## Overview

This directory contains comprehensive integration tests for the DeepRef API backend. The test suite covers all major API endpoints, database operations, and integration scenarios.

## Test Structure

```
test/
├── auth.e2e-spec.ts           # Authentication endpoint tests
├── seekers.e2e-spec.ts         # Seeker endpoint tests
├── references.e2e-spec.ts      # Reference endpoint tests
├── bundles.e2e-spec.ts         # Bundle endpoint tests
├── database.e2e-spec.ts        # Database integration tests
├── helpers/
│   ├── test-db.ts             # Test database helper utilities
│   └── test-utils.ts          # Common test utilities and assertions
├── fixtures/
│   └── test-data.ts           # Test data fixtures
└── TEST_DOCUMENTATION.md       # This file
```

## Test Coverage

### 1. Authentication Tests (`auth.e2e-spec.ts`)

**Endpoints Tested:**
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/signin`
- `POST /api/v1/auth/verify-email`

**Test Scenarios:**
- ✓ Successful user registration
- ✓ Password hashing validation
- ✓ Email verification code generation
- ✓ Duplicate email rejection
- ✓ Invalid email format rejection
- ✓ Password length validation
- ✓ Missing required fields rejection
- ✓ Invalid role rejection
- ✓ Successful sign-in with correct credentials
- ✓ Last login timestamp update
- ✓ Incorrect password rejection
- ✓ Non-existent user rejection
- ✓ JWT token generation and validation
- ✓ Email verification with valid OTP
- ✓ Invalid OTP rejection
- ✓ Expired OTP rejection
- ✓ API contract validation

### 2. Seeker Endpoint Tests (`seekers.e2e-spec.ts`)

**Endpoints Tested:**
- `GET /api/v1/seekers/:id/profile`
- `POST /api/v1/seekers/:id/references/request`

**Test Scenarios:**
- ✓ Profile retrieval with authentication
- ✓ Unauthorized access rejection
- ✓ Invalid token rejection
- ✓ Successful reference request creation
- ✓ Missing field validation
- ✓ Invalid email format rejection
- ✓ Empty questions array rejection
- ✓ Invalid format rejection
- ✓ Multiple reference requests
- ✓ Authorization checks
- ✓ API contract validation
- ✓ Performance testing
- ✓ Concurrent request handling

### 3. Reference Endpoint Tests (`references.e2e-spec.ts`)

**Endpoints Tested:**
- `GET /api/v1/references/:id`
- `POST /api/v1/references/:id/submit`
- `GET /api/v1/references/seeker/:seekerId`
- `PATCH /api/v1/references/:id/status`

**Test Scenarios:**
- ✓ Reference retrieval by ID
- ✓ Reference submission (text, video, audio formats)
- ✓ Submission timestamp validation
- ✓ Invalid format rejection
- ✓ Missing responses rejection
- ✓ Listing references by seeker
- ✓ Status updates
- ✓ Complete reference lifecycle
- ✓ Reference expiry handling
- ✓ AI scores validation
- ✓ Performance testing

### 4. Bundle Endpoint Tests (`bundles.e2e-spec.ts`)

**Endpoints Tested:**
- `POST /api/v1/bundles`
- `GET /api/v1/bundles/:id`
- `GET /api/v1/bundles/share/:shareLink`
- `PATCH /api/v1/bundles/:id`
- `DELETE /api/v1/bundles/:id`

**Test Scenarios:**
- ✓ Bundle creation
- ✓ Unique share link generation
- ✓ Password protection
- ✓ Expiry date handling
- ✓ Bundle retrieval by ID and share link
- ✓ View count increment
- ✓ Password verification
- ✓ Inactive bundle handling
- ✓ Expired bundle handling
- ✓ Bundle updates and deletion
- ✓ API contract validation

### 5. Database Integration Tests (`database.e2e-spec.ts`)

**Operations Tested:**
- User CRUD operations
- Reference CRUD operations
- Bundle CRUD operations
- KYC Document operations
- Complex database operations (cascades, transactions)
- Relationship loading
- Performance benchmarks

**Test Scenarios:**
- ✓ User creation, retrieval, update, deletion
- ✓ Unique email constraint enforcement
- ✓ Different user roles handling
- ✓ Reference creation with relationships
- ✓ Reference status updates
- ✓ AI score storage
- ✓ Bundle creation with references
- ✓ Share link uniqueness
- ✓ KYC document management
- ✓ Cascade operations
- ✓ Transaction handling
- ✓ Batch operations performance

## Running the Tests

### Prerequisites

1. **PostgreSQL Test Database:**
   ```bash
   # Create test database
   createdb deepref_test

   # Or using psql
   psql -U postgres -c "CREATE DATABASE deepref_test;"
   psql -U postgres -c "CREATE USER deepref_test WITH PASSWORD 'test_password';"
   psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE deepref_test TO deepref_test;"
   ```

2. **Environment Configuration:**
   - Copy `.env.test` to your environment
   - Update database credentials if needed

### Run All Integration Tests

```bash
cd /home/user/AiDeepRef/apps/api
npm run test:e2e
```

### Run Specific Test Suite

```bash
# Auth tests only
npm run test:e2e -- auth.e2e-spec

# Seekers tests only
npm run test:e2e -- seekers.e2e-spec

# References tests only
npm run test:e2e -- references.e2e-spec

# Bundles tests only
npm run test:e2e -- bundles.e2e-spec

# Database tests only
npm run test:e2e -- database.e2e-spec
```

### Run with Coverage

```bash
npm run test:e2e -- --coverage
```

### Run in Watch Mode

```bash
npm run test:e2e -- --watch
```

## Test Database Management

### Automatic Cleanup

The test suite automatically:
- Creates a fresh database schema before each test run
- Truncates all tables after each test
- Drops and recreates schema on test suite initialization

### Manual Cleanup

```bash
# Drop test database
dropdb deepref_test

# Recreate
createdb deepref_test
```

## Test Data Fixtures

Test data is defined in `fixtures/test-data.ts`:

- **Test Users:** Pre-defined users for different roles (seeker, referrer, employer)
- **Reference Requests:** Sample reference request data
- **Bundles:** Sample bundle data
- **Invalid Data:** Various invalid inputs for negative testing

## Test Utilities

### Helper Functions (`helpers/test-utils.ts`)

- `createTestApp()`: Creates a fully configured test application
- `extractToken()`: Extracts JWT token from response
- `expectValidationError()`: Asserts validation error response
- `expectUnauthorizedError()`: Asserts unauthorized error response
- `expectNotFoundError()`: Asserts not found error response
- `expectConflictError()`: Asserts conflict error response

### Database Helper (`helpers/test-db.ts`)

- `TestDatabase.connect()`: Initialize test database connection
- `TestDatabase.disconnect()`: Close database connection
- `TestDatabase.cleanDatabase()`: Clean all tables
- `TestDatabase.getDataSource()`: Get TypeORM data source

## API Contract Validation

Each test suite includes API contract validation to ensure:
- Response structure matches documented API contracts
- All required fields are present
- Data types are correct
- UUID formats are valid
- Sensitive data is not exposed

## Performance Benchmarks

Performance tests validate:
- API endpoints respond within acceptable time limits
- Database operations complete efficiently
- Concurrent requests are handled properly
- Batch operations scale appropriately

**Performance Targets:**
- Simple queries: < 500ms
- Reference creation: < 1000ms
- Batch operations (50 records): < 2000ms

## Common Issues and Solutions

### Issue: Test Database Connection Failed

**Solution:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify test database exists
psql -U postgres -l | grep deepref_test

# Recreate if needed
dropdb deepref_test && createdb deepref_test
```

### Issue: Port Already in Use

**Solution:**
```bash
# Kill process using port 3001
lsof -ti:3001 | xargs kill -9
```

### Issue: Tests Timeout

**Solution:**
- Increase Jest timeout in `jest-e2e.json`
- Check database connection performance
- Ensure test database is not under heavy load

### Issue: Unique Constraint Violations

**Solution:**
- Ensure `afterEach` hooks are properly cleaning up data
- Check for orphaned data from previous test runs
- Manually truncate tables if needed

## Best Practices

1. **Test Isolation:** Each test should be independent and not rely on other tests
2. **Data Cleanup:** Always clean up test data in `afterEach` hooks
3. **Descriptive Names:** Use clear, descriptive test names
4. **Arrange-Act-Assert:** Follow AAA pattern in tests
5. **Mock External Services:** Don't call real external APIs in tests
6. **Test Edge Cases:** Include tests for error conditions and edge cases
7. **Performance Awareness:** Monitor test execution time

## CI/CD Integration

The test suite is designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Integration Tests
  run: |
    npm run test:e2e
  env:
    TEST_DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
```

## Test Metrics

Expected test execution times (approximate):
- Auth tests: ~5-10 seconds
- Seekers tests: ~8-12 seconds
- References tests: ~10-15 seconds
- Bundles tests: ~12-18 seconds
- Database tests: ~8-12 seconds

**Total suite execution:** ~45-70 seconds

## Maintenance

### Adding New Tests

1. Create test file in `/test` directory
2. Follow existing test structure and patterns
3. Use shared fixtures and utilities
4. Include happy path and error cases
5. Validate API contracts
6. Update this documentation

### Updating Test Data

1. Modify fixtures in `fixtures/test-data.ts`
2. Ensure all tests still pass
3. Update documentation if data structure changes

## Support

For issues or questions about the test suite:
- Review existing test files for examples
- Check this documentation
- Consult NestJS testing documentation: https://docs.nestjs.com/fundamentals/testing
