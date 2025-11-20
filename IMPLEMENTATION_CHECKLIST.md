# Authentication Endpoints Implementation Checklist

## Pre-Implementation Steps

- [ ] Review and approve the implementation plan
- [ ] Backup database before running migrations
- [ ] Create feature branch: `git checkout -b feature/complete-auth-endpoints`

## Phase 1: Database Changes (2 hours)

### 1.1 Create Migration File
- [ ] Create migration file at `/home/user/AiDeepRef/apps/api/src/database/migrations/[timestamp]-add-auth-features.ts`
- [ ] Copy content from `AUTHENTICATION_IMPLEMENTATION_PLAN.md` (Migration section)
- [ ] Review migration SQL queries

### 1.2 Update User Entity
- [ ] Update `/home/user/AiDeepRef/apps/api/src/database/entities/user.entity.ts`
- [ ] Add three new fields from `USER_ENTITY_UPDATES.ts`:
  - `passwordResetToken`
  - `passwordResetExpiry`
  - `passwordChangedAt`

### 1.3 Create RefreshToken Entity
- [ ] File already created: `/home/user/AiDeepRef/apps/api/src/database/entities/refresh-token.entity.ts`
- [ ] Verify entity structure

### 1.4 Update Entity Index
- [ ] Update `/home/user/AiDeepRef/apps/api/src/database/entities/index.ts`
- [ ] Add export for `refresh-token.entity`
- [ ] Reference: `DATABASE_ENTITIES_INDEX_UPDATE.ts`

### 1.5 Run Migration
```bash
cd /home/user/AiDeepRef/apps/api
npm run migration:run
# or
npm run typeorm migration:run
```

- [ ] Verify migration completed successfully
- [ ] Check database schema
- [ ] Verify indexes created

## Phase 2: Create New Services (3 hours)

### 2.1 Token Service
- [ ] File already created: `/home/user/AiDeepRef/apps/api/src/auth/services/token.service.ts`
- [ ] Review implementation
- [ ] Verify all methods are present

### 2.2 Password Service
- [ ] File already created: `/home/user/AiDeepRef/apps/api/src/auth/services/password.service.ts`
- [ ] Review implementation
- [ ] Verify password validation rules

## Phase 3: Update Auth Service (2 hours)

### 3.1 Add Service Dependencies
- [ ] Open `/home/user/AiDeepRef/apps/api/src/auth/auth.service.ts`
- [ ] Add imports:
  ```typescript
  import { TokenService } from './services/token.service';
  import { PasswordService } from './services/password.service';
  ```
- [ ] Add to constructor:
  ```typescript
  private tokenService: TokenService,
  private passwordService: PasswordService,
  ```

### 3.2 Add New Methods
Reference: `AUTH_SERVICE_UPDATES.ts`

- [ ] Add `refreshAccessToken()` method
- [ ] Add `logout()` method
- [ ] Add `forgotPassword()` method
- [ ] Add `resetPassword()` method
- [ ] Add `changePassword()` method
- [ ] Add `revokeAllSessions()` method
- [ ] Add `getActiveSessions()` method

### 3.3 Update Existing Methods
- [ ] Update `signup()` - replace `generateRefreshToken()` with `tokenService.createRefreshToken()`
- [ ] Update `signin()` - replace `generateRefreshToken()` with `tokenService.createRefreshToken()`
- [ ] Update `verifyMfaAndIssueToken()` - add ipAddress and userAgent parameters
- [ ] Remove old `refreshToken()` method
- [ ] Remove `generateRefreshToken()` method
- [ ] Remove `validatePassword()` method (now in PasswordService)

## Phase 4: Create DTOs (30 minutes)

All DTO files already created:
- [ ] Verify `/home/user/AiDeepRef/apps/api/src/auth/dto/refresh-token.dto.ts`
- [ ] Verify `/home/user/AiDeepRef/apps/api/src/auth/dto/logout.dto.ts`
- [ ] Verify `/home/user/AiDeepRef/apps/api/src/auth/dto/forgot-password.dto.ts`
- [ ] Verify `/home/user/AiDeepRef/apps/api/src/auth/dto/reset-password.dto.ts`
- [ ] Verify `/home/user/AiDeepRef/apps/api/src/auth/dto/change-password.dto.ts`

