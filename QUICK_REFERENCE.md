# Quick Reference Guide - Authentication Endpoints

## Table of Contents
1. [File Locations](#file-locations)
2. [Quick Commands](#quick-commands)
3. [Common Code Snippets](#common-code-snippets)
4. [Testing Examples](#testing-examples)
5. [Troubleshooting](#troubleshooting)

---

## File Locations

### Files to Update
```
/home/user/AiDeepRef/apps/api/src/
├── auth/
│   ├── auth.service.ts          ⚠️ UPDATE - Add new methods
│   ├── auth.controller.ts       ⚠️ REPLACE - Use AUTH_CONTROLLER_COMPLETE.ts
│   ├── auth.module.ts           ⚠️ UPDATE - Add new providers
│   ├── dto/                     ✅ NEW - All files already created
│   └── services/                ✅ NEW - All files already created
├── common/
│   └── services/
│       └── email.service.ts     ⚠️ UPDATE - Add new email methods
└── database/
    ├── entities/
    │   ├── user.entity.ts       ⚠️ UPDATE - Add 3 new fields
    │   ├── refresh-token.entity.ts ✅ NEW - Already created
    │   └── index.ts             ⚠️ UPDATE - Export refresh-token
    └── migrations/
        └── [timestamp]-add-auth-features.ts ⚠️ CREATE - Copy from plan

Legend:
✅ NEW - File already created, just verify
⚠️ UPDATE - File needs modifications
⚠️ REPLACE - Replace entire file
⚠️ CREATE - Create new file
```

---

## Quick Commands

### Development

```bash
# Navigate to API directory
cd /home/user/AiDeepRef/apps/api

# Install dependencies (if needed)
npm install

# Run tests
npm test

# Run specific test file
npm test -- auth.service.spec.ts

# Run linter
npm run lint

# Fix linting issues
npm run lint -- --fix

# Format code
npm run format

# Build application
npm run build

# Start development server
npm run start:dev
```

### Database

```bash
# Create new migration
npm run migration:create -- -n add-auth-features

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show

# Generate migration from entities
npm run migration:generate -- -n add-auth-features
```

### Git

```bash
# Create feature branch
git checkout -b feature/complete-auth-endpoints

# Check status
git status

# Add all changes
git add .

# Commit
git commit -m "feat: Add complete authentication endpoints"

# Push to remote
git push origin feature/complete-auth-endpoints
```

---

## Common Code Snippets

### 1. Adding TokenService to a Constructor

```typescript
constructor(
  // ... existing dependencies
  private tokenService: TokenService,
) {}
```

### 2. Creating a Refresh Token

```typescript
const refreshToken = await this.tokenService.createRefreshToken(
  user,
  ipAddress,
  userAgent,
);
```

### 3. Validating a Refresh Token

```typescript
try {
  const { userId } = await this.tokenService.validateRefreshToken(token);
  // Token is valid, proceed
} catch (error) {
  // Token is invalid, expired, or revoked
  throw new UnauthorizedException('Invalid refresh token');
}
```

### 4. Revoking All User Sessions

```typescript
const count = await this.tokenService.revokeAllUserTokens(userId);
console.log(`Revoked ${count} sessions`);
```

### 5. Sending Security Alert Email

```typescript
await this.emailService.sendSecurityAlert(
  user.email,
  'Password changed',
  'Your password was changed successfully.',
);
```

### 6. Password Validation

```typescript
// In service
await this.passwordService.validatePassword(newPassword);

// Or standalone
if (password.length < 8) {
  throw new BadRequestException('Password too short');
}
```

### 7. Getting User from Request

```typescript
@UseGuards(JwtAuthGuard)
async someMethod(@Request() req) {
  const userId = req.user.sub;
  const userEmail = req.user.email;
  // Use userId...
}
```

### 8. Rate Limiting a Route

```typescript
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute
@Post('endpoint')
async endpoint() {
  // ...
}
```

---

## Testing Examples

### 1. Test Token Refresh with cURL

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### 2. Test Logout

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "allDevices": false
  }'
```

### 3. Test Forgot Password

```bash
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

### 4. Test Reset Password

```bash
curl -X POST http://localhost:3000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "a1b2c3d4e5f6...",
    "newPassword": "NewSecurePassword123!"
  }'
```

### 5. Test Change Password (Requires Auth)

```bash
curl -X POST http://localhost:3000/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "currentPassword": "CurrentPassword123!",
    "newPassword": "NewSecurePassword123!"
  }'
```

### 6. Test Get Sessions (Requires Auth)

```bash
curl -X GET http://localhost:3000/api/v1/auth/sessions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Troubleshooting

### Error: "Cannot find module 'TokenService'"

**Solution:**
```typescript
// Make sure you have this import in auth.service.ts
import { TokenService } from './services/token.service';

// And TokenService is in auth.module.ts providers
providers: [AuthService, TokenService, PasswordService]
```

### Error: "Column 'passwordResetToken' does not exist"

**Solution:**
```bash
# Run the migration
npm run migration:run

# Or check migration status
npm run migration:show
```

### Error: "Refresh token not found"

**Cause:** Database table not created or old tokens
**Solution:**
```sql
-- Check if table exists
SELECT * FROM refresh_tokens LIMIT 1;

-- If error, run migration
npm run migration:run
```

### Error: "Rate limit exceeded"

**Cause:** Too many requests in test environment
**Solution:**
```typescript
// In test files, mock the throttle guard
// Or set higher limits in throttle.config.ts for test environment
```

### Tests Failing: "User should not be null"

**Solution:**
```typescript
// Make sure mock data includes all new fields
const mockUser = {
  // ... existing fields
  passwordResetToken: null,
  passwordResetExpiry: null,
  passwordChangedAt: null,
};
```

### Email Not Sending

**Check:**
1. EMAIL_SERVICE environment variable
2. EmailService configuration
3. Check logs for stub messages
4. Verify SMTP/SendGrid credentials

### TypeORM Entity Not Recognized

**Solution:**
```typescript
// Make sure entity is exported in index.ts
export * from './refresh-token.entity';

// And imported in module
TypeOrmModule.forFeature([User, RefreshToken])
```

---

## Environment Variables Quick Reference

```env
# Required
JWT_SECRET=your-secret-key-min-32-chars
APP_URL=http://localhost:3000

# Optional (with defaults)
JWT_EXPIRATION=15m
NODE_ENV=development

# Email (choose one)
EMAIL_SERVICE=stub  # For development
# EMAIL_SERVICE=sendgrid
# SENDGRID_API_KEY=your-key

# Database (should already be configured)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=aideepref
```

---

## Database Queries for Debugging

### Check Active Sessions

```sql
SELECT
  rt.id,
  rt.device_name,
  rt.ip_address,
  rt.created_at,
  rt.last_used_at,
  rt.is_revoked,
  u.email
FROM refresh_tokens rt
JOIN users u ON u.id = rt.user_id
WHERE rt.is_revoked = false
ORDER BY rt.last_used_at DESC;
```

### Check User Password Reset Status

```sql
SELECT
  email,
  password_reset_token IS NOT NULL as has_reset_token,
  password_reset_expiry,
  password_changed_at
FROM users
WHERE email = 'test@example.com';
```

### Clean Up Expired Tokens

```sql
DELETE FROM refresh_tokens
WHERE expires_at < NOW()
  OR (is_revoked = true AND revoked_at < NOW() - INTERVAL '7 days');
```

### Find Users with Multiple Active Sessions

```sql
SELECT
  u.email,
  COUNT(*) as active_sessions
FROM users u
JOIN refresh_tokens rt ON rt.user_id = u.id
WHERE rt.is_revoked = false
GROUP BY u.id, u.email
HAVING COUNT(*) > 1
ORDER BY active_sessions DESC;
```

---

## Performance Monitoring

### Check Token Table Size

```sql
SELECT
  COUNT(*) as total_tokens,
  COUNT(*) FILTER (WHERE is_revoked = false) as active,
  COUNT(*) FILTER (WHERE is_revoked = true) as revoked,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired
FROM refresh_tokens;
```

### Check Average Session Duration

```sql
SELECT
  AVG(EXTRACT(EPOCH FROM (COALESCE(last_used_at, NOW()) - created_at)) / 3600) as avg_hours
FROM refresh_tokens
WHERE is_revoked = false;
```

### Check Password Reset Activity

```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as reset_requests
FROM users
WHERE password_reset_token IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Code Review Checklist

Before submitting PR:

- [ ] All imports are correct
- [ ] No console.logs remaining
- [ ] All TODOs addressed
- [ ] Tests are passing
- [ ] Linter passes
- [ ] No TypeScript errors
- [ ] Environment variables documented
- [ ] Migration tested
- [ ] Rollback tested
- [ ] API documentation updated
- [ ] Rate limiting configured
- [ ] Error messages are user-friendly
- [ ] Security review completed

---

## Quick Links

- **Main Plan:** `/home/user/AiDeepRef/AUTHENTICATION_IMPLEMENTATION_PLAN.md`
- **Checklist:** `/home/user/AiDeepRef/IMPLEMENTATION_CHECKLIST.md`
- **Summary:** `/home/user/AiDeepRef/IMPLEMENTATION_SUMMARY.md`
- **Controller Code:** `/home/user/AiDeepRef/AUTH_CONTROLLER_COMPLETE.ts`
- **Service Updates:** `/home/user/AiDeepRef/AUTH_SERVICE_UPDATES.ts`
- **Email Updates:** `/home/user/AiDeepRef/EMAIL_SERVICE_UPDATES.ts`

---

**Last Updated:** 2025-11-20
**Quick Tips:** Use Ctrl+F to find specific sections quickly!
