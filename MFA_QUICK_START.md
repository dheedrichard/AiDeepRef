# MFA Quick Start Guide

## 1. Install Dependencies

```bash
cd /home/user/AiDeepRef/apps/api
npm install speakeasy@^2.0.0 qrcode@^1.5.0 @types/speakeasy @types/qrcode
```

## 2. Configure Environment Variables

```bash
# Generate MFA encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env file
echo "MFA_ENCRYPTION_KEY=<your-generated-key>" >> .env
```

## 3. Run Database Migration

```bash
cd apps/api
npm run migration:run
```

## 4. Verify Migration

```bash
psql -U postgres -d deepref -c "\dt user_mfa_settings mfa_challenges trusted_devices"
```

## 5. Run Tests

```bash
# Unit tests
npm run test -- test/mfa

# Integration tests
npm run test:e2e

# Coverage
npm run test:cov
```

## 6. Start Development Server

```bash
# Backend
cd apps/api
npm run start:dev

# Frontend
cd apps/web
npm run start
```

## 7. Test MFA Flow

### Setup TOTP

```bash
# Get JWT token from login
TOKEN="your-jwt-token"

# Setup MFA
curl -X POST http://localhost:3001/api/v1/mfa/setup/totp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Response includes QR code and secret
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCodeUrl": "data:image/png;base64,..."
}
```

### Verify TOTP

```bash
# Use Google Authenticator to get code
CODE="123456"

curl -X POST http://localhost:3001/api/v1/mfa/verify/totp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"code\": \"$CODE\"}"

# Response includes backup codes
{
  "verified": true,
  "backupCodes": ["ABCD1234", "EFGH5678", ...]
}
```

### Check Status

```bash
curl -X GET http://localhost:3001/api/v1/mfa/status \
  -H "Authorization: Bearer $TOKEN"

{
  "enabled": true,
  "verified": true,
  "method": "totp",
  "hasBackupCodes": true,
  "trustedDevicesCount": 0
}
```

## 8. Frontend Components (To Be Created)

The following components need to be created:

- `apps/web/src/app/features/mfa/pages/setup/mfa-setup.component.ts`
- `apps/web/src/app/features/mfa/pages/verify/mfa-verify.component.ts`
- `apps/web/src/app/features/mfa/pages/settings/mfa-settings.component.ts`

See `MFA_IMPLEMENTATION_REPORT.md` for detailed specifications.

## 9. Production Deployment

1. Set `MFA_ENCRYPTION_KEY` in production environment
2. Run migration: `npm run migration:run`
3. Build: `npm run build`
4. Deploy to production
5. Monitor logs for MFA activity

## 10. Troubleshooting

**Problem: Migration fails**
```bash
# Check database connection
npm run typeorm -- schema:log

# Revert migration
npm run migration:revert
```

**Problem: "Invalid encryption key" error**
```bash
# Verify key is exactly 64 hex characters
echo $MFA_ENCRYPTION_KEY | wc -c  # Should be 65 (64 + newline)
```

**Problem: TOTP verification fails**
```bash
# Check server time is synchronized
timedatectl status

# Verify time-based codes match
# Code changes every 30 seconds
```

## 11. Next Steps

1. Create frontend components
2. Write E2E tests with Playwright
3. Security audit
4. User acceptance testing
5. Production rollout

For detailed documentation, see `MFA_IMPLEMENTATION_REPORT.md`.