## Phase 5: Update Auth Controller (1 hour)

- [ ] Replace `/home/user/AiDeepRef/apps/api/src/auth/auth.controller.ts` with content from `AUTH_CONTROLLER_COMPLETE.ts`
- [ ] Verify all imports
- [ ] Verify all decorators
- [ ] Check rate limiting configuration
- [ ] Verify Swagger documentation

## Phase 6: Update Email Service (1 hour)

- [ ] Open `/home/user/AiDeepRef/apps/api/src/common/services/email.service.ts`
- [ ] Add new methods from `EMAIL_SERVICE_UPDATES.ts`:
  - `sendSecurityAlert()`
  - `sendPasswordChangedEmail()`
  - `sendAccountLockedEmail()`
  - `sendNewDeviceLoginEmail()`
- [ ] Add private template methods:
  - `generateSecurityAlertTemplate()`
  - `generatePasswordChangedTemplate()`
  - `generateAccountLockedTemplate()`
  - `generateNewDeviceLoginTemplate()`

## Phase 7: Update Auth Module (30 minutes)

- [ ] Update `/home/user/AiDeepRef/apps/api/src/auth/auth.module.ts`
- [ ] Reference: `AUTH_MODULE_UPDATES.ts`
- [ ] Add imports for new services
- [ ] Add TypeOrmModule.forFeature([User, RefreshToken])
- [ ] Add TokenService and PasswordService to providers
- [ ] Export services

## Phase 8: Testing (3 hours)

### 8.1 Unit Tests
Test files already created:
- [ ] Run: `/home/user/AiDeepRef/apps/api/src/auth/services/token.service.spec.ts`
- [ ] Run: `/home/user/AiDeepRef/apps/api/src/auth/services/password.service.spec.ts`
- [ ] Run: `/home/user/AiDeepRef/apps/api/src/auth/auth.controller.spec.ts`
- [ ] Fix any failing tests

### 8.2 Integration Tests
```bash
cd /home/user/AiDeepRef/apps/api
npm test -- auth
```

- [ ] Test signup with new token creation
- [ ] Test signin with new token creation
- [ ] Test refresh endpoint
- [ ] Test logout endpoint
- [ ] Test forgot password flow
- [ ] Test reset password flow
- [ ] Test change password flow
- [ ] Test session management

### 8.3 Manual API Testing

Create test requests for:

**1. Token Refresh**
```bash
POST /api/v1/auth/refresh
{
  "refreshToken": "your-refresh-token"
}
```

**2. Logout**
```bash
POST /api/v1/auth/logout
{
  "refreshToken": "your-refresh-token",
  "allDevices": false
}
```

**3. Forgot Password**
```bash
POST /api/v1/auth/forgot-password
{
  "email": "test@example.com"
}
```

**4. Reset Password**
```bash
POST /api/v1/auth/reset-password
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePassword123!"
}
```

**5. Change Password** (Requires authentication)
```bash
POST /api/v1/auth/change-password
Authorization: Bearer {your-access-token}
{
  "currentPassword": "CurrentPassword123!",
  "newPassword": "NewSecurePassword123!"
}
```

**6. Get Active Sessions** (Requires authentication)
```bash
GET /api/v1/auth/sessions
Authorization: Bearer {your-access-token}
```

**7. Revoke All Sessions** (Requires authentication)
```bash
POST /api/v1/auth/revoke-all-sessions
Authorization: Bearer {your-access-token}
```

- [ ] Test all endpoints with Postman/Insomnia
- [ ] Verify rate limiting works
- [ ] Verify error responses
- [ ] Test edge cases

## Phase 9: Documentation (1 hour)

- [ ] Update API documentation
- [ ] Verify Swagger UI shows all new endpoints
- [ ] Test Swagger documentation accuracy
- [ ] Update README if needed
- [ ] Document any environment variables needed

## Phase 10: Code Review & Cleanup (1 hour)

- [ ] Run linter: `npm run lint`
- [ ] Fix linting errors
- [ ] Format code: `npm run format`
- [ ] Remove console.logs
- [ ] Review all TODO comments
- [ ] Check for unused imports
- [ ] Verify error handling

## Phase 11: Security Review (1 hour)

