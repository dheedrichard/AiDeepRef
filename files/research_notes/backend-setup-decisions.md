# Backend Setup Decisions - DeepRef API

**Date:** 2025-11-19
**Agent:** Backend Lead Agent
**Project:** DeepRef AI Reference Verification Platform

## Technology Stack Research

### NestJS Version Selection

**Decision:** Use NestJS 10.4.20 (latest v10.x)

**Rationale:**
- Latest stable version in the 10.x series
- Node.js v22.21.1 compatibility (v10 requires Node v16+)
- TypeScript 5.8+ support (v10 requires TS >= 4.8)
- Production-ready with extensive bug fixes and improvements

**Key Features in NestJS v10:**
1. **SWC Support:** ~20x faster compilation than default TypeScript compiler
2. **Module Overriding:** Enhanced testing capabilities for mocking entire modules
3. **Standalone Cache Module:** @nestjs/cache-manager as separate package
4. **Redis Wildcard Subscriptions:** Pattern-based message subscription support

### TypeScript Configuration

**Decision:** TypeScript 5.8+ with strict mode enabled

**Configuration:**
- `strict: true` - Enable all strict type-checking options
- `esModuleInterop: true` - Better CommonJS/ESM compatibility
- `skipLibCheck: true` - Faster compilation
- `forceConsistentCasingInFileNames: true` - Cross-platform consistency
- `target: ES2022` - Modern JavaScript features
- `module: commonjs` - Node.js compatibility

### Database Stack

**Decision:** TypeORM with PostgreSQL 17

**Packages:**
- `typeorm@^0.3.x` - Latest stable ORM
- `pg@^8.x` - PostgreSQL driver
- `@nestjs/typeorm` - NestJS TypeORM integration

**Entity Strategy:**
- One entity per domain model (User, Seeker, Referrer, Reference, Bundle)
- Use decorators for validation and transformation
- Separate DTOs for request/response validation

### Authentication Strategy

**Decision:** Passport.js with JWT strategy

**Packages:**
- `@nestjs/passport` - NestJS Passport integration
- `@nestjs/jwt` - JWT utilities
- `passport` - Core authentication library
- `passport-jwt` - JWT authentication strategy
- `bcrypt` - Password hashing

**Implementation:**
- JWT tokens for stateless authentication
- Magic link authentication support
- Email verification with OTP
- Role-based access control (RBAC)

### Validation & Transformation

**Decision:** Class-validator + Class-transformer

**Packages:**
- `class-validator@^0.14.x` - Decorator-based validation
- `class-transformer@^0.5.x` - Plain-to-class transformation

**Usage:**
- DTOs for all request bodies
- Automatic validation pipe globally enabled
- Transform interceptor for response serialization

### Logging Strategy

**Decision:** Winston logger with NestJS integration

**Packages:**
- `winston@^3.x` - Logging library
- `nest-winston` - NestJS Winston integration

**Configuration:**
- JSON format for production
- Pretty print for development
- Log levels: error, warn, info, debug
- File rotation for production logs

### Development Tools

**ESLint Configuration:**
- `@typescript-eslint/parser`
- `@typescript-eslint/eslint-plugin`
- NestJS-specific rules
- Prettier integration

**Prettier Configuration:**
- Single quotes
- 2-space indentation
- 100 character line width
- Trailing commas

**Testing:**
- Jest as test runner
- Supertest for E2E testing
- `@nestjs/testing` utilities
- Coverage reporting enabled

## Module Architecture

### Directory Structure

```
apps/api/
├── src/
│   ├── auth/              # Authentication & authorization
│   ├── seekers/           # Seeker-related endpoints
│   ├── referrers/         # Referrer-related endpoints
│   ├── references/        # Reference management
│   ├── bundles/           # Bundle creation & sharing
│   ├── ai/                # AI/ML integrations
│   ├── database/          # Database configuration & entities
│   ├── common/            # Shared utilities, decorators, guards
│   ├── app.module.ts      # Root application module
│   └── main.ts            # Application entry point
├── test/                  # E2E tests
├── .env.example           # Environment variable template
├── .eslintrc.js           # ESLint configuration
├── .prettierrc            # Prettier configuration
├── nest-cli.json          # NestJS CLI configuration
├── tsconfig.json          # TypeScript configuration
├── package.json           # Dependencies
└── README.md              # Setup documentation
```

### Module Responsibilities

1. **AuthModule:**
   - User registration (signup)
   - Authentication (signin with password/magic link)
   - Email verification
   - JWT token generation
   - Password hashing and validation

2. **SeekersModule:**
   - Profile management
   - KYC document upload
   - Selfie verification
   - Reference request creation
   - Profile retrieval

3. **ReferrersModule:**
   - Referrer profile management
   - Reference request handling
   - Reference submission
   - Notification preferences

4. **ReferencesModule:**
   - Reference CRUD operations
   - Media upload handling
   - RCS score calculation
   - Reference status management

5. **BundlesModule:**
   - Bundle creation
   - Bundle sharing (link generation)
   - Access control (password protection)
   - Aggregated RCS calculation

6. **AiModule:**
   - Media authenticity verification
   - Deepfake detection
   - Question generation
   - AI model integration

7. **DatabaseModule:**
   - TypeORM configuration
   - Entity definitions
   - Migration management
   - Seeding utilities

8. **CommonModule:**
   - Guards (JWT, Roles)
   - Interceptors (Transform, Logging)
   - Decorators (User, Roles)
   - Filters (Exception handling)
   - Pipes (Validation)

## API Design Principles

### RESTful Conventions
- Use HTTP methods appropriately (GET, POST, PUT, PATCH, DELETE)
- Versioned API (v1) at `/api/v1`
- Resource-based URLs
- Proper HTTP status codes

### Error Handling
- Global exception filter
- Standardized error response format
- Detailed error messages in development
- Generic messages in production

### Request Validation
- DTO validation for all endpoints
- Type coercion enabled
- Whitelist unknown properties
- Transform payloads automatically

### Response Formatting
- Consistent response structure
- Serialization with class-transformer
- Exclude sensitive fields (passwords, tokens)

## Configuration Management

### Environment Variables
- `.env` file for local development
- `.env.example` as template
- Validation on startup
- Type-safe configuration using `@nestjs/config`

**Required Variables:**
```
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=deepref

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d

# Application
PORT=3000
NODE_ENV=development
```

## OpenAPI/Swagger Documentation

**Decision:** Use @nestjs/swagger for API documentation

**Features:**
- Auto-generated OpenAPI spec
- Interactive API explorer
- DTO decorators for schema generation
- Available at `/api/docs`

## Next Steps

1. Initialize NestJS project with CLI
2. Set up all modules with basic structure
3. Configure database connection
4. Implement authentication flow
5. Create entity models based on API contracts
6. Stub out all controllers with endpoint definitions
7. Add Swagger decorators
8. Write unit and E2E tests
9. Create comprehensive README

## References

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [Passport.js Documentation](http://www.passportjs.org/)
- [NestJS v10 Release Notes](https://trilon.io/blog/nestjs-10-is-now-available)
