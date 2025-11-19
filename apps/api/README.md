# DeepRef API

AI-powered reference verification platform backend built with NestJS 10.

## Overview

DeepRef API is a RESTful backend service that powers the DeepRef platform - an AI-enhanced reference verification system for job seekers, referrers, and employers. The API handles authentication, reference management, KYC verification, bundle creation, and AI-powered authenticity verification.

## Tech Stack

- **Framework:** NestJS 10.4.20
- **Language:** TypeScript 5.8+
- **Database:** PostgreSQL 17 with TypeORM
- **Authentication:** JWT with Passport.js
- **Validation:** class-validator & class-transformer
- **Documentation:** Swagger/OpenAPI
- **Logging:** Winston
- **Testing:** Jest & Supertest

## Project Structure

```
apps/api/
├── src/
│   ├── auth/              # Authentication & authorization
│   │   ├── dto/           # Data transfer objects
│   │   ├── strategies/    # Passport strategies (JWT)
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── seekers/           # Job seeker endpoints
│   │   ├── dto/
│   │   ├── seekers.controller.ts
│   │   ├── seekers.service.ts
│   │   └── seekers.module.ts
│   ├── referrers/         # Referrer endpoints
│   ├── references/        # Reference management
│   ├── bundles/           # Bundle creation & sharing
│   ├── ai/                # AI/ML integrations
│   ├── database/          # Database configuration & entities
│   │   └── entities/      # TypeORM entities
│   ├── common/            # Shared utilities
│   │   ├── decorators/    # Custom decorators
│   │   └── guards/        # Auth guards
│   ├── app.module.ts      # Root module
│   └── main.ts            # Application entry point
├── test/                  # E2E tests
├── .env.example           # Environment variables template
├── nest-cli.json          # NestJS CLI configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies
```

## Prerequisites

- **Node.js:** v16+ (v22.21.1 recommended)
- **npm:** v10+
- **PostgreSQL:** v17 (or v14+)
- **Redis:** v7.4 (optional, for future caching)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Update the environment variables:

```env
# Application
NODE_ENV=development
PORT=3000
CORS_ORIGIN=*

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=deepref

# JWT
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRATION=7d
```

### 3. Database Setup

Create the database:

```bash
createdb deepref
```

Or using psql:

```sql
CREATE DATABASE deepref;
```

The application will automatically synchronize the schema on startup in development mode.

### 4. Run the Application

**Development mode with hot-reload:**

```bash
npm run start:dev
```

**Production mode:**

```bash
npm run build
npm run start:prod
```

The API will be available at:
- **API Base:** http://localhost:3000/api/v1
- **Swagger Docs:** http://localhost:3000/api/docs

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the application |
| `npm run start:dev` | Start in watch mode (development) |
| `npm run start:debug` | Start in debug mode |
| `npm run start:prod` | Start in production mode |
| `npm run build` | Build the application |
| `npm run format` | Format code with Prettier |
| `npm run lint` | Lint and fix code with ESLint |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:cov` | Run tests with coverage |
| `npm run test:e2e` | Run end-to-end tests |

## API Endpoints

### Authentication

- `POST /api/v1/auth/signup` - Create new user account
- `POST /api/v1/auth/signin` - Sign in with email/password
- `POST /api/v1/auth/verify-email` - Verify email with OTP

### Seekers

- `GET /api/v1/seekers/:id/profile` - Get seeker profile
- `POST /api/v1/seekers/:id/kyc/upload` - Upload ID document
- `POST /api/v1/seekers/:id/kyc/selfie` - Upload selfie for liveness check
- `POST /api/v1/seekers/:id/references/request` - Create reference request

### References

- `GET /api/v1/references/:id` - Get reference details
- `POST /api/v1/references/:id/submit` - Submit reference response

### Bundles

- `POST /api/v1/bundles` - Create reference bundle
- `GET /api/v1/bundles/:id` - Get bundle details

### AI/ML

- `POST /api/v1/ai/verify-authenticity` - Verify media authenticity
- `POST /api/v1/ai/generate-questions` - Generate contextual questions

For detailed API documentation, visit the Swagger UI at `/api/docs` when running the application.

## Database Schema

### User Entity
- Multi-role support (seeker, referrer, employer)
- Email verification with OTP
- KYC status tracking
- Password hashing with bcrypt

### Reference Entity
- Supports video, audio, and text formats
- RCS (Reference Credibility Score) calculation
- AI authenticity verification
- Employer reachback permissions

### Bundle Entity
- Aggregate multiple references
- Password protection
- Expiry dates
- View tracking

### KYC Document Entity
- Multiple document type support
- Liveness detection
- Verification status tracking

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Token expiration is configurable via `JWT_EXPIRATION` environment variable (default: 7 days).

## Validation

All request bodies are automatically validated using class-validator decorators. Invalid requests return a 400 Bad Request with detailed error messages.

## Error Handling

The API uses standard HTTP status codes:

- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `500 Internal Server Error` - Server error

## Logging

Winston logger is configured with:
- Console output (colorized in development)
- File output (`logs/error.log` and `logs/combined.log`)
- JSON format for structured logging
- Context-aware logging

## Testing

### Unit Tests

```bash
npm test
```

### E2E Tests

```bash
npm run test:e2e
```

### Coverage Report

```bash
npm run test:cov
```

## Code Quality

### Linting

```bash
npm run lint
```

### Formatting

```bash
npm run format
```

Configuration files:
- ESLint: `.eslintrc.js`
- Prettier: `.prettierrc`
- TypeScript: `tsconfig.json`

## Deployment

### Build for Production

```bash
npm run build
```

### Environment Variables

Ensure all production environment variables are set:

```env
NODE_ENV=production
PORT=3000
DATABASE_HOST=your-prod-db-host
DATABASE_PASSWORD=secure-password
JWT_SECRET=secure-random-secret
```

### Docker (Future)

A Dockerfile will be provided for containerized deployment.

## TODO / Future Enhancements

- [ ] Implement magic link authentication
- [ ] Add Redis caching layer
- [ ] Integrate file storage (S3/GCS)
- [ ] Implement email notification service
- [ ] Add AI/ML service integration for deepfake detection
- [ ] Implement RCS score calculation algorithm
- [ ] Add rate limiting
- [ ] Set up API versioning strategy
- [ ] Add database migrations with TypeORM
- [ ] Implement comprehensive E2E tests
- [ ] Add API request/response logging middleware
- [ ] Set up monitoring and alerting
- [ ] Implement audit logging
- [ ] Add API key authentication for third-party integrations

## Development Guidelines

### Adding a New Module

1. Generate module using NestJS CLI:
   ```bash
   nest generate module <module-name>
   nest generate controller <module-name>
   nest generate service <module-name>
   ```

2. Create DTOs in `<module-name>/dto/`
3. Add validation decorators to DTOs
4. Implement service methods
5. Add Swagger decorators to controllers
6. Write unit tests
7. Update this README

### Database Migrations

Currently, the application uses TypeORM's `synchronize: true` for development. For production, proper migrations should be created:

```bash
npm run typeorm migration:generate -- -n MigrationName
npm run typeorm migration:run
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run linter and tests
4. Submit a pull request

## Support

For issues and questions, please contact the DeepRef team or create an issue in the repository.

## License

MIT License - see LICENSE file for details.

---

**Built with ❤️ by the DeepRef Team**