- [ ] Verify rate limiting on all endpoints
- [ ] Check password strength validation
- [ ] Verify token expiration times
- [ ] Check CSRF protection
- [ ] Verify email doesn't reveal user existence
- [ ] Check session revocation works
- [ ] Verify MFA integration still works
- [ ] Test account locking mechanism

## Phase 12: Deployment Preparation (1 hour)

### 12.1 Environment Variables
Add to `.env`:
```env
# JWT Configuration (if not already present)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=15m

# App URL for reset links
APP_URL=https://your-app-url.com

# Email Service Configuration
EMAIL_SERVICE=smtp  # or sendgrid, ses, etc.
```

- [ ] Document all required environment variables
- [ ] Update .env.example

### 12.2 Database Backup
- [ ] Create database backup
- [ ] Test migration rollback
- [ ] Document rollback procedure

### 12.3 Deployment Checklist
- [ ] Run all tests: `npm test`
- [ ] Build application: `npm run build`
- [ ] Check build artifacts
- [ ] Prepare deployment scripts

## Phase 13: Deployment (1 hour)

- [ ] Merge feature branch to main
- [ ] Run migration on staging: `npm run migration:run`
- [ ] Deploy to staging
- [ ] Test all endpoints on staging
- [ ] Monitor logs for errors
- [ ] Deploy to production (if staging successful)
- [ ] Run migration on production
- [ ] Monitor production logs

## Phase 14: Post-Deployment (Ongoing)

- [ ] Monitor error logs
- [ ] Check email delivery
- [ ] Monitor token creation/revocation
- [ ] Check database performance
- [ ] Monitor API response times
- [ ] Collect user feedback

## Optional Enhancements (Future)

- [ ] Add refresh token rotation
- [ ] Implement token blacklist cleanup cron job
- [ ] Add device fingerprinting
- [ ] Implement suspicious activity detection
- [ ] Add 2FA requirement for password reset
- [ ] Implement password strength meter on frontend
- [ ] Add password breach detection (HaveIBeenPwned API)
- [ ] Implement session timeout warnings
- [ ] Add login notification emails
- [ ] Implement account activity log

## Rollback Plan

If critical issues are encountered:

1. **Stop accepting new sessions:**
   ```sql
   -- Temporarily disable new refresh token creation
   ALTER TABLE refresh_tokens RENAME TO refresh_tokens_backup;
   ```

2. **Rollback migration:**
   ```bash
   npm run migration:revert
   ```

3. **Revert code changes:**
   ```bash
   git revert <commit-hash>
   git push
   ```

4. **Restore database:**
   ```bash
   # Use backup created before migration
   ```

## Success Criteria

- [ ] All endpoints return correct responses
- [ ] All tests passing (100% coverage on new code)
- [ ] Rate limiting working correctly
- [ ] Emails being sent successfully
- [ ] Session management working
- [ ] No breaking changes to existing functionality
- [ ] API documentation complete
- [ ] Security review passed
- [ ] Performance benchmarks met
- [ ] Zero critical bugs in production

## Time Tracking

| Phase | Estimated | Actual | Notes |
|-------|-----------|--------|-------|
| Database Changes | 2h | | |
| New Services | 3h | | |
| Update Auth Service | 2h | | |
| DTOs | 0.5h | | |
| Update Controller | 1h | | |
| Update Email Service | 1h | | |
| Update Module | 0.5h | | |
| Testing | 3h | | |
| Documentation | 1h | | |
| Code Review | 1h | | |
| Security Review | 1h | | |
| Deployment Prep | 1h | | |
| Deployment | 1h | | |
| **Total** | **18h** | | |

## Team Assignments

- **Backend Developer:** Phases 1-7, 10-11
- **QA Engineer:** Phase 8
- **Technical Writer:** Phase 9
- **DevOps Engineer:** Phases 12-13
- **All Team:** Phase 14 (Monitoring)

## Support Contacts

- **Backend Issues:** [Your Name]
- **Database Issues:** [DBA Name]
- **Deployment Issues:** [DevOps Name]
- **Security Concerns:** [Security Team]

---

**Last Updated:** 2025-11-20
**Status:** Ready for Implementation
**Approved By:** [Approval Needed]
