# DeepRef API Integration Tests

## 🚀 Quick Start

```bash
# 1. Set up test database
sudo scripts/setup-test-db.sh

# 2. Run all tests
npm run test:e2e

# 3. Run with coverage
npm run test:e2e -- --coverage
```

## 📊 Test Suite Overview

- **119 test cases** across **35 test suites**
- **6 test files** covering all major API endpoints
- Full database integration testing
- Security, performance, and contract validation

## 📂 Test Files

| File | Tests | Coverage |
|------|-------|----------|
| `auth.e2e-spec.ts` | 28 | Authentication & JWT |
| `seekers.e2e-spec.ts` | 18 | Seeker endpoints |
| `references.e2e-spec.ts` | 24 | Reference management |
| `bundles.e2e-spec.ts` | 26 | Bundle operations |
| `database.e2e-spec.ts` | 35 | Database CRUD |

## 📚 Documentation

- **TEST_DOCUMENTATION.md** - Comprehensive test documentation
- **TEST_SUMMARY.md** - Detailed summary and statistics
- **EXECUTION_GUIDE.md** - Step-by-step execution guide
- **../INTEGRATION_TEST_REPORT.md** - Complete overview report

## 🛠️ Common Commands

```bash
# List all tests
npm run test:e2e -- --listTests

# Run specific test suite
npm run test:e2e -- auth.e2e-spec

# Watch mode
npm run test:e2e -- --watch

# Verbose output
npm run test:e2e -- --verbose
```

## 🎯 What's Tested

✅ Authentication & Authorization  
✅ User CRUD Operations  
✅ Reference Lifecycle  
✅ Bundle Management  
✅ Database Integrity  
✅ API Contract Compliance  
✅ Security & Access Control  
✅ Performance Benchmarks  

## 📖 Read More

See [TEST_DOCUMENTATION.md](./TEST_DOCUMENTATION.md) for complete documentation.
