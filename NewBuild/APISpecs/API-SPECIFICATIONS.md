# AiDeepRef API Specifications

## Document Version Control

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2025-11-23 | Engineering Team | Comprehensive API Specifications v1.0 |

---

## Table of Contents

1. [API Architecture Decision](#1-api-architecture-decision)
2. [Core API Endpoints](#2-core-api-endpoints)
3. [WebSocket Events](#3-websocket-events)
4. [API Gateway Design](#4-api-gateway-design)
5. [Security](#5-security)
6. [OpenAPI 3.1 Specifications](#6-openapi-31-specifications)
7. [Integration Guide](#7-integration-guide)

---

## 1. API Architecture Decision

### 1.1 REST vs GraphQL Analysis

**Decision: REST API with optional GraphQL for complex queries**

#### REST API (Primary)
**Selected for:**
- Simple, well-understood patterns for CRUD operations
- Better caching with HTTP standards
- Easier API versioning and backward compatibility
- Lower learning curve for client developers
- Native support in all HTTP clients
- Better suited for public API consumption

**Use Cases:**
- Authentication flows
- User profile management
- Reference submission and retrieval
- Bundle creation and sharing
- Payment processing
- File uploads (multipart/form-data)

#### GraphQL (Optional - Future Enhancement)
**Reserved for:**
- Complex, nested data queries (e.g., user profile with references, bundles, and analytics)
- Client-specific data requirements
- Reducing over-fetching in mobile applications
- Real-time subscriptions (alternative to WebSocket)

**Evaluation Criteria for GraphQL Migration:**
- Query complexity reaches 3+ levels of nesting
- Mobile bandwidth optimization becomes critical
- Client teams request flexible data fetching
- Reference bundle analytics require complex aggregations

**Current Decision:** REST-first approach. Evaluate GraphQL after 6 months of production data.

---

### 1.2 API Versioning Strategy

**Selected Strategy: URL-based versioning**

```
Base URL: https://api.aideepref.com/api/v1
```

#### Rationale
- **Explicit and Discoverable**: Version visible in URL makes it clear which API version is being used
- **Browser-Friendly**: Easy to test in browsers and API clients
- **CDN Caching**: Better cache key separation per version
- **Documentation**: Easier to maintain separate docs per version
- **Client Migration**: Clear upgrade path (v1 → v2)

#### Version Lifecycle
```
v1 → v2 Released → v1 Deprecated (6 months) → v1 Sunset (12 months)
```

#### Version Support Matrix
| Version | Status | Release Date | Deprecation Date | Sunset Date |
|---------|--------|--------------|------------------|-------------|
| v1 | Current | 2025-Q1 | TBD | TBD |
| v2 | Planned | 2026-Q1 | TBD | TBD |

#### Versioning Rules
1. **Major Version Change (v1 → v2)**: Breaking changes
   - Endpoint removal
   - Response schema changes
   - Authentication method changes
   - Data type modifications

2. **Minor Changes (within v1)**: Non-breaking additions
   - New optional parameters
   - New endpoints
   - New response fields
   - Deprecation warnings

3. **Patch Changes**: Bug fixes
   - No API contract changes
   - Performance improvements
   - Security patches

---

### 1.3 Authentication Strategy

**Primary: JWT (JSON Web Tokens) with Refresh Token Rotation**

#### Token Architecture

```typescript
// Access Token (Short-lived: 15 minutes)
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "seeker|referrer|employer",
  "mfaVerified": true,
  "iat": 1700000000,
  "exp": 1700000900
}

// Refresh Token (Long-lived: 7 days, rotating)
{
  "sub": "user-uuid",
  "tokenFamily": "family-uuid",
  "tokenVersion": 1,
  "iat": 1700000000,
  "exp": 1700604800
}
```

#### Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Redis
    participant DB

    Client->>API: POST /auth/login (credentials)
    API->>DB: Validate credentials
    DB-->>API: User valid
    API->>API: Generate access + refresh tokens
    API->>Redis: Store refresh token family
    API-->>Client: {accessToken, refreshToken, expiresIn}

    Note over Client,API: Access token expires after 15 minutes

    Client->>API: POST /auth/refresh (refreshToken)
    API->>Redis: Validate token family
    Redis-->>API: Valid
    API->>API: Rotate refresh token
    API->>Redis: Update token family
    API-->>Client: {newAccessToken, newRefreshToken}
```

#### Multi-Factor Authentication (MFA)

**Supported Methods:**
1. **TOTP (Time-based One-Time Password)** - Primary
   - RFC 6238 compliant
   - 30-second time window
   - 6-digit codes
   - Compatible with Google Authenticator, Authy, 1Password

2. **Email OTP** - Backup
   - 6-digit code
   - 10-minute expiry
   - Rate-limited to 3 attempts per 15 minutes

3. **Backup Codes** - Recovery
   - 10 single-use codes
   - Regenerable after use
   - Securely hashed in database

#### Trusted Device Management
- Device fingerprinting (User-Agent + IP)
- 30-day trust period
- Maximum 5 trusted devices per user
- Email notification on new device trust

---

### 1.4 Rate Limiting Strategy

**Implementation: Redis-based Sliding Window Algorithm**

#### Rate Limit Tiers

| Endpoint Category | Tier | Limit | Window | Scope |
|------------------|------|-------|--------|-------|
| **Authentication** | Critical | 5 requests | 15 min | IP |
| **MFA Verification** | Critical | 3 requests | 15 min | User |
| **File Upload** | High | 10 uploads | 1 hour | User |
| **AI Chat** | High | 50 messages | 1 hour | User |
| **AI Batch** | High | 5 batches | 1 hour | User |
| **CRUD Operations** | Medium | 100 requests | 15 min | User |
| **Read-only** | Low | 1000 requests | 1 hour | User |
| **Webhooks** | Special | Unlimited | - | IP Whitelist |

#### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1700001600
Retry-After: 900
```

#### Rate Limit Response

```json
{
  "statusCode": 429,
  "message": "Too many requests. Please try again later.",
  "retryAfter": 900,
  "limit": 100,
  "windowSeconds": 900
}
```

#### Subscription-Based Rate Limits

| Plan | API Calls/Hour | AI Requests/Day | Concurrent Connections |
|------|----------------|-----------------|------------------------|
| Free | 100 | 10 | 1 |
| Pro | 1,000 | 100 | 5 |
| Business | 10,000 | 1,000 | 20 |
| Enterprise | Custom | Custom | Custom |

---

## 2. Core API Endpoints

### 2.1 Authentication Endpoints

#### POST /api/v1/auth/signup
Register a new user account.

**Request:**
```json
{
  "firstName": "Sarah",
  "lastName": "Chen",
  "email": "sarah@example.com",
  "password": "SecureP@ssw0rd123!",
  "role": "seeker",
  "acceptedTerms": true
}
```

**Response:** `201 Created`
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "sarah@example.com",
  "emailVerificationSent": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

**Validation Rules:**
- Email: Valid format, unique, max 255 chars
- Password: Min 12 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
- Role: Enum [seeker, referrer, employer]
- firstName/lastName: 1-100 chars, alphanumeric + spaces/hyphens

**Rate Limit:** 5 requests per 15 minutes (IP-based)

---

#### POST /api/v1/auth/login
Authenticate user with email/password.

**Request:**
```json
{
  "email": "sarah@example.com",
  "password": "SecureP@ssw0rd123!",
  "deviceFingerprint": "Chrome/119.0.0.0|Linux x86_64"
}
```

**Response:** `200 OK`
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "role": "seeker",
  "mfaRequired": true,
  "mfaMethods": ["totp", "email"],
  "sessionId": "session-uuid",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

**MFA Flow:**
If `mfaRequired: true`, client must call `/auth/mfa/verify` before accessing protected resources.

**Rate Limit:** 5 requests per 15 minutes (IP-based)

---

#### POST /api/v1/auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

**Error Cases:**
- `401 Unauthorized`: Invalid or expired refresh token
- `403 Forbidden`: Token family revoked (possible theft detected)

**Rate Limit:** 100 requests per hour (user-based)

---

#### POST /api/v1/auth/logout
Invalidate current session and tokens.

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### POST /api/v1/auth/verify-email
Verify email address with OTP.

**Request:**
```json
{
  "email": "sarah@example.com",
  "code": "123456"
}
```

**Response:** `200 OK`
```json
{
  "verified": true,
  "email": "sarah@example.com"
}
```

**Rate Limit:** 5 requests per 15 minutes (IP-based)

---

#### POST /api/v1/auth/magic-link
Request passwordless authentication link.

**Request:**
```json
{
  "email": "sarah@example.com"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "If an account exists with this email, a login link has been sent."
}
```

**Security Notes:**
- Always return success to prevent email enumeration
- Link expires in 15 minutes
- Single-use token
- Rate-limited to prevent abuse

---

### 2.2 Multi-Factor Authentication (MFA) Endpoints

#### POST /api/v1/mfa/setup/totp
Initialize TOTP setup for user.

**Request Headers:**
```
Authorization: Bearer <access-token>
```

**Response:** `200 OK`
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCodeUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Integration:**
User scans QR code with authenticator app, then calls `/mfa/verify/totp` to confirm setup.

---

#### POST /api/v1/mfa/verify/totp
Verify TOTP code and enable MFA.

**Request:**
```json
{
  "code": "123456"
}
```

**Response:** `200 OK`
```json
{
  "verified": true,
  "backupCodes": [
    "ABCD-1234-EFGH",
    "IJKL-5678-MNOP",
    "QRST-9012-UVWX"
  ]
}
```

**Important:** Backup codes are only shown once. Client must prompt user to save them securely.

**Rate Limit:** 3 requests per 15 minutes (user-based)

---

#### GET /api/v1/mfa/status
Get MFA configuration status.

**Response:** `200 OK`
```json
{
  "enabled": true,
  "methods": ["totp"],
  "backupCodesRemaining": 8,
  "trustedDevicesCount": 2
}
```

---

#### POST /api/v1/mfa/backup-codes/regenerate
Generate new backup codes (invalidates old ones).

**Response:** `200 OK`
```json
{
  "backupCodes": [
    "WXYZ-3456-ABCD",
    "EFGH-7890-IJKL"
  ],
  "message": "New backup codes generated successfully. Store them securely."
}
```

---

#### DELETE /api/v1/mfa/disable
Disable MFA (requires password confirmation).

**Request:**
```json
{
  "password": "SecureP@ssw0rd123!"
}
```

**Response:** `200 OK`
```json
{
  "disabled": true,
  "message": "Two-factor authentication has been disabled"
}
```

---

#### POST /api/v1/mfa/devices/trust
Trust current device to skip MFA for 30 days.

**Request:**
```json
{
  "deviceName": "Sarah's iPhone 14 Pro"
}
```

**Response:** `200 OK`
```json
{
  "id": "device-uuid",
  "deviceName": "Sarah's iPhone 14 Pro",
  "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0...)",
  "ipAddress": "203.0.113.42",
  "trustedAt": "2025-11-23T10:30:00Z",
  "expiresAt": "2025-12-23T10:30:00Z",
  "lastUsedAt": "2025-11-23T10:30:00Z"
}
```

---

#### GET /api/v1/mfa/devices
List all trusted devices.

**Response:** `200 OK`
```json
[
  {
    "id": "device-uuid-1",
    "deviceName": "Sarah's iPhone 14 Pro",
    "userAgent": "Mozilla/5.0 (iPhone...)",
    "ipAddress": "203.0.113.42",
    "trustedAt": "2025-11-23T10:30:00Z",
    "expiresAt": "2025-12-23T10:30:00Z",
    "lastUsedAt": "2025-11-23T15:45:00Z"
  },
  {
    "id": "device-uuid-2",
    "deviceName": "Work MacBook Pro",
    "userAgent": "Mozilla/5.0 (Macintosh...)",
    "ipAddress": "198.51.100.15",
    "trustedAt": "2025-11-20T09:00:00Z",
    "expiresAt": "2025-12-20T09:00:00Z",
    "lastUsedAt": "2025-11-23T14:20:00Z"
  }
]
```

---

#### DELETE /api/v1/mfa/devices/:deviceId
Revoke a specific trusted device.

**Response:** `200 OK`
```json
{
  "revoked": true,
  "message": "Device has been revoked"
}
```

---

#### DELETE /api/v1/mfa/devices
Revoke all trusted devices.

**Response:** `200 OK`
```json
{
  "revoked": true,
  "count": 3,
  "message": "3 device(s) have been revoked"
}
```

---

### 2.3 User Profile Endpoints

#### GET /api/v1/users/:userId/profile
Get user profile information.

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "firstName": "Sarah",
  "lastName": "Chen",
  "email": "sarah@example.com",
  "role": "seeker",
  "emailVerified": true,
  "kycStatus": "verified",
  "kycCompleted": true,
  "mfaEnabled": true,
  "profilePictureUrl": "https://cdn.aideepref.com/profiles/550e8400.jpg",
  "phoneNumber": "+1-415-555-0123",
  "createdAt": "2025-01-15T08:00:00Z",
  "lastLoginAt": "2025-11-23T10:30:00Z"
}
```

---

#### PATCH /api/v1/users/:userId/profile
Update user profile.

**Request:**
```json
{
  "firstName": "Sarah",
  "lastName": "Chen-Johnson",
  "phoneNumber": "+1-415-555-0199",
  "profilePictureUrl": "https://cdn.aideepref.com/profiles/new-photo.jpg"
}
```

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "firstName": "Sarah",
  "lastName": "Chen-Johnson",
  "phoneNumber": "+1-415-555-0199",
  "updatedAt": "2025-11-23T10:35:00Z"
}
```

---

### 2.4 KYC (Know Your Customer) Endpoints

#### POST /api/v1/seekers/:userId/kyc/upload
Upload ID document for verification.

**Request:** `multipart/form-data`
```
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="documentType"

passport
--boundary
Content-Disposition: form-data; name="frontImage"; filename="passport-front.jpg"
Content-Type: image/jpeg

<binary data>
--boundary
Content-Disposition: form-data; name="backImage"; filename="passport-back.jpg"
Content-Type: image/jpeg

<binary data>
--boundary--
```

**Response:** `201 Created`
```json
{
  "documentId": "doc-uuid",
  "documentType": "passport",
  "status": "pending_verification",
  "uploadedAt": "2025-11-23T10:40:00Z"
}
```

**Supported Document Types:**
- `passport`
- `drivers_license`
- `national_id`
- `residence_permit`

**File Requirements:**
- Format: JPEG, PNG, PDF
- Max size: 10MB per file
- Min resolution: 1280x720
- Max resolution: 4096x4096

---

#### POST /api/v1/seekers/:userId/kyc/selfie
Upload selfie for liveness verification.

**Request:** `multipart/form-data`
```
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="selfieImage"; filename="selfie.jpg"
Content-Type: image/jpeg

<binary data>
--boundary--
```

**Response:** `201 Created`
```json
{
  "selfieId": "selfie-uuid",
  "livenessScore": 0.95,
  "matchScore": 0.87,
  "status": "verified",
  "verifiedAt": "2025-11-23T10:42:00Z"
}
```

**Liveness Detection:**
- Face detection confidence: >90%
- Anti-spoofing checks (printed photos, screens, masks)
- Face matching against ID document
- Match threshold: >80%

---

#### GET /api/v1/seekers/:userId/kyc/status
Get KYC verification status.

**Response:** `200 OK`
```json
{
  "kycStatus": "verified",
  "kycCompleted": true,
  "verifiedAt": "2025-11-23T10:42:00Z",
  "documents": [
    {
      "id": "doc-uuid",
      "type": "passport",
      "status": "verified",
      "verifiedAt": "2025-11-23T10:41:00Z"
    }
  ],
  "selfie": {
    "id": "selfie-uuid",
    "status": "verified",
    "livenessScore": 0.95,
    "matchScore": 0.87,
    "verifiedAt": "2025-11-23T10:42:00Z"
  }
}
```

**KYC Status Values:**
- `pending`: Initial state, no documents uploaded
- `pending_verification`: Documents submitted, awaiting review
- `verified`: KYC successfully completed
- `failed`: Verification failed (manual review required)

---

### 2.5 Reference Request Endpoints

#### POST /api/v1/seekers/:userId/references/request
Create a new reference request.

**Request:**
```json
{
  "referrerName": "Marcus Johnson",
  "referrerEmail": "marcus@techcorp.com",
  "company": "TechCorp Inc.",
  "role": "Engineering Manager",
  "relationshipContext": "Direct manager for 2 years",
  "questions": [
    "How would you describe Sarah's technical abilities?",
    "Can you provide an example of Sarah's leadership skills?",
    "What are Sarah's areas for improvement?"
  ],
  "allowedFormats": ["video", "audio", "text"],
  "allowEmployerReachback": true,
  "expiryDays": 30
}
```

**Response:** `201 Created`
```json
{
  "referenceId": "ref-uuid",
  "seekerId": "550e8400-e29b-41d4-a716-446655440000",
  "referrerEmail": "marcus@techcorp.com",
  "status": "pending",
  "invitationLink": "https://app.aideepref.com/references/ref-uuid/submit",
  "expiryDate": "2025-12-23T00:00:00Z",
  "createdAt": "2025-11-23T10:45:00Z"
}
```

**Validation Rules:**
- Questions: 3-10 questions, each 10-500 chars
- Allowed formats: At least one of [video, audio, text]
- Expiry days: 7-90 days
- Email: Valid format, cannot be seeker's own email

**Rate Limit:** 10 requests per hour (user-based)

---

#### GET /api/v1/references/:referenceId
Get reference details.

**Response:** `200 OK`
```json
{
  "id": "ref-uuid",
  "seekerId": "550e8400-e29b-41d4-a716-446655440000",
  "seekerName": "Sarah Chen",
  "referrerId": "referrer-uuid",
  "referrerName": "Marcus Johnson",
  "referrerEmail": "marcus@techcorp.com",
  "company": "TechCorp Inc.",
  "role": "Engineering Manager",
  "status": "completed",
  "format": "video",
  "contentUrl": "https://cdn.aideepref.com/references/ref-uuid/video.mp4",
  "questions": [
    "How would you describe Sarah's technical abilities?",
    "Can you provide an example of Sarah's leadership skills?",
    "What are Sarah's areas for improvement?"
  ],
  "responses": {
    "q1": "Sarah is an exceptional engineer with deep expertise in...",
    "q2": "She led our migration to microservices, coordinating 8 engineers...",
    "q3": "Sarah could improve her communication in high-pressure situations..."
  },
  "rcsScore": 92.5,
  "aiAuthenticityScore": 0.98,
  "deepfakeProbability": 0.02,
  "createdAt": "2025-11-23T10:45:00Z",
  "submittedAt": "2025-11-25T14:30:00Z",
  "expiryDate": "2025-12-23T00:00:00Z"
}
```

---

#### POST /api/v1/references/:referenceId/submit
Submit reference response (called by referrer).

**Request:** `multipart/form-data`
```
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="format"

video
--boundary
Content-Disposition: form-data; name="videoFile"; filename="reference.mp4"
Content-Type: video/mp4

<binary data>
--boundary
Content-Disposition: form-data; name="responses"

{
  "q1": "Sarah is an exceptional engineer...",
  "q2": "She led our migration...",
  "q3": "Sarah could improve..."
}
--boundary--
```

**Response:** `201 Created`
```json
{
  "referenceId": "ref-uuid",
  "status": "processing",
  "format": "video",
  "submittedAt": "2025-11-25T14:30:00Z",
  "processingStatus": {
    "authenticityCheck": "pending",
    "deepfakeDetection": "pending",
    "rcsCalculation": "pending",
    "estimatedCompletionTime": "2025-11-25T14:35:00Z"
  }
}
```

**Supported Formats:**
- **Video**: MP4, MOV, WebM (max 500MB, 1-10 minutes)
- **Audio**: MP3, WAV, M4A (max 100MB, 1-10 minutes)
- **Text**: JSON with question-answer pairs (max 10,000 chars total)

**AI Processing:**
1. Authenticity verification (deepfake detection for video/audio)
2. RCS (Reference Context Score) calculation
3. Sentiment analysis
4. Transcript generation (for video/audio)

---

#### GET /api/v1/references
List all references for authenticated user.

**Query Parameters:**
- `status`: Filter by status (pending, completed, declined, expired)
- `role`: Filter by user role (seeker, referrer)
- `limit`: Results per page (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)
- `sortBy`: Sort field (createdAt, submittedAt, rcsScore)
- `sortOrder`: asc or desc (default: desc)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "ref-uuid-1",
      "seekerName": "Sarah Chen",
      "referrerName": "Marcus Johnson",
      "company": "TechCorp Inc.",
      "status": "completed",
      "rcsScore": 92.5,
      "submittedAt": "2025-11-25T14:30:00Z"
    },
    {
      "id": "ref-uuid-2",
      "seekerName": "Sarah Chen",
      "referrerName": "Jane Smith",
      "company": "StartupXYZ",
      "status": "pending",
      "rcsScore": null,
      "submittedAt": null
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

---

### 2.6 Bundle Management Endpoints

#### POST /api/v1/bundles
Create a reference bundle.

**Request:**
```json
{
  "title": "Senior Product Manager Applications 2025",
  "description": "Reference bundle for Director/VP-level PM roles",
  "referenceIds": [
    "ref-uuid-1",
    "ref-uuid-2",
    "ref-uuid-3"
  ],
  "password": "OptionalP@ssw0rd",
  "expiryDays": 90
}
```

**Response:** `201 Created`
```json
{
  "bundleId": "bundle-uuid",
  "seekerId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Senior Product Manager Applications 2025",
  "shareLink": "https://app.aideepref.com/bundles/abc123def456",
  "password": "OptionalP@ssw0rd",
  "aggregatedRCS": 91.3,
  "referenceCount": 3,
  "expiryDate": "2026-02-21T00:00:00Z",
  "createdAt": "2025-11-23T11:00:00Z"
}
```

**Validation Rules:**
- Title: 5-200 chars
- Description: 0-1000 chars
- References: 1-20 references, all must be owned by user and status=completed
- Password: Optional, min 8 chars if provided
- Expiry: 7-365 days

---

#### GET /api/v1/bundles/:bundleId
Get bundle details.

**Query Parameters:**
- `password`: Required if bundle is password-protected

**Response:** `200 OK`
```json
{
  "id": "bundle-uuid",
  "title": "Senior Product Manager Applications 2025",
  "description": "Reference bundle for Director/VP-level PM roles",
  "seekerId": "550e8400-e29b-41d4-a716-446655440000",
  "seekerName": "Sarah Chen",
  "aggregatedRCS": 91.3,
  "references": [
    {
      "id": "ref-uuid-1",
      "referrerName": "Marcus Johnson",
      "company": "TechCorp Inc.",
      "role": "Engineering Manager",
      "rcsScore": 92.5,
      "format": "video",
      "contentUrl": "https://cdn.aideepref.com/references/ref-uuid-1/video.mp4"
    },
    {
      "id": "ref-uuid-2",
      "referrerName": "Jane Smith",
      "company": "StartupXYZ",
      "role": "CEO",
      "rcsScore": 95.0,
      "format": "video",
      "contentUrl": "https://cdn.aideepref.com/references/ref-uuid-2/video.mp4"
    },
    {
      "id": "ref-uuid-3",
      "referrerName": "David Lee",
      "company": "Enterprise Corp",
      "role": "VP Product",
      "rcsScore": 86.5,
      "format": "audio",
      "contentUrl": "https://cdn.aideepref.com/references/ref-uuid-3/audio.mp3"
    }
  ],
  "viewCount": 7,
  "expiryDate": "2026-02-21T00:00:00Z",
  "createdAt": "2025-11-23T11:00:00Z"
}
```

**Analytics Tracking:**
- View count incremented on each access
- IP addresses logged for security audit
- Employer information captured (if shared)

---

#### PATCH /api/v1/bundles/:bundleId
Update bundle details.

**Request:**
```json
{
  "title": "Senior PM Applications - Updated",
  "description": "Updated description",
  "expiryDate": "2026-03-21T00:00:00Z"
}
```

**Response:** `200 OK`
```json
{
  "bundleId": "bundle-uuid",
  "title": "Senior PM Applications - Updated",
  "description": "Updated description",
  "expiryDate": "2026-03-21T00:00:00Z",
  "updatedAt": "2025-11-23T11:05:00Z"
}
```

---

#### DELETE /api/v1/bundles/:bundleId
Delete (deactivate) a bundle.

**Response:** `200 OK`
```json
{
  "bundleId": "bundle-uuid",
  "isActive": false,
  "message": "Bundle has been deactivated. Share link is no longer accessible."
}
```

**Note:** Soft delete - bundle data retained for audit purposes, but share link becomes invalid.

---

### 2.7 AI Service Endpoints

#### POST /api/v1/ai/chat
Send message to AI coach.

**Request:**
```json
{
  "agent_id": "reference_coach",
  "message": "How should I structure my reference request to a former manager?"
}
```

**Response:** `200 OK`
```json
{
  "message": "When requesting a reference from a former manager, I recommend:\n\n1. **Personalize the outreach**: Mention specific projects you worked on together...\n2. **Be clear about timeline**: Let them know when you need the reference...\n3. **Provide context**: Share the role you're applying for...",
  "interaction_id": "770e8400-e29b-41d4-a716-446655440002",
  "tokens_used": 342,
  "model_used": "claude-3-5-sonnet-20241022",
  "createdAt": "2025-11-23T11:10:00Z"
}
```

**Available Agents:**
- `reference_coach`: General reference guidance
- `question_generator`: Generate contextual questions
- `authenticity_analyzer`: Analyze reference authenticity
- `rcs_explainer`: Explain RCS scores

**Rate Limit:** 50 messages per hour (user-based)

---

#### POST /api/v1/ai/chat/stream
Stream AI response using Server-Sent Events (SSE).

**Request:**
```json
{
  "agent_id": "reference_coach",
  "message": "How should I structure my reference request?"
}
```

**Response:** `text/event-stream`
```
event: message
data: {"chunk": "When requesting", "done": false}

event: message
data: {"chunk": " a reference from", "done": false}

event: message
data: {"chunk": " a former manager...", "done": false}

event: done
data: {"interaction_id": "770e8400-e29b-41d4-a716-446655440002", "tokens_used": 342}
```

**Client Implementation:**
```javascript
const eventSource = new EventSource('/api/v1/ai/chat/stream', {
  headers: { 'Authorization': 'Bearer <token>' }
});

eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  if (data.done) {
    eventSource.close();
  } else {
    appendToChat(data.chunk);
  }
});
```

---

#### POST /api/v1/ai/sessions
Start a new AI chat session.

**Request:**
```json
{
  "agent_id": "reference_coach",
  "context": {
    "role": "seeker",
    "stage": "requesting_references"
  }
}
```

**Response:** `201 Created`
```json
{
  "session_id": "session-uuid",
  "agent_id": "reference_coach",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2025-11-23T11:15:00Z",
  "expiresAt": "2025-11-23T13:15:00Z"
}
```

**Session Management:**
- Sessions expire after 2 hours of inactivity
- Maximum 5 concurrent sessions per user
- Session context preserved for multi-turn conversations

---

#### GET /api/v1/ai/sessions/:sessionId
Get session details and conversation history.

**Response:** `200 OK`
```json
{
  "session_id": "session-uuid",
  "agent_id": "reference_coach",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "interactions": [
    {
      "id": "interaction-1",
      "message": "How should I structure my reference request?",
      "response": "When requesting a reference from a former manager...",
      "tokens_used": 342,
      "createdAt": "2025-11-23T11:15:00Z"
    }
  ],
  "createdAt": "2025-11-23T11:15:00Z",
  "lastActivityAt": "2025-11-23T11:15:00Z",
  "expiresAt": "2025-11-23T13:15:00Z"
}
```

---

#### POST /api/v1/ai/generate-questions
Generate contextual questions for reference request.

**Request:**
```json
{
  "referrerRole": "Engineering Manager",
  "seekerRole": "Senior Software Engineer",
  "company": "TechCorp Inc.",
  "relationshipDuration": "2 years",
  "targetRole": "Staff Engineer"
}
```

**Response:** `200 OK`
```json
{
  "questions": [
    "Can you describe Sarah's technical contributions to the team over the past 2 years?",
    "How does Sarah approach complex system design challenges?",
    "Can you provide an example of Sarah's collaboration with cross-functional teams?",
    "What technical skills would you say are Sarah's strongest?",
    "How has Sarah's impact on the engineering organization evolved during your time working together?",
    "What areas of growth have you observed in Sarah's technical leadership?"
  ],
  "generatedAt": "2025-11-23T11:20:00Z"
}
```

---

#### POST /api/v1/ai/verify-authenticity
Verify media authenticity (deepfake detection).

**Request:** `multipart/form-data`
```
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="mediaType"

video
--boundary
Content-Disposition: form-data; name="mediaFile"; filename="reference.mp4"
Content-Type: video/mp4

<binary data>
--boundary--
```

**Response:** `200 OK`
```json
{
  "authenticityScore": 0.98,
  "deepfakeProbability": 0.02,
  "analysis": {
    "faceConsistency": 0.97,
    "lipSyncAccuracy": 0.99,
    "artifactDetection": 0.98,
    "temporalCoherence": 0.96
  },
  "verdict": "authentic",
  "confidence": "high",
  "processedAt": "2025-11-23T11:25:00Z"
}
```

**Verdict Values:**
- `authentic`: Score > 0.90
- `likely_authentic`: Score 0.70-0.90
- `uncertain`: Score 0.50-0.70
- `likely_synthetic`: Score 0.30-0.50
- `synthetic`: Score < 0.30

---

#### POST /api/v1/ai/batch
Submit batch AI processing job.

**Request:**
```json
{
  "operation": "authenticity_check",
  "references": [
    "ref-uuid-1",
    "ref-uuid-2",
    "ref-uuid-3"
  ]
}
```

**Response:** `202 Accepted`
```json
{
  "batchId": "batch-uuid",
  "operation": "authenticity_check",
  "totalItems": 3,
  "status": "processing",
  "estimatedCompletionTime": "2025-11-23T11:35:00Z",
  "createdAt": "2025-11-23T11:25:00Z"
}
```

**Rate Limit:** 5 batches per hour (user-based)

---

#### GET /api/v1/ai/batch/:batchId
Get batch processing status.

**Response:** `200 OK`
```json
{
  "batchId": "batch-uuid",
  "operation": "authenticity_check",
  "status": "completed",
  "totalItems": 3,
  "completedItems": 3,
  "failedItems": 0,
  "results": [
    {
      "referenceId": "ref-uuid-1",
      "status": "success",
      "authenticityScore": 0.98
    },
    {
      "referenceId": "ref-uuid-2",
      "status": "success",
      "authenticityScore": 0.95
    },
    {
      "referenceId": "ref-uuid-3",
      "status": "success",
      "authenticityScore": 0.92
    }
  ],
  "createdAt": "2025-11-23T11:25:00Z",
  "completedAt": "2025-11-23T11:32:00Z"
}
```

---

### 2.8 Payment & Subscription Endpoints (Future)

#### POST /api/v1/payments/subscribe
Create subscription for premium plan.

**Request:**
```json
{
  "plan": "pro",
  "billingCycle": "monthly",
  "paymentMethodId": "pm_1234567890",
  "promoCode": "LAUNCH2025"
}
```

**Response:** `201 Created`
```json
{
  "subscriptionId": "sub-uuid",
  "plan": "pro",
  "status": "active",
  "currentPeriodStart": "2025-11-23T00:00:00Z",
  "currentPeriodEnd": "2025-12-23T00:00:00Z",
  "amount": 29.99,
  "currency": "USD",
  "invoiceUrl": "https://payments.aideepref.com/invoices/inv-123"
}
```

---

#### POST /api/v1/payments/webhook
Stripe webhook endpoint (internal use).

**Request Headers:**
```
Stripe-Signature: t=1234567890,v1=abcdef...
```

**Response:** `200 OK`
```json
{
  "received": true
}
```

**Handled Events:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

## 3. WebSocket Events

### 3.1 Connection Management

**WebSocket URL:**
```
wss://api.aideepref.com/ws
```

#### Connection Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant Auth
    participant Redis

    Client->>Gateway: WebSocket Upgrade (with auth token)
    Gateway->>Auth: Validate JWT token
    Auth-->>Gateway: Token valid
    Gateway->>Redis: Register connection
    Gateway-->>Client: Connected (connection_id)

    Note over Client,Gateway: Heartbeat every 30 seconds

    Client->>Gateway: ping
    Gateway-->>Client: pong

    Note over Client,Gateway: Connection idle timeout: 5 minutes

    Gateway->>Client: disconnect (timeout)
```

---

### 3.2 Authentication

**Initial Connection:**
```javascript
const ws = new WebSocket('wss://api.aideepref.com/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }));
};
```

**Authentication Response:**
```json
{
  "type": "auth_success",
  "connection_id": "conn-uuid",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-11-23T11:30:00Z"
}
```

**Authentication Failure:**
```json
{
  "type": "auth_error",
  "error": "Invalid or expired token",
  "code": "TOKEN_INVALID"
}
```

---

### 3.3 Event Types

#### Reference Events

**reference.requested**
Emitted when seeker creates a new reference request.
```json
{
  "type": "reference.requested",
  "referenceId": "ref-uuid",
  "seekerId": "550e8400-e29b-41d4-a716-446655440000",
  "referrerEmail": "marcus@techcorp.com",
  "timestamp": "2025-11-23T11:35:00Z"
}
```

**reference.submitted**
Emitted when referrer submits a reference.
```json
{
  "type": "reference.submitted",
  "referenceId": "ref-uuid",
  "seekerId": "550e8400-e29b-41d4-a716-446655440000",
  "referrerId": "referrer-uuid",
  "status": "processing",
  "timestamp": "2025-11-25T14:30:00Z"
}
```

**reference.completed**
Emitted when AI processing completes.
```json
{
  "type": "reference.completed",
  "referenceId": "ref-uuid",
  "seekerId": "550e8400-e29b-41d4-a716-446655440000",
  "rcsScore": 92.5,
  "authenticityScore": 0.98,
  "timestamp": "2025-11-25T14:35:00Z"
}
```

**reference.expired**
Emitted when reference request expires.
```json
{
  "type": "reference.expired",
  "referenceId": "ref-uuid",
  "seekerId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-23T00:00:00Z"
}
```

---

#### Bundle Events

**bundle.created**
```json
{
  "type": "bundle.created",
  "bundleId": "bundle-uuid",
  "seekerId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Senior PM Applications 2025",
  "referenceCount": 3,
  "timestamp": "2025-11-23T11:40:00Z"
}
```

**bundle.updated**
```json
{
  "type": "bundle.updated",
  "bundleId": "bundle-uuid",
  "seekerId": "550e8400-e29b-41d4-a716-446655440000",
  "changes": {
    "title": "Updated title",
    "expiryDate": "2026-03-21T00:00:00Z"
  },
  "timestamp": "2025-11-23T11:45:00Z"
}
```

**bundle.viewed**
```json
{
  "type": "bundle.viewed",
  "bundleId": "bundle-uuid",
  "seekerId": "550e8400-e29b-41d4-a716-446655440000",
  "viewerIp": "203.0.113.42",
  "viewerInfo": {
    "company": "Enterprise Corp",
    "recruiterEmail": "recruiter@enterprisecorp.com"
  },
  "timestamp": "2025-11-23T11:50:00Z"
}
```

---

#### AI Events

**ai.processing_started**
```json
{
  "type": "ai.processing_started",
  "referenceId": "ref-uuid",
  "operation": "authenticity_check",
  "estimatedCompletionTime": "2025-11-25T14:35:00Z",
  "timestamp": "2025-11-25T14:30:00Z"
}
```

**ai.processing_completed**
```json
{
  "type": "ai.processing_completed",
  "referenceId": "ref-uuid",
  "operation": "authenticity_check",
  "result": {
    "authenticityScore": 0.98,
    "deepfakeProbability": 0.02
  },
  "timestamp": "2025-11-25T14:35:00Z"
}
```

**ai.batch_completed**
```json
{
  "type": "ai.batch_completed",
  "batchId": "batch-uuid",
  "operation": "authenticity_check",
  "totalItems": 3,
  "successCount": 3,
  "failedCount": 0,
  "timestamp": "2025-11-23T11:32:00Z"
}
```

---

#### Notification Events

**notification.new**
```json
{
  "type": "notification.new",
  "notificationId": "notif-uuid",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "category": "reference_submitted",
  "title": "New Reference Received",
  "message": "Marcus Johnson has submitted your reference",
  "actionUrl": "/references/ref-uuid",
  "priority": "high",
  "timestamp": "2025-11-25T14:30:00Z"
}
```

---

### 3.4 Client Subscription

**Subscribe to Events:**
```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  channels: ['references', 'bundles', 'ai', 'notifications']
}));
```

**Subscription Response:**
```json
{
  "type": "subscribed",
  "channels": ["references", "bundles", "ai", "notifications"],
  "timestamp": "2025-11-23T11:55:00Z"
}
```

**Unsubscribe:**
```javascript
ws.send(JSON.stringify({
  type: 'unsubscribe',
  channels: ['ai']
}));
```

---

### 3.5 Heartbeat & Reconnection

**Heartbeat (Client → Server):**
```javascript
setInterval(() => {
  ws.send(JSON.stringify({ type: 'ping' }));
}, 30000); // Every 30 seconds
```

**Heartbeat Response (Server → Client):**
```json
{
  "type": "pong",
  "timestamp": "2025-11-23T12:00:00Z"
}
```

**Reconnection Strategy:**
```javascript
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = (attempt) => Math.min(1000 * Math.pow(2, attempt), 30000);

ws.onclose = () => {
  if (reconnectAttempts < maxReconnectAttempts) {
    setTimeout(() => {
      reconnectAttempts++;
      connectWebSocket();
    }, reconnectDelay(reconnectAttempts));
  }
};

ws.onopen = () => {
  reconnectAttempts = 0; // Reset on successful connection
};
```

**Exponential Backoff:**
- Attempt 1: 1 second
- Attempt 2: 2 seconds
- Attempt 3: 4 seconds
- Attempt 4: 8 seconds
- Attempt 5: 16 seconds
- Max delay: 30 seconds

---

## 4. API Gateway Design

### 4.1 Rate Limiting Rules

**Implementation:** Redis-based sliding window with distributed counter

**Global Rate Limits:**
```yaml
tiers:
  free:
    requests_per_hour: 100
    burst: 20
    ai_requests_per_day: 10

  pro:
    requests_per_hour: 1000
    burst: 100
    ai_requests_per_day: 100

  business:
    requests_per_hour: 10000
    burst: 500
    ai_requests_per_day: 1000

  enterprise:
    requests_per_hour: custom
    burst: custom
    ai_requests_per_day: custom
```

**Endpoint-Specific Limits:**
```yaml
endpoints:
  /auth/login:
    limit: 5
    window: 900  # 15 minutes
    scope: ip

  /auth/signup:
    limit: 3
    window: 3600  # 1 hour
    scope: ip

  /mfa/verify/totp:
    limit: 3
    window: 900  # 15 minutes
    scope: user

  /seekers/*/kyc/upload:
    limit: 10
    window: 3600  # 1 hour
    scope: user

  /ai/chat:
    limit: 50
    window: 3600  # 1 hour
    scope: user

  /ai/batch:
    limit: 5
    window: 3600  # 1 hour
    scope: user

  /references:
    limit: 100
    window: 900  # 15 minutes
    scope: user
```

**Rate Limit Bypass:**
- Whitelisted IPs (internal services, partner integrations)
- Enterprise custom limits
- Admin/support tools

---

### 4.2 CORS Configuration

**Development:**
```javascript
{
  origin: ['http://localhost:4200', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-CSRF-Token',
    'X-Requested-With'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-CSRF-Token'
  ],
  maxAge: 86400  // 24 hours
}
```

**Production:**
```javascript
{
  origin: [
    'https://app.aideepref.com',
    'https://www.aideepref.com',
    'https://admin.aideepref.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-CSRF-Token',
    'X-Requested-With'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  maxAge: 86400
}
```

**Dynamic CORS (Partner Integrations):**
```javascript
// Validate origin against whitelist in database
const allowedOrigins = await getPartnerOrigins();
if (allowedOrigins.includes(origin)) {
  // Allow partner access
}
```

---

### 4.3 Request/Response Transformation

**Request Transformation:**

1. **Header Normalization**
   ```javascript
   // Convert header keys to lowercase
   headers['authorization'] = headers['Authorization'];
   headers['content-type'] = headers['Content-Type'];
   ```

2. **Body Sanitization**
   ```javascript
   // Remove null values
   // Trim string whitespace
   // Convert date strings to ISO 8601
   ```

3. **Query Parameter Parsing**
   ```javascript
   // Parse comma-separated values
   ?status=pending,completed → ['pending', 'completed']

   // Parse boolean strings
   ?mfaEnabled=true → true (boolean)
   ```

**Response Transformation:**

1. **Date Formatting**
   ```javascript
   // All dates in ISO 8601 UTC format
   "createdAt": "2025-11-23T11:30:00Z"
   ```

2. **Null Handling**
   ```javascript
   // Omit null values in responses (unless explicitly needed)
   {
     "name": "Sarah Chen",
     // "middleName": null  ← Omitted
     "email": "sarah@example.com"
   }
   ```

3. **Pagination Envelope**
   ```javascript
   {
     "data": [...],
     "pagination": {
       "total": 100,
       "limit": 20,
       "offset": 0,
       "hasMore": true
     }
   }
   ```

4. **Error Envelope**
   ```javascript
   {
     "statusCode": 400,
     "message": "Validation failed",
     "errors": [
       {
         "field": "email",
         "message": "Invalid email format",
         "code": "INVALID_FORMAT"
       }
     ],
     "timestamp": "2025-11-23T11:30:00Z",
     "path": "/api/v1/auth/signup",
     "requestId": "req-uuid"
   }
   ```

---

### 4.4 Error Handling

**Standard Error Response:**
```json
{
  "statusCode": 400,
  "message": "Bad Request",
  "errors": [
    {
      "field": "email",
      "message": "Email is required",
      "code": "REQUIRED_FIELD"
    }
  ],
  "timestamp": "2025-11-23T11:30:00Z",
  "path": "/api/v1/auth/signup",
  "requestId": "req-uuid"
}
```

**Error Codes:**

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | VALIDATION_ERROR | Request validation failed |
| 400 | INVALID_FORMAT | Invalid data format |
| 400 | MISSING_REQUIRED_FIELD | Required field missing |
| 401 | UNAUTHORIZED | Authentication required |
| 401 | TOKEN_EXPIRED | Access token expired |
| 401 | TOKEN_INVALID | Invalid token |
| 401 | MFA_REQUIRED | MFA verification required |
| 403 | FORBIDDEN | Insufficient permissions |
| 403 | RESOURCE_FORBIDDEN | Access to resource denied |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource already exists |
| 409 | EMAIL_EXISTS | Email already registered |
| 413 | PAYLOAD_TOO_LARGE | Request body too large |
| 415 | UNSUPPORTED_MEDIA_TYPE | Unsupported content type |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Internal server error |
| 502 | BAD_GATEWAY | Upstream service error |
| 503 | SERVICE_UNAVAILABLE | Service temporarily unavailable |
| 504 | GATEWAY_TIMEOUT | Request timeout |

**Error Response Examples:**

```json
// 401 Unauthorized - Expired Token
{
  "statusCode": 401,
  "message": "Access token has expired",
  "code": "TOKEN_EXPIRED",
  "timestamp": "2025-11-23T11:30:00Z",
  "path": "/api/v1/users/me",
  "requestId": "req-uuid"
}

// 403 Forbidden - Insufficient Permissions
{
  "statusCode": 403,
  "message": "You do not have permission to access this resource",
  "code": "FORBIDDEN",
  "requiredRole": "admin",
  "userRole": "seeker",
  "timestamp": "2025-11-23T11:30:00Z",
  "path": "/api/v1/admin/users",
  "requestId": "req-uuid"
}

// 429 Rate Limit Exceeded
{
  "statusCode": 429,
  "message": "Too many requests. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 900,
  "limit": 100,
  "windowSeconds": 900,
  "timestamp": "2025-11-23T11:30:00Z",
  "path": "/api/v1/ai/chat",
  "requestId": "req-uuid"
}

// 500 Internal Server Error
{
  "statusCode": 500,
  "message": "An unexpected error occurred. Please try again later.",
  "code": "INTERNAL_ERROR",
  "timestamp": "2025-11-23T11:30:00Z",
  "path": "/api/v1/references/ref-uuid",
  "requestId": "req-uuid"
}
```

**Error Logging:**
- All 5xx errors logged with full stack trace
- All 4xx errors logged with request metadata
- Request ID tracked across microservices
- Integration with Sentry for error monitoring

---

## 5. Security

### 5.1 Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Gateway
    participant Auth as Auth Service
    participant Redis as Redis
    participant DB as Database

    C->>API: POST /auth/login
    API->>Auth: Validate credentials
    Auth->>DB: Query user
    DB-->>Auth: User data
    Auth->>Auth: Verify password (bcrypt)
    Auth->>Auth: Generate tokens
    Auth->>Redis: Store refresh token
    Auth-->>API: Access + Refresh tokens
    API-->>C: {accessToken, refreshToken}

    Note over C,API: 15 minutes later...

    C->>API: GET /users/me (expired token)
    API-->>C: 401 TOKEN_EXPIRED

    C->>API: POST /auth/refresh
    API->>Auth: Validate refresh token
    Auth->>Redis: Check token family
    Redis-->>Auth: Valid
    Auth->>Auth: Rotate refresh token
    Auth->>Redis: Update token family
    Auth-->>API: New tokens
    API-->>C: {accessToken, refreshToken}
```

---

### 5.2 Authorization (RBAC)

**Role Hierarchy:**
```
admin
  ├── can access all endpoints
  ├── can manage users
  ├── can view analytics
  └── can configure system settings

employer
  ├── can view reference bundles
  ├── can request background checks
  └── can access employer dashboard

seeker
  ├── can create reference requests
  ├── can manage bundles
  └── can access seeker dashboard

referrer
  ├── can submit references
  ├── can view reference requests
  └── can manage notification preferences
```

**Permission Matrix:**

| Endpoint | Admin | Employer | Seeker | Referrer |
|----------|-------|----------|--------|----------|
| POST /auth/signup | ✅ | ✅ | ✅ | ✅ |
| POST /auth/login | ✅ | ✅ | ✅ | ✅ |
| GET /users/:id/profile | ✅ | Self | Self | Self |
| POST /seekers/:id/references/request | ✅ | ❌ | Owner | ❌ |
| POST /references/:id/submit | ✅ | ❌ | ❌ | Assigned |
| POST /bundles | ✅ | ❌ | ✅ | ❌ |
| GET /bundles/:id | ✅ | ✅ | Owner | ❌ |
| POST /ai/chat | ✅ | ✅ | ✅ | ✅ |
| GET /admin/analytics | ✅ | ❌ | ❌ | ❌ |

**Authorization Guard Implementation:**
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('seeker', 'admin')
@Controller('bundles')
export class BundlesController {
  // Only seeker and admin can access
}
```

---

### 5.3 Input Validation

**Validation Pipeline:**
1. Schema validation (class-validator)
2. Sanitization (DOMPurify, validator.js)
3. Business logic validation
4. Database constraints

**Validation Rules:**

```typescript
// Example: CreateReferenceRequestDto
export class CreateReferenceRequestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s\-']+$/)
  referrerName: string;

  @IsEmail()
  @MaxLength(255)
  referrerEmail: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  company: string;

  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MinLength(10, { each: true })
  @MaxLength(500, { each: true })
  questions: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(ReferenceFormat, { each: true })
  allowedFormats: ReferenceFormat[];

  @IsBoolean()
  allowEmployerReachback: boolean;

  @IsInt()
  @Min(7)
  @Max(90)
  expiryDays: number;
}
```

**Sanitization:**
- HTML tags stripped from text inputs
- SQL injection protection (parameterized queries)
- NoSQL injection protection (MongoDB)
- XSS protection (Content-Security-Policy headers)
- File upload validation (MIME type, magic number check)

---

### 5.4 Output Sanitization

**Response Filtering:**
1. Remove sensitive fields (password, tokens, internal IDs)
2. Redact PII based on permissions
3. Apply field-level encryption for sensitive data
4. Enforce content-type headers

**Example:**
```typescript
// User entity with sensitive fields
export class User {
  id: string;
  email: string;
  password: string;  // Never exposed
  firstName: string;
  lastName: string;

  @Exclude()
  emailVerificationCode: string;  // Excluded from responses

  @Exclude()
  magicLinkToken: string;
}
```

**Content Security Policy:**
```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.aideepref.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://cdn.aideepref.com;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.aideepref.com wss://api.aideepref.com;
  frame-ancestors 'none';
```

**Security Headers:**
```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

---

### 5.5 API Security Best Practices

**OWASP API Security Top 10 Mitigation:**

1. **Broken Object Level Authorization**
   - Always verify user owns resource before access
   - Use UUID instead of sequential IDs
   - Implement resource-level permissions

2. **Broken Authentication**
   - JWT with short expiry (15 minutes)
   - Refresh token rotation
   - MFA for sensitive operations
   - Account lockout after failed attempts

3. **Broken Object Property Level Authorization**
   - DTO validation for input
   - Response serialization for output
   - Role-based field filtering

4. **Unrestricted Resource Consumption**
   - Rate limiting per endpoint
   - File size limits
   - Pagination for large datasets
   - Request timeout (30 seconds)

5. **Broken Function Level Authorization**
   - RBAC enforcement on all endpoints
   - Admin-only endpoints segregated
   - Audit logging for privileged actions

6. **Unrestricted Access to Sensitive Business Flows**
   - Multi-step verification for critical flows
   - Transaction rate limiting
   - Anomaly detection

7. **Server-Side Request Forgery (SSRF)**
   - URL validation and whitelisting
   - No direct user-controlled URLs
   - Network segmentation

8. **Security Misconfiguration**
   - Secure defaults
   - Automated security scanning
   - Regular dependency updates
   - Secrets management (AWS Secrets Manager)

9. **Improper Inventory Management**
   - API versioning
   - Deprecation warnings
   - Endpoint documentation
   - OpenAPI specification

10. **Unsafe Consumption of APIs**
    - Input validation for third-party data
    - Timeout and circuit breaker for external calls
    - Response validation

---

## 6. OpenAPI 3.1 Specifications

### 6.1 Complete OpenAPI Document

```yaml
openapi: 3.1.0
info:
  title: AiDeepRef API
  version: 1.0.0
  description: |
    AI-powered professional reference verification platform API.

    ## Authentication
    All endpoints except `/auth/*` require Bearer token authentication.

    ## Rate Limiting
    Rate limits vary by endpoint and subscription tier. See response headers for current limits.

    ## Pagination
    List endpoints support `limit` (max 100) and `offset` parameters.

    ## Errors
    All errors follow standard format with `statusCode`, `message`, and `errors` array.
  contact:
    name: AiDeepRef API Support
    email: api-support@aideepref.com
    url: https://docs.aideepref.com
  license:
    name: Proprietary
    url: https://aideepref.com/terms

servers:
  - url: https://api.aideepref.com/api/v1
    description: Production server
  - url: https://staging-api.aideepref.com/api/v1
    description: Staging server
  - url: http://localhost:3000/api/v1
    description: Local development server

security:
  - bearerAuth: []

tags:
  - name: Authentication
    description: User authentication and session management
  - name: MFA
    description: Multi-factor authentication management
  - name: Users
    description: User profile management
  - name: KYC
    description: Know Your Customer verification
  - name: References
    description: Reference request and submission
  - name: Bundles
    description: Reference bundle management
  - name: AI
    description: AI-powered services

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT access token obtained from /auth/login or /auth/signup

  schemas:
    # Common Schemas
    Error:
      type: object
      required:
        - statusCode
        - message
        - timestamp
        - path
      properties:
        statusCode:
          type: integer
          example: 400
        message:
          type: string
          example: Validation failed
        code:
          type: string
          example: VALIDATION_ERROR
        errors:
          type: array
          items:
            $ref: '#/components/schemas/ValidationError'
        timestamp:
          type: string
          format: date-time
          example: '2025-11-23T11:30:00Z'
        path:
          type: string
          example: /api/v1/auth/signup
        requestId:
          type: string
          format: uuid
          example: 770e8400-e29b-41d4-a716-446655440000

    ValidationError:
      type: object
      required:
        - field
        - message
        - code
      properties:
        field:
          type: string
          example: email
        message:
          type: string
          example: Invalid email format
        code:
          type: string
          example: INVALID_FORMAT

    Pagination:
      type: object
      required:
        - total
        - limit
        - offset
        - hasMore
      properties:
        total:
          type: integer
          example: 100
        limit:
          type: integer
          example: 20
        offset:
          type: integer
          example: 0
        hasMore:
          type: boolean
          example: true

    # Auth Schemas
    SignupRequest:
      type: object
      required:
        - firstName
        - lastName
        - email
        - password
        - role
        - acceptedTerms
      properties:
        firstName:
          type: string
          minLength: 1
          maxLength: 100
          example: Sarah
        lastName:
          type: string
          minLength: 1
          maxLength: 100
          example: Chen
        email:
          type: string
          format: email
          maxLength: 255
          example: sarah@example.com
        password:
          type: string
          format: password
          minLength: 12
          maxLength: 128
          example: SecureP@ssw0rd123!
        role:
          type: string
          enum: [seeker, referrer, employer]
          example: seeker
        acceptedTerms:
          type: boolean
          example: true

    AuthResponse:
      type: object
      required:
        - userId
        - email
        - accessToken
        - refreshToken
        - expiresIn
      properties:
        userId:
          type: string
          format: uuid
          example: 550e8400-e29b-41d4-a716-446655440000
        email:
          type: string
          format: email
          example: sarah@example.com
        role:
          type: string
          enum: [seeker, referrer, employer, admin]
          example: seeker
        accessToken:
          type: string
          example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
        refreshToken:
          type: string
          example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
        expiresIn:
          type: integer
          description: Access token expiry in seconds
          example: 900
        mfaRequired:
          type: boolean
          example: false

    # User Schemas
    User:
      type: object
      required:
        - id
        - firstName
        - lastName
        - email
        - role
        - emailVerified
        - kycStatus
        - createdAt
      properties:
        id:
          type: string
          format: uuid
          example: 550e8400-e29b-41d4-a716-446655440000
        firstName:
          type: string
          example: Sarah
        lastName:
          type: string
          example: Chen
        email:
          type: string
          format: email
          example: sarah@example.com
        role:
          type: string
          enum: [seeker, referrer, employer, admin]
          example: seeker
        emailVerified:
          type: boolean
          example: true
        kycStatus:
          type: string
          enum: [pending, verified, failed]
          example: verified
        kycCompleted:
          type: boolean
          example: true
        mfaEnabled:
          type: boolean
          example: true
        profilePictureUrl:
          type: string
          format: uri
          nullable: true
          example: https://cdn.aideepref.com/profiles/550e8400.jpg
        phoneNumber:
          type: string
          nullable: true
          example: '+1-415-555-0123'
        createdAt:
          type: string
          format: date-time
          example: '2025-01-15T08:00:00Z'
        lastLoginAt:
          type: string
          format: date-time
          nullable: true
          example: '2025-11-23T10:30:00Z'

    # Reference Schemas
    CreateReferenceRequest:
      type: object
      required:
        - referrerName
        - referrerEmail
        - company
        - role
        - questions
        - allowedFormats
      properties:
        referrerName:
          type: string
          minLength: 2
          maxLength: 100
          example: Marcus Johnson
        referrerEmail:
          type: string
          format: email
          example: marcus@techcorp.com
        company:
          type: string
          minLength: 2
          maxLength: 200
          example: TechCorp Inc.
        role:
          type: string
          minLength: 2
          maxLength: 100
          example: Engineering Manager
        relationshipContext:
          type: string
          maxLength: 500
          example: Direct manager for 2 years
        questions:
          type: array
          minItems: 3
          maxItems: 10
          items:
            type: string
            minLength: 10
            maxLength: 500
          example:
            - How would you describe Sarah's technical abilities?
            - Can you provide an example of Sarah's leadership skills?
        allowedFormats:
          type: array
          minItems: 1
          items:
            type: string
            enum: [video, audio, text]
          example: [video, audio, text]
        allowEmployerReachback:
          type: boolean
          default: false
          example: true
        expiryDays:
          type: integer
          minimum: 7
          maximum: 90
          default: 30
          example: 30

    Reference:
      type: object
      required:
        - id
        - seekerId
        - referrerId
        - referrerName
        - referrerEmail
        - company
        - role
        - status
        - createdAt
      properties:
        id:
          type: string
          format: uuid
          example: ref-uuid
        seekerId:
          type: string
          format: uuid
          example: 550e8400-e29b-41d4-a716-446655440000
        seekerName:
          type: string
          example: Sarah Chen
        referrerId:
          type: string
          format: uuid
          nullable: true
          example: referrer-uuid
        referrerName:
          type: string
          example: Marcus Johnson
        referrerEmail:
          type: string
          format: email
          example: marcus@techcorp.com
        company:
          type: string
          example: TechCorp Inc.
        role:
          type: string
          example: Engineering Manager
        status:
          type: string
          enum: [pending, completed, declined, expired]
          example: completed
        format:
          type: string
          enum: [video, audio, text]
          nullable: true
          example: video
        contentUrl:
          type: string
          format: uri
          nullable: true
          example: https://cdn.aideepref.com/references/ref-uuid/video.mp4
        questions:
          type: array
          items:
            type: string
          example:
            - How would you describe Sarah's technical abilities?
        responses:
          type: object
          nullable: true
          additionalProperties:
            type: string
          example:
            q1: Sarah is an exceptional engineer...
        rcsScore:
          type: number
          format: float
          minimum: 0
          maximum: 100
          nullable: true
          example: 92.5
        aiAuthenticityScore:
          type: number
          format: float
          minimum: 0
          maximum: 1
          nullable: true
          example: 0.98
        deepfakeProbability:
          type: number
          format: float
          minimum: 0
          maximum: 1
          nullable: true
          example: 0.02
        createdAt:
          type: string
          format: date-time
          example: '2025-11-23T10:45:00Z'
        submittedAt:
          type: string
          format: date-time
          nullable: true
          example: '2025-11-25T14:30:00Z'
        expiryDate:
          type: string
          format: date-time
          example: '2025-12-23T00:00:00Z'

    # Bundle Schemas
    CreateBundleRequest:
      type: object
      required:
        - title
        - referenceIds
      properties:
        title:
          type: string
          minLength: 5
          maxLength: 200
          example: Senior Product Manager Applications 2025
        description:
          type: string
          maxLength: 1000
          example: Reference bundle for Director/VP-level PM roles
        referenceIds:
          type: array
          minItems: 1
          maxItems: 20
          items:
            type: string
            format: uuid
          example:
            - ref-uuid-1
            - ref-uuid-2
        password:
          type: string
          minLength: 8
          maxLength: 128
          nullable: true
          example: OptionalP@ssw0rd
        expiryDays:
          type: integer
          minimum: 7
          maximum: 365
          default: 90
          example: 90

    Bundle:
      type: object
      required:
        - id
        - title
        - seekerId
        - seekerName
        - aggregatedRCS
        - references
        - createdAt
      properties:
        id:
          type: string
          format: uuid
          example: bundle-uuid
        title:
          type: string
          example: Senior Product Manager Applications 2025
        description:
          type: string
          nullable: true
          example: Reference bundle for Director/VP-level PM roles
        seekerId:
          type: string
          format: uuid
          example: 550e8400-e29b-41d4-a716-446655440000
        seekerName:
          type: string
          example: Sarah Chen
        shareLink:
          type: string
          format: uri
          example: https://app.aideepref.com/bundles/abc123def456
        password:
          type: string
          nullable: true
          writeOnly: true
          example: OptionalP@ssw0rd
        aggregatedRCS:
          type: number
          format: float
          minimum: 0
          maximum: 100
          example: 91.3
        references:
          type: array
          items:
            $ref: '#/components/schemas/Reference'
        viewCount:
          type: integer
          example: 7
        expiryDate:
          type: string
          format: date-time
          nullable: true
          example: '2026-02-21T00:00:00Z'
        createdAt:
          type: string
          format: date-time
          example: '2025-11-23T11:00:00Z'
        updatedAt:
          type: string
          format: date-time
          example: '2025-11-23T11:05:00Z'

  responses:
    Unauthorized:
      description: Unauthorized - Invalid or missing authentication token
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            statusCode: 401
            message: Access token has expired
            code: TOKEN_EXPIRED
            timestamp: '2025-11-23T11:30:00Z'
            path: /api/v1/users/me
            requestId: 770e8400-e29b-41d4-a716-446655440000

    Forbidden:
      description: Forbidden - Insufficient permissions
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            statusCode: 403
            message: You do not have permission to access this resource
            code: FORBIDDEN
            timestamp: '2025-11-23T11:30:00Z'
            path: /api/v1/admin/users
            requestId: 770e8400-e29b-41d4-a716-446655440000

    NotFound:
      description: Not Found - Resource does not exist
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            statusCode: 404
            message: Resource not found
            code: NOT_FOUND
            timestamp: '2025-11-23T11:30:00Z'
            path: /api/v1/references/invalid-uuid
            requestId: 770e8400-e29b-41d4-a716-446655440000

    RateLimitExceeded:
      description: Rate Limit Exceeded
      headers:
        X-RateLimit-Limit:
          schema:
            type: integer
          description: Request limit per window
          example: 100
        X-RateLimit-Remaining:
          schema:
            type: integer
          description: Requests remaining in current window
          example: 0
        X-RateLimit-Reset:
          schema:
            type: integer
          description: Unix timestamp when limit resets
          example: 1700001600
        Retry-After:
          schema:
            type: integer
          description: Seconds until retry
          example: 900
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            statusCode: 429
            message: Too many requests. Please try again later.
            code: RATE_LIMIT_EXCEEDED
            retryAfter: 900
            timestamp: '2025-11-23T11:30:00Z'
            path: /api/v1/ai/chat
            requestId: 770e8400-e29b-41d4-a716-446655440000

paths:
  /auth/signup:
    post:
      tags:
        - Authentication
      summary: Register new user account
      description: Create a new user account with email and password
      operationId: signup
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SignupRequest'
      responses:
        '201':
          description: User successfully registered
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        '400':
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '409':
          description: Email already exists
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '429':
          $ref: '#/components/responses/RateLimitExceeded'

  /auth/login:
    post:
      tags:
        - Authentication
      summary: Authenticate user
      description: Sign in with email and password
      operationId: login
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
              properties:
                email:
                  type: string
                  format: email
                  example: sarah@example.com
                password:
                  type: string
                  format: password
                  example: SecureP@ssw0rd123!
      responses:
        '200':
          description: User successfully authenticated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        '401':
          description: Invalid credentials
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '429':
          $ref: '#/components/responses/RateLimitExceeded'

  /users/{userId}/profile:
    get:
      tags:
        - Users
      summary: Get user profile
      description: Retrieve user profile information
      operationId: getUserProfile
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
            format: uuid
          example: 550e8400-e29b-41d4-a716-446655440000
      responses:
        '200':
          description: User profile retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'

  /seekers/{userId}/references/request:
    post:
      tags:
        - References
      summary: Create reference request
      description: Request a new reference from a referrer
      operationId: createReferenceRequest
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
            format: uuid
          example: 550e8400-e29b-41d4-a716-446655440000
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateReferenceRequest'
      responses:
        '201':
          description: Reference request created successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  referenceId:
                    type: string
                    format: uuid
                    example: ref-uuid
                  invitationLink:
                    type: string
                    format: uri
                    example: https://app.aideepref.com/references/ref-uuid/submit
                  expiryDate:
                    type: string
                    format: date-time
                    example: '2025-12-23T00:00:00Z'
        '400':
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '429':
          $ref: '#/components/responses/RateLimitExceeded'

  /references/{referenceId}:
    get:
      tags:
        - References
      summary: Get reference details
      description: Retrieve details of a specific reference
      operationId: getReference
      parameters:
        - name: referenceId
          in: path
          required: true
          schema:
            type: string
            format: uuid
          example: ref-uuid
      responses:
        '200':
          description: Reference retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Reference'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'

  /bundles:
    post:
      tags:
        - Bundles
      summary: Create reference bundle
      description: Create a shareable bundle of references
      operationId: createBundle
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateBundleRequest'
      responses:
        '201':
          description: Bundle created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Bundle'
        '400':
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /bundles/{bundleId}:
    get:
      tags:
        - Bundles
      summary: Get bundle details
      description: Retrieve bundle details with all references
      operationId: getBundle
      parameters:
        - name: bundleId
          in: path
          required: true
          schema:
            type: string
            format: uuid
          example: bundle-uuid
        - name: password
          in: query
          required: false
          schema:
            type: string
          description: Required if bundle is password-protected
      responses:
        '200':
          description: Bundle retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Bundle'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'

  /ai/chat:
    post:
      tags:
        - AI
      summary: Send message to AI
      description: Chat with AI coach for reference guidance
      operationId: aiChat
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - agent_id
                - message
              properties:
                agent_id:
                  type: string
                  enum: [reference_coach, question_generator, authenticity_analyzer, rcs_explainer]
                  example: reference_coach
                message:
                  type: string
                  minLength: 1
                  maxLength: 2000
                  example: How should I structure my reference request?
      responses:
        '200':
          description: AI response received
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    example: When requesting a reference...
                  interaction_id:
                    type: string
                    format: uuid
                    example: 770e8400-e29b-41d4-a716-446655440002
                  tokens_used:
                    type: integer
                    example: 342
                  model_used:
                    type: string
                    example: claude-3-5-sonnet-20241022
        '401':
          $ref: '#/components/responses/Unauthorized'
        '429':
          $ref: '#/components/responses/RateLimitExceeded'
```

---

## 7. Integration Guide

### 7.1 Quick Start

**1. Register for API Access**
```bash
curl -X POST https://api.aideepref.com/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Sarah",
    "lastName": "Chen",
    "email": "sarah@example.com",
    "password": "SecureP@ssw0rd123!",
    "role": "seeker",
    "acceptedTerms": true
  }'
```

**2. Authenticate**
```bash
curl -X POST https://api.aideepref.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sarah@example.com",
    "password": "SecureP@ssw0rd123!"
  }'
```

**3. Use Access Token**
```bash
curl -X GET https://api.aideepref.com/api/v1/users/me/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 7.2 SDK Examples

**JavaScript/TypeScript SDK**
```typescript
import { AiDeepRefClient } from '@aideepref/sdk';

const client = new AiDeepRefClient({
  apiKey: process.env.AIDEEPREF_API_KEY,
  environment: 'production'
});

// Create reference request
const reference = await client.references.create({
  referrerName: 'Marcus Johnson',
  referrerEmail: 'marcus@techcorp.com',
  company: 'TechCorp Inc.',
  role: 'Engineering Manager',
  questions: [
    'How would you describe Sarah\'s technical abilities?',
    'Can you provide an example of Sarah\'s leadership skills?'
  ],
  allowedFormats: ['video', 'audio', 'text']
});

// Create bundle
const bundle = await client.bundles.create({
  title: 'Senior PM Applications 2025',
  referenceIds: [reference.id],
  expiryDays: 90
});

console.log(`Share link: ${bundle.shareLink}`);
```

**Python SDK**
```python
from aideepref import AiDeepRefClient

client = AiDeepRefClient(
    api_key=os.environ['AIDEEPREF_API_KEY'],
    environment='production'
)

# Create reference request
reference = client.references.create(
    referrer_name='Marcus Johnson',
    referrer_email='marcus@techcorp.com',
    company='TechCorp Inc.',
    role='Engineering Manager',
    questions=[
        'How would you describe Sarah\'s technical abilities?',
        'Can you provide an example of Sarah\'s leadership skills?'
    ],
    allowed_formats=['video', 'audio', 'text']
)

# Create bundle
bundle = client.bundles.create(
    title='Senior PM Applications 2025',
    reference_ids=[reference.id],
    expiry_days=90
)

print(f'Share link: {bundle.share_link}')
```

---

### 7.3 Postman Collection

**Import URL:**
```
https://api.aideepref.com/postman/collection.json
```

**Environment Variables:**
```json
{
  "base_url": "https://api.aideepref.com/api/v1",
  "access_token": "{{access_token}}",
  "user_id": "{{user_id}}"
}
```

---

### 7.4 API Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-23 | Initial API release |

---

## Appendix

### A. HTTP Status Code Reference

| Code | Description | When to Use |
|------|-------------|-------------|
| 200 | OK | Successful GET, PUT, PATCH, DELETE |
| 201 | Created | Successful POST creating a resource |
| 202 | Accepted | Async operation initiated |
| 204 | No Content | Successful DELETE with no response body |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 413 | Payload Too Large | Request body exceeds limit |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | Upstream service error |
| 503 | Service Unavailable | Service temporarily down |
| 504 | Gateway Timeout | Request timeout |

---

### B. Contact & Support

**API Documentation:** https://docs.aideepref.com
**API Status:** https://status.aideepref.com
**Support Email:** api-support@aideepref.com
**Developer Portal:** https://developers.aideepref.com

---

*End of API Specifications v1.0*
