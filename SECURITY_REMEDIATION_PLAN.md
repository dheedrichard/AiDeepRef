# Security Vulnerability Remediation Plan

**Generated:** 2025-11-20
**Project:** AiDeepRef
**Priority:** Critical Security Fixes Required

---

## Executive Summary

This document provides detailed remediation plans for **7 critical and high-priority security vulnerabilities** identified in the AiDeepRef application. All issues require immediate attention to prevent potential security breaches.

**Total Estimated Time:** 12-16 hours
**Recommended Timeline:** Complete all fixes within 48-72 hours

---

## Table of Contents

1. [Critical Issues (Immediate Fix Required)](#critical-issues)
   - [Issue #1: Incomplete Sentry Error Handler](#issue-1-incomplete-sentry-error-handler)
   - [Issue #2: Insecure Session Secret Default](#issue-2-insecure-session-secret-default)
   - [Issue #3: Direct process.env Access for API Keys](#issue-3-direct-processenv-access-for-api-keys)
2. [High Priority Issues](#high-priority-issues)
   - [Issue #4: CORS Allows Missing Origin Headers](#issue-4-cors-allows-missing-origin-headers)
   - [Issue #5: Email Templates Not Escaped (HTML Injection Risk)](#issue-5-email-templates-not-escaped)
   - [Issue #6: CSRF Cookie Readable by JavaScript](#issue-6-csrf-cookie-readable-by-javascript)
   - [Issue #7: Magic Link Tokens Stored in Plaintext](#issue-7-magic-link-tokens-stored-in-plaintext)
3. [Bonus Issue: Missing Email Method](#issue-8-missing-sendsecurityalert-method)
4. [Overall Security Timeline](#overall-security-timeline)
5. [Dependencies Between Fixes](#dependencies-between-fixes)
6. [Rollout Strategy](#rollout-strategy)
7. [Verification Checklist](#verification-checklist)

---

## Critical Issues

### Issue #1: Incomplete Sentry Error Handler

**File:** `/home/user/AiDeepRef/apps/api/src/main.ts:18`

#### Current Code Analysis
```typescript
// Line 17-19
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler;  // ❌ Function referenced but not called
}
```

**Problem:** The Sentry error handler is referenced but never invoked. This means:
- Errors are NOT being sent to Sentry for monitoring
- Application errors go unreported
- No error tracking in production

#### Security Risk Explanation
- **Severity:** Critical
- **Impact:** Complete loss of error monitoring and security incident detection
- **Attack Vector:** Attackers can exploit errors without detection
- **Data Exposure:** Errors may leak sensitive data without being logged
- **OWASP Category:** A09:2021 - Security Logging and Monitoring Failures

#### Exact Code Changes

**BEFORE:**
```typescript
// File: /home/user/AiDeepRef/apps/api/src/main.ts
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Initialize Sentry before creating the NestJS app
  // This is required for proper Express integration
  if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler;
  }

  const app = await NestFactory.create(AppModule);
  // ... rest of code
}
```

**AFTER:**
```typescript
// File: /home/user/AiDeepRef/apps/api/src/main.ts
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Initialize Sentry before creating the NestJS app
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      // Don't send errors in development
      enabled: process.env.NODE_ENV === 'production',
      integrations: [
        // Enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
      ],
      beforeSend(event, hint) {
        // Sanitize sensitive data before sending to Sentry
        if (event.request) {
          delete event.request.cookies;
          if (event.request.headers) {
            delete event.request.headers['authorization'];
            delete event.request.headers['cookie'];
          }
        }
        return event;
      },
    });
    logger.log('✅ Sentry monitoring initialized');
  }

  const app = await NestFactory.create(AppModule);

  // Use Winston logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Security: Add Helmet middleware
  app.use(helmetMiddleware);

  // ... rest of middleware setup ...

  // IMPORTANT: Add Sentry error handler AFTER all other middleware
  // but BEFORE any other error handlers
  if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }

  // ... rest of app configuration ...

  const port = process.env.PORT || 3000;
  await app.listen(port);

  // Add Sentry error handler middleware AFTER listen
  if (process.env.SENTRY_DSN) {
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.use(Sentry.Handlers.errorHandler());
    logger.log('✅ Sentry error handler registered');
  }

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}
```

#### Implementation Steps

1. **Install Sentry dependencies (if not already installed)**
   ```bash
   npm install @sentry/node @sentry/integrations
   ```

2. **Update main.ts** - Replace lines 15-19 with the new Sentry initialization code above

3. **Add Sentry DSN to environment variables**
   ```bash
   # In .env file
   SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
   NODE_ENV=production
   ```

4. **Test the error handler**
   - Create a test endpoint that throws an error
   - Verify the error appears in Sentry dashboard
   - Check that sensitive headers are stripped

5. **Update .env.example** with Sentry configuration comments

#### Testing Recommendations

```typescript
// Create a test endpoint in any controller
@Get('test-sentry')
testSentry() {
  throw new Error('Test Sentry error tracking');
}
```

**Test Cases:**
- ✅ Error appears in Sentry dashboard within 30 seconds
- ✅ Authorization headers are NOT visible in Sentry
- ✅ Cookie data is NOT visible in Sentry
- ✅ Stack trace is complete and accurate
- ✅ Environment is correctly set (development/production)
- ✅ Errors in development mode are not sent to Sentry

#### Estimated Time to Fix
**2 hours** (including testing and verification)

---

### Issue #2: Insecure Session Secret Default

**File:** `/home/user/AiDeepRef/apps/api/src/main.ts:56`

#### Current Code Analysis
```typescript
// Line 54-66
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-this-secret-in-production',  // ❌ Weak default
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 3600000, // 1 hour
      sameSite: 'strict',
    },
  }),
);
```

**Problem:**
- Default secret is predictable and well-known
- If SESSION_SECRET is not set, all sessions can be forged
- Session data can be tampered with

#### Security Risk Explanation
- **Severity:** Critical (CVSS 9.1)
- **Impact:** Complete session compromise, authentication bypass
- **Attack Vector:** Attacker can forge session cookies and impersonate any user
- **Data Exposure:** All session data, user authentication, CSRF tokens
- **OWASP Category:** A02:2021 - Cryptographic Failures
- **Real-world Impact:**
  - Attacker can create admin sessions
  - Bypass authentication entirely
  - Access any user's account
  - Steal CSRF tokens

#### Exact Code Changes

**BEFORE:**
```typescript
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-this-secret-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 3600000,
      sameSite: 'strict',
    },
  }),
);
```

**AFTER:**
```typescript
// Validate SESSION_SECRET exists and is strong enough
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  logger.error('❌ SESSION_SECRET environment variable is required but not set');
  throw new Error('SESSION_SECRET must be set in environment variables');
}

if (sessionSecret.length < 32) {
  logger.error('❌ SESSION_SECRET is too short (minimum 32 characters required)');
  throw new Error('SESSION_SECRET must be at least 32 characters long');
}

// Validate it's not the default value
if (sessionSecret === 'change-this-secret-in-production' ||
    sessionSecret === 'your_session_secret_here') {
  logger.error('❌ SESSION_SECRET is using default/example value');
  throw new Error('SESSION_SECRET must be changed from default value');
}

logger.log('✅ Session secret validated');

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 3600000, // 1 hour
      sameSite: 'strict',
      // Add domain restriction in production
      domain: process.env.NODE_ENV === 'production'
        ? process.env.COOKIE_DOMAIN
        : undefined,
    },
    // Use Redis for session storage in production
    store: process.env.REDIS_HOST
      ? new (require('connect-redis').default)({
          client: redisClient,
          prefix: 'sess:',
        })
      : undefined,
  }),
);
```

#### Implementation Steps

1. **Generate a strong session secret**
   ```bash
   # Generate a cryptographically secure secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Update .env file**
   ```bash
   # Add to .env (DO NOT commit this file)
   SESSION_SECRET=<paste-the-generated-secret-here>
   COOKIE_DOMAIN=yourdomain.com  # For production
   ```

3. **Update .env.example**
   ```bash
   # Session Security - CRITICAL: Generate using:
   # node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   SESSION_SECRET=REQUIRED_GENERATE_UNIQUE_VALUE_64_CHARS_MIN
   COOKIE_DOMAIN=  # Set to your domain in production
   ```

4. **Update main.ts** with validation code (lines 50-72)

5. **Add session store for production**
   ```bash
   npm install connect-redis redis
   ```

6. **Create session store configuration** (if using Redis)
   ```typescript
   // At top of main.ts
   import { createClient } from 'redis';
   import RedisStore from 'connect-redis';

   // In bootstrap function, before session setup
   let redisClient;
   if (process.env.REDIS_HOST) {
     redisClient = createClient({
       socket: {
         host: process.env.REDIS_HOST,
         port: parseInt(process.env.REDIS_PORT || '6379'),
       },
       password: process.env.REDIS_PASSWORD,
     });
     await redisClient.connect();
     logger.log('✅ Redis session store connected');
   }
   ```

#### Testing Recommendations

**Pre-deployment Tests:**
```bash
# Test 1: Verify app fails to start without SESSION_SECRET
unset SESSION_SECRET
npm run start
# Expected: Application should fail with clear error message

# Test 2: Verify app fails with short secret
export SESSION_SECRET="short"
npm run start
# Expected: Application should fail with error about length

# Test 3: Verify app fails with default value
export SESSION_SECRET="change-this-secret-in-production"
npm run start
# Expected: Application should fail with error about default value

# Test 4: Verify app starts with valid secret
export SESSION_SECRET="$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"
npm run start
# Expected: Application starts successfully
```

**Runtime Tests:**
- ✅ Sessions are created correctly
- ✅ Sessions persist across requests
- ✅ Sessions expire after maxAge
- ✅ Session cookies have all security flags
- ✅ Redis store is used in production (if configured)

#### Estimated Time to Fix
**1.5 hours** (including validation logic and testing)

---

### Issue #3: Direct process.env Access for API Keys

**File:** `/home/user/AiDeepRef/apps/api/src/ai/config/ai-models.config.ts`

#### Current Code Analysis
```typescript
// Lines 26-55 (showing critical parts)
export default registerAs('aiModels', () => ({
  providers: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,  // ❌ No validation
      models: {
        opus: process.env.ANTHROPIC_MODEL_OPUS || 'claude-opus-4-20250514',
        sonnet: process.env.ANTHROPIC_MODEL_SONNET || 'claude-sonnet-4-5-20250514',
        haiku: process.env.ANTHROPIC_MODEL_HAIKU || 'claude-haiku-4-5-20250514',
      },
      enabled: process.env.ANTHROPIC_ENABLED !== 'false',
      priority: 1,
    },
    google: {
      apiKey: process.env.GOOGLE_API_KEY,  // ❌ No validation
      // ...
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,  // ❌ No validation
      organization: process.env.OPENAI_ORGANIZATION,
      // ...
    },
  },
  // ... rest of config
}));
```

**Problem:**
- API keys accessed without validation
- No check if keys exist before use
- No format validation for API keys
- Silent failures if keys are missing
- Keys could be undefined/empty strings

#### Security Risk Explanation
- **Severity:** Critical (CVSS 8.2)
- **Impact:** Application fails silently, exposes missing configuration, potential API abuse
- **Attack Vector:**
  - Missing API keys lead to undefined behavior
  - Invalid keys may leak in error messages
  - No rate limiting without proper key validation
- **Data Exposure:** Error messages may reveal API key format/structure
- **OWASP Category:** A05:2021 - Security Misconfiguration
- **Real-world Impact:**
  - AI features fail silently
  - Cost overruns if invalid keys allow unlimited usage
  - Security logs may contain partial API keys

#### Exact Code Changes

**Step 1: Create API Key Validator Utility**

Create new file: `/home/user/AiDeepRef/apps/api/src/common/validators/api-key.validator.ts`

```typescript
import { Logger } from '@nestjs/common';

const logger = new Logger('ApiKeyValidator');

export interface ApiKeyValidationRule {
  name: string;
  envVar: string;
  required: boolean;
  format?: RegExp;
  minLength?: number;
  examplePrefix?: string;
}

export class ApiKeyValidator {
  /**
   * Validates API keys according to rules
   * Throws error if required keys are missing or invalid
   */
  static validate(rules: ApiKeyValidationRule[]): void {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of rules) {
      const value = process.env[rule.envVar];

      // Check if required key is missing
      if (rule.required && !value) {
        errors.push(
          `❌ ${rule.name}: Required API key ${rule.envVar} is not set`
        );
        continue;
      }

      // Skip validation if key is optional and not provided
      if (!rule.required && !value) {
        warnings.push(
          `⚠️  ${rule.name}: Optional API key ${rule.envVar} is not set - feature will be disabled`
        );
        continue;
      }

      // Validate key exists and is not empty
      if (value && value.trim() === '') {
        errors.push(
          `❌ ${rule.name}: ${rule.envVar} is set but empty`
        );
        continue;
      }

      // Validate minimum length
      if (rule.minLength && value && value.length < rule.minLength) {
        errors.push(
          `❌ ${rule.name}: ${rule.envVar} is too short (minimum ${rule.minLength} characters)`
        );
        continue;
      }

      // Validate format with regex
      if (rule.format && value && !rule.format.test(value)) {
        errors.push(
          `❌ ${rule.name}: ${rule.envVar} has invalid format${
            rule.examplePrefix ? ` (should start with ${rule.examplePrefix})` : ''
          }`
        );
        continue;
      }

      // Success - log sanitized confirmation
      const sanitized = this.sanitizeKeyForLog(value);
      logger.log(`✅ ${rule.name}: Valid API key loaded (${sanitized})`);
    }

    // Log all warnings
    warnings.forEach(warning => logger.warn(warning));

    // Throw error if any validation failed
    if (errors.length > 0) {
      const errorMessage = [
        '🚨 API Key Validation Failed:',
        ...errors,
        '',
        'Please check your .env file and ensure all required API keys are set correctly.',
      ].join('\n');

      logger.error(errorMessage);
      throw new Error('API key validation failed');
    }
  }

  /**
   * Sanitizes API key for logging (shows first/last chars only)
   */
  private static sanitizeKeyForLog(key: string | undefined): string {
    if (!key || key.length < 8) return '***';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  }

  /**
   * Gets validated API key or throws error
   */
  static getRequiredKey(envVar: string, name: string): string {
    const value = process.env[envVar];
    if (!value) {
      throw new Error(`Required API key ${envVar} (${name}) is not set`);
    }
    return value;
  }

  /**
   * Gets optional API key or returns undefined
   */
  static getOptionalKey(envVar: string): string | undefined {
    const value = process.env[envVar];
    return value || undefined;
  }
}
```

**Step 2: Update AI Models Config**

Replace `/home/user/AiDeepRef/apps/api/src/ai/config/ai-models.config.ts` with:

```typescript
import { registerAs } from '@nestjs/config';
import { TaskType, ModelCapability } from '../providers/base.provider';
import { ApiKeyValidator } from '../../common/validators/api-key.validator';

/**
 * Validate API keys on module load
 */
function validateApiKeys(): void {
  ApiKeyValidator.validate([
    {
      name: 'Anthropic API',
      envVar: 'ANTHROPIC_API_KEY',
      required: false, // At least one provider should be enabled
      format: /^sk-ant-api03-[a-zA-Z0-9_-]+$/,
      minLength: 40,
      examplePrefix: 'sk-ant-api03-',
    },
    {
      name: 'Google AI API',
      envVar: 'GOOGLE_API_KEY',
      required: false,
      format: /^[a-zA-Z0-9_-]{30,}$/,
      minLength: 30,
    },
    {
      name: 'OpenAI API',
      envVar: 'OPENAI_API_KEY',
      required: false,
      format: /^sk-[a-zA-Z0-9]{20,}$/,
      minLength: 20,
      examplePrefix: 'sk-',
    },
  ]);

  // Ensure at least one provider is enabled
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasGoogleKey = !!process.env.GOOGLE_API_KEY;
  const hasOpenAiKey = !!process.env.OPENAI_API_KEY;

  if (!hasAnthropicKey && !hasGoogleKey && !hasOpenAiKey) {
    throw new Error(
      '🚨 No AI provider API keys configured. At least one of ANTHROPIC_API_KEY, GOOGLE_API_KEY, or OPENAI_API_KEY must be set.'
    );
  }
}

// Validate on module load
validateApiKeys();

/**
 * Model selection configuration for intelligent routing
 */
export interface ModelSelectionConfig {
  taskType: TaskType;
  preferredProvider: 'anthropic' | 'google' | 'openai';
  preferredModel: string;
  fallbackModels: Array<{
    provider: string;
    model: string;
  }>;
  maxTokens?: number;
  temperature?: number;
  costWeight: number;
  qualityWeight: number;
}

/**
 * AI Models Configuration
 */
export default registerAs('aiModels', () => ({
  // Provider API Keys - now validated
  providers: {
    anthropic: {
      apiKey: ApiKeyValidator.getOptionalKey('ANTHROPIC_API_KEY'),
      models: {
        opus: process.env.ANTHROPIC_MODEL_OPUS || 'claude-opus-4-20250514',
        sonnet: process.env.ANTHROPIC_MODEL_SONNET || 'claude-sonnet-4-5-20250514',
        haiku: process.env.ANTHROPIC_MODEL_HAIKU || 'claude-haiku-4-5-20250514',
      },
      enabled: process.env.ANTHROPIC_ENABLED !== 'false' && !!process.env.ANTHROPIC_API_KEY,
      priority: 1,
    },
    google: {
      apiKey: ApiKeyValidator.getOptionalKey('GOOGLE_API_KEY'),
      models: {
        pro: process.env.GOOGLE_MODEL_PRO || 'gemini-3-pro',
        flash: process.env.GOOGLE_MODEL_FLASH || 'gemini-3-flash',
      },
      enabled: process.env.GOOGLE_ENABLED !== 'false' && !!process.env.GOOGLE_API_KEY,
      priority: 2,
    },
    openai: {
      apiKey: ApiKeyValidator.getOptionalKey('OPENAI_API_KEY'),
      organization: process.env.OPENAI_ORGANIZATION,
      models: {
        gpt5: process.env.OPENAI_MODEL || 'gpt-5.1-turbo',
      },
      enabled: process.env.OPENAI_ENABLED !== 'false' && !!process.env.OPENAI_API_KEY,
      priority: 3,
    },
  },

  // ... rest of the configuration remains the same ...
  fallback: {
    enabled: process.env.AI_FALLBACK_ENABLED !== 'false',
    retryAttempts: parseInt(process.env.AI_RETRY_ATTEMPTS || '3', 10),
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '30000', 10),
    costOptimization: process.env.AI_COST_OPTIMIZATION !== 'false',
    circuitBreaker: {
      enabled: process.env.AI_CIRCUIT_BREAKER_ENABLED !== 'false',
      failureThreshold: parseInt(process.env.AI_CIRCUIT_BREAKER_THRESHOLD || '5', 10),
      resetTimeMs: parseInt(process.env.AI_CIRCUIT_BREAKER_RESET_MS || '60000', 10),
    },
  },

  // ... rest remains unchanged ...
}));
```

**Step 3: Update .env.example**

```bash
# AI/ML API Keys
# CRITICAL: At least ONE provider key must be configured
# Generate API keys from respective provider dashboards

# Anthropic (Claude) - Recommended primary provider
# Get your key from: https://console.anthropic.com/
# Format: sk-ant-api03-XXXXXXXX
ANTHROPIC_API_KEY=

# Google AI (Gemini) - Optional secondary provider
# Get your key from: https://makersuite.google.com/app/apikey
GOOGLE_API_KEY=

# OpenAI (GPT) - Optional tertiary provider
# Get your key from: https://platform.openai.com/api-keys
# Format: sk-XXXXXXXX
OPENAI_API_KEY=
OPENAI_ORGANIZATION=  # Optional
```

#### Implementation Steps

1. **Create validator utility** - Add `api-key.validator.ts` file
2. **Update AI models config** - Replace with validated version
3. **Update .env.example** - Add detailed comments
4. **Test validation** - Run tests below
5. **Update documentation** - Document API key requirements

#### Testing Recommendations

```bash
# Test 1: No API keys configured
# Remove all AI API keys from .env
npm run start
# Expected: Clear error message listing which keys are missing

# Test 2: Invalid API key format (Anthropic)
export ANTHROPIC_API_KEY="invalid-key"
npm run start
# Expected: Error about invalid format

# Test 3: API key too short
export OPENAI_API_KEY="sk-short"
npm run start
# Expected: Error about key being too short

# Test 4: Valid configuration
export ANTHROPIC_API_KEY="sk-ant-api03-valid-key-here-xxxxx..."
npm run start
# Expected: Application starts with success message showing sanitized key
```

**Unit Tests:**

Create `/home/user/AiDeepRef/apps/api/src/common/validators/api-key.validator.spec.ts`:

```typescript
import { ApiKeyValidator } from './api-key.validator';

describe('ApiKeyValidator', () => {
  beforeEach(() => {
    // Clear environment
    delete process.env.TEST_API_KEY;
  });

  it('should throw error for missing required key', () => {
    expect(() => {
      ApiKeyValidator.validate([
        {
          name: 'Test',
          envVar: 'TEST_API_KEY',
          required: true,
        },
      ]);
    }).toThrow('API key validation failed');
  });

  it('should not throw for missing optional key', () => {
    expect(() => {
      ApiKeyValidator.validate([
        {
          name: 'Test',
          envVar: 'TEST_API_KEY',
          required: false,
        },
      ]);
    }).not.toThrow();
  });

  it('should validate key format', () => {
    process.env.TEST_API_KEY = 'invalid-format';

    expect(() => {
      ApiKeyValidator.validate([
        {
          name: 'Test',
          envVar: 'TEST_API_KEY',
          required: true,
          format: /^sk-[a-z]+$/,
        },
      ]);
    }).toThrow();
  });

  it('should validate key minimum length', () => {
    process.env.TEST_API_KEY = 'short';

    expect(() => {
      ApiKeyValidator.validate([
        {
          name: 'Test',
          envVar: 'TEST_API_KEY',
          required: true,
          minLength: 20,
        },
      ]);
    }).toThrow();
  });

  it('should pass with valid key', () => {
    process.env.TEST_API_KEY = 'sk-validkeywith20chars';

    expect(() => {
      ApiKeyValidator.validate([
        {
          name: 'Test',
          envVar: 'TEST_API_KEY',
          required: true,
          format: /^sk-[a-z]+$/,
          minLength: 20,
        },
      ]);
    }).not.toThrow();
  });

  it('should sanitize keys for logging', () => {
    const key = 'sk-ant-api03-very-long-secret-key-here-12345';
    const sanitized = (ApiKeyValidator as any).sanitizeKeyForLog(key);

    expect(sanitized).toBe('sk-a...2345');
    expect(sanitized).not.toContain('secret');
  });
});
```

#### Estimated Time to Fix
**3 hours** (including validator creation, tests, and integration)

---

## High Priority Issues

### Issue #4: CORS Allows Missing Origin Headers

**File:** `/home/user/AiDeepRef/apps/api/src/main.ts:74-76`

#### Current Code Analysis
```typescript
// Lines 73-89
app.enableCors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);  // ❌ Security issue

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
  exposedHeaders: ['X-CSRF-Token'],
});
```

**Problem:**
- Allows requests with no `Origin` header
- Bypasses CORS protection completely for such requests
- Mobile apps and Postman mentioned but authentication tokens would work for them anyway
- Opens door for CSRF attacks

#### Security Risk Explanation
- **Severity:** High (CVSS 7.5)
- **Impact:** CORS bypass, potential CSRF attacks
- **Attack Vector:**
  - Attacker can remove Origin header to bypass CORS
  - Server-to-server attacks bypass restrictions
  - curl/wget scripts can impersonate users
- **Data Exposure:** API can be called from any context without origin
- **OWASP Category:** A05:2021 - Security Misconfiguration
- **Real-world Impact:**
  - CSRF attacks from malicious servers
  - Data exfiltration via server-side scripts
  - API abuse from unauthorized contexts

#### Exact Code Changes

**BEFORE:**
```typescript
app.enableCors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
  exposedHeaders: ['X-CSRF-Token'],
});
```

**AFTER:**
```typescript
// Security: Configure CORS properly
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:4200', 'http://localhost:3000'];

// In production, never use wildcard or allow empty origins
const isDevelopment = process.env.NODE_ENV !== 'production';
const allowNullOrigin = process.env.CORS_ALLOW_NULL_ORIGIN === 'true' && isDevelopment;

logger.log(`🔒 CORS Configuration:`);
logger.log(`  - Allowed origins: ${allowedOrigins.join(', ')}`);
logger.log(`  - Allow null origin: ${allowNullOrigin ? 'Yes (DEV ONLY)' : 'No'}`);
logger.log(`  - Credentials: true`);

app.enableCors({
  origin: (origin, callback) => {
    // In development only, optionally allow requests with no origin
    // This is useful for:
    // - Mobile app development (React Native, etc.)
    // - API testing tools (Postman, Insomnia)
    // - Server-side requests
    // SECURITY: This should NEVER be enabled in production
    if (!origin) {
      if (allowNullOrigin) {
        logger.debug('⚠️  Allowing request with no origin (DEVELOPMENT MODE)');
        return callback(null, true);
      } else {
        logger.warn('❌ Blocked request with no origin header (production mode)');
        return callback(new Error('Origin header required'));
      }
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      logger.debug(`✅ CORS allowed for origin: ${origin}`);
      callback(null, true);
    } else {
      logger.warn(`❌ CORS blocked request from unauthorized origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
  exposedHeaders: ['X-CSRF-Token'],
  // Additional security headers
  maxAge: 600, // Cache preflight for 10 minutes
  preflightContinue: false,
  optionsSuccessStatus: 204,
});
```

**Update .env.example:**
```bash
# CORS Configuration
# Comma-separated list of allowed origins (no wildcards in production)
CORS_ORIGIN=http://localhost:4200,http://localhost:3000
CORS_CREDENTIALS=true

# SECURITY WARNING: Only enable in development for testing
# Should ALWAYS be false in production
CORS_ALLOW_NULL_ORIGIN=false
```

#### Implementation Steps

1. **Update CORS configuration** in main.ts (lines 68-89)
2. **Update .env** file:
   ```bash
   CORS_ORIGIN=http://localhost:4200,http://localhost:3000
   CORS_ALLOW_NULL_ORIGIN=false  # Set to true only in local dev
   ```
3. **Update .env.example** with security warnings
4. **Document mobile app authentication** - Mobile apps should use JWT tokens in Authorization header, which works fine with proper origin
5. **Test thoroughly** with different scenarios

#### Testing Recommendations

**Test Case 1: Request without Origin (Production)**
```bash
# Should be REJECTED
curl -X POST http://your-api.com/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}' \
  -v

# Expected: CORS error "Origin header required"
```

**Test Case 2: Request without Origin (Development with flag)**
```bash
# Set CORS_ALLOW_NULL_ORIGIN=true in dev .env
curl -X GET http://localhost:3000/api/v1/health

# Expected: 200 OK with warning in logs
```

**Test Case 3: Request from allowed origin**
```bash
curl -X GET http://localhost:3000/api/v1/health \
  -H "Origin: http://localhost:4200" \
  -v

# Expected: 200 OK with Access-Control-Allow-Origin header
```

**Test Case 4: Request from unauthorized origin**
```bash
curl -X GET http://localhost:3000/api/v1/health \
  -H "Origin: http://evil.com" \
  -v

# Expected: CORS error
```

**Test Case 5: Mobile app authentication (proper way)**
```typescript
// In React Native or mobile app
const response = await fetch('https://api.yourdomain.com/api/v1/auth/signin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // No Origin header - but request works because credentials are in body
  },
  body: JSON.stringify({ email, password }),
});

// Subsequent authenticated requests
const protectedResponse = await fetch('https://api.yourdomain.com/api/v1/users/me', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,  // JWT from login
    'Content-Type': 'application/json',
  },
});

// This works because:
// 1. JWT authentication doesn't rely on cookies
// 2. Authorization header is explicitly allowed
// 3. Initial auth (login) doesn't need origin for public endpoints
```

#### Alternative Solution for Mobile Apps

If you need to support mobile apps in production, use a dedicated authentication flow:

```typescript
// Add to .env
CORS_MOBILE_APP_IDENTIFIERS=com.deepref.mobile,io.deepref.app

// In main.ts CORS config
origin: (origin, callback) => {
  if (!origin) {
    // Check for mobile app identifier in User-Agent or custom header
    const userAgent = request.headers['user-agent'] || '';
    const appId = request.headers['x-app-identifier'] || '';

    const mobileIdentifiers = process.env.CORS_MOBILE_APP_IDENTIFIERS?.split(',') || [];
    const isMobileApp = mobileIdentifiers.some(id =>
      userAgent.includes(id) || appId === id
    );

    if (isMobileApp) {
      logger.debug('✅ Mobile app request (no origin)');
      return callback(null, true);
    }

    logger.warn('❌ Blocked request with no origin header');
    return callback(new Error('Origin header required'));
  }

  // ... rest of origin validation
},
```

#### Estimated Time to Fix
**1.5 hours** (including testing different scenarios)

---

### Issue #5: Email Templates Not Escaped (HTML Injection Risk)

**File:** `/home/user/AiDeepRef/apps/api/src/common/services/email.service.ts`

#### Current Code Analysis

Multiple template methods directly interpolate variables without escaping:

```typescript
// Line 117 - Verification code (not escaped)
<div class="code-box">${code}</div>

// Line 152 - Magic link (not escaped)
<a href="${magicLink}" class="button">Sign In to DeepRef</a>

// Line 155 - Magic link in text (not escaped)
<p style="word-break: break-all; color: #667eea;">${magicLink}</p>

// Line 190 - Reset link (not escaped)
<a href="${resetLink}" class="button">Reset Password</a>

// Line 236 - User-controlled reason field (CRITICAL - not escaped)
${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
```

**Problem:**
- Template literals directly embed user input into HTML
- No HTML escaping/sanitization
- Particularly dangerous in `reason` parameter which could come from external validation services
- XSS attacks via email could trick users into clicking malicious links

#### Security Risk Explanation
- **Severity:** High (CVSS 7.1)
- **Impact:** HTML injection, email-based XSS, phishing
- **Attack Vector:**
  - Attacker provides malicious HTML in email address or verification codes
  - KYC rejection reason could contain `<script>` tags or malicious links
  - Magic links could be manipulated to appear legitimate while redirecting elsewhere
- **Data Exposure:** User credentials, session tokens via phishing
- **OWASP Category:** A03:2021 - Injection
- **Real-world Impact:**
  - Phishing emails that appear to come from legitimate system
  - Session hijacking via malicious links in emails
  - Brand reputation damage

**Example Attack:**
```typescript
// Attacker triggers KYC failure with malicious reason
const reason = 'Verification failed. <a href="http://evil.com/fake-login">Click here</a> to resubmit';

// Email sent contains:
<p><strong>Reason:</strong> Verification failed. <a href="http://evil.com/fake-login">Click here</a> to resubmit</p>

// User clicks the link thinking it's legitimate
```

#### Exact Code Changes

**Step 1: Create HTML Escaping Utility**

Create: `/home/user/AiDeepRef/apps/api/src/common/utils/html-escape.util.ts`

```typescript
/**
 * HTML Escaping Utility for Email Templates
 * Prevents XSS attacks in email content
 */

export class HtmlEscape {
  /**
   * Escapes HTML special characters to prevent XSS
   */
  static escape(unsafe: string | undefined | null): string {
    if (!unsafe) return '';

    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Escapes HTML and also converts newlines to <br> tags
   */
  static escapeWithBreaks(unsafe: string | undefined | null): string {
    return this.escape(unsafe).replace(/\n/g, '<br>');
  }

  /**
   * Validates and sanitizes URLs for use in href attributes
   * Only allows http://, https://, and mailto: protocols
   */
  static sanitizeUrl(url: string | undefined | null): string {
    if (!url) return '#';

    const urlStr = String(url).trim();

    // Check for valid protocols
    const validProtocols = /^(https?:\/\/|mailto:)/i;
    if (!validProtocols.test(urlStr)) {
      // If no protocol or invalid protocol, return safe default
      return '#';
    }

    // Check for javascript: or data: protocols (XSS vectors)
    const dangerousProtocols = /^(javascript|data|vbscript):/i;
    if (dangerousProtocols.test(urlStr)) {
      return '#';
    }

    // HTML encode the URL to prevent attribute injection
    return this.escape(urlStr);
  }

  /**
   * Validates that a string contains only alphanumeric characters
   * Useful for verification codes
   */
  static isAlphanumeric(str: string): boolean {
    return /^[a-zA-Z0-9]+$/.test(str);
  }

  /**
   * Sanitizes verification code - only allows alphanumeric
   */
  static sanitizeCode(code: string | undefined | null): string {
    if (!code) return '';

    const codeStr = String(code);

    // Only allow alphanumeric characters
    if (!this.isAlphanumeric(codeStr)) {
      throw new Error('Verification code must be alphanumeric');
    }

    return this.escape(codeStr);
  }
}
```

**Step 2: Update Email Service**

Replace `/home/user/AiDeepRef/apps/api/src/common/services/email.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HtmlEscape } from '../utils/html-escape.util';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly emailEnabled: boolean;

  constructor(private configService: ConfigService) {
    this.emailEnabled = this.configService.get('EMAIL_SERVICE', 'stub') !== 'stub';
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.emailEnabled) {
      this.logger.log(`📧 [STUB] Email would be sent to: ${options.to}`);
      this.logger.log(`📧 [STUB] Subject: ${options.subject}`);
      this.logger.log(`📧 [STUB] Content: ${options.text || options.html.substring(0, 100)}...`);
      return true;
    }

    // TODO: Implement actual email sending (SendGrid, AWS SES, etc.)
    this.logger.warn('Email service not configured. Email not sent.');
    return false;
  }

  async sendVerificationEmail(email: string, code: string): Promise<boolean> {
    const subject = 'Verify Your Email - DeepRef';

    // Sanitize verification code (should be alphanumeric only)
    const sanitizedCode = HtmlEscape.sanitizeCode(code);

    const html = this.generateVerificationEmailTemplate(sanitizedCode);
    const text = `Your verification code is: ${sanitizedCode}. This code will expire in 24 hours.`;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  async sendMagicLinkEmail(email: string, magicLink: string): Promise<boolean> {
    const subject = 'Your Magic Link - DeepRef';

    // Validate and sanitize the magic link URL
    const sanitizedLink = HtmlEscape.sanitizeUrl(magicLink);

    // Additional validation: ensure link is from our domain
    const appUrl = this.configService.get('APP_URL', 'http://localhost:3000');
    if (!magicLink.startsWith(appUrl)) {
      this.logger.error(`Invalid magic link domain: ${magicLink}`);
      throw new Error('Invalid magic link');
    }

    const html = this.generateMagicLinkTemplate(sanitizedLink);
    const text = `Click this link to sign in: ${sanitizedLink}. This link will expire in 15 minutes.`;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  async sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
    const subject = 'Reset Your Password - DeepRef';

    // Validate and sanitize the reset link URL
    const sanitizedLink = HtmlEscape.sanitizeUrl(resetLink);

    // Additional validation: ensure link is from our domain
    const appUrl = this.configService.get('APP_URL', 'http://localhost:3000');
    if (!resetLink.startsWith(appUrl)) {
      this.logger.error(`Invalid reset link domain: ${resetLink}`);
      throw new Error('Invalid reset link');
    }

    const html = this.generatePasswordResetTemplate(sanitizedLink);
    const text = `Click this link to reset your password: ${sanitizedLink}. This link will expire in 1 hour.`;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  async sendKycStatusEmail(
    email: string,
    status: 'verified' | 'failed',
    reason?: string,
  ): Promise<boolean> {
    const subject =
      status === 'verified'
        ? 'KYC Verification Complete - DeepRef'
        : 'KYC Verification Failed - DeepRef';

    // CRITICAL: Escape the reason to prevent HTML injection
    const sanitizedReason = reason ? HtmlEscape.escapeWithBreaks(reason) : undefined;

    const html = this.generateKycStatusTemplate(status, sanitizedReason);
    const text =
      status === 'verified'
        ? 'Your KYC verification has been completed successfully!'
        : `Your KYC verification failed. ${reason || 'Please try again.'}`;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  /**
   * Send security alert email
   * NOTE: This method was referenced in auth.service.ts but was missing
   */
  async sendSecurityAlert(email: string, alertMessage: string): Promise<boolean> {
    const subject = '🔒 Security Alert - DeepRef';

    // Escape alert message
    const sanitizedMessage = HtmlEscape.escapeWithBreaks(alertMessage);

    const html = this.generateSecurityAlertTemplate(sanitizedMessage);
    const text = `Security Alert: ${alertMessage}`;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  private generateVerificationEmailTemplate(code: string): string {
    // Code is already sanitized by sanitizeCode()
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; }
            .code-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verify Your Email</h1>
            </div>
            <div class="content">
              <p>Welcome to DeepRef!</p>
              <p>Please use the following code to verify your email address:</p>
              <div class="code-box">${code}</div>
              <p>This code will expire in 24 hours.</p>
              <p>If you didn't create an account with DeepRef, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 DeepRef. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateMagicLinkTemplate(magicLink: string): string {
    // Link is already sanitized by sanitizeUrl()
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Magic Link</h1>
            </div>
            <div class="content">
              <p>Click the button below to sign in to your DeepRef account:</p>
              <div style="text-align: center;">
                <a href="${magicLink}" class="button">Sign In to DeepRef</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${magicLink}</p>
              <p><strong>This link will expire in 15 minutes.</strong></p>
              <p>If you didn't request this link, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 DeepRef. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generatePasswordResetTemplate(resetLink: string): string {
    // Link is already sanitized
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reset Your Password</h1>
            </div>
            <div class="content">
              <p>We received a request to reset your password.</p>
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Password</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${resetLink}</p>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 DeepRef. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateKycStatusTemplate(status: 'verified' | 'failed', reason?: string): string {
    const isVerified = status === 'verified';
    // Reason is already escaped with HtmlEscape.escapeWithBreaks()
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${isVerified ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' : 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)'}; color: white; padding: 30px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; }
            .status-icon { font-size: 64px; text-align: center; margin: 20px 0; }
            .reason-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>KYC Verification ${isVerified ? 'Complete' : 'Failed'}</h1>
            </div>
            <div class="content">
              <div class="status-icon">${isVerified ? '✅' : '❌'}</div>
              ${
                isVerified
                  ? `
                <p>Congratulations! Your identity verification has been completed successfully.</p>
                <p>You can now access all features of your DeepRef account.</p>
              `
                  : `
                <p>Unfortunately, we were unable to verify your identity.</p>
                ${reason ? `<div class="reason-box"><strong>Reason:</strong><br>${reason}</div>` : ''}
                <p>Please try submitting your documents again or contact support for assistance.</p>
              `
              }
            </div>
            <div class="footer">
              <p>&copy; 2025 DeepRef. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateSecurityAlertTemplate(alertMessage: string): string {
    // Message is already escaped
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ee0979 0%, #ff6a00 100%); color: white; padding: 30px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; }
            .alert-box { background: #fff3cd; border-left: 4px solid #ff0000; padding: 15px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Security Alert</h1>
            </div>
            <div class="content">
              <div class="alert-box">
                ${alertMessage}
              </div>
              <p>If you didn't perform this action, please contact support immediately.</p>
              <p><strong>Never share your password or verification codes with anyone.</strong></p>
            </div>
            <div class="footer">
              <p>&copy; 2025 DeepRef. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
```

#### Implementation Steps

1. **Create HtmlEscape utility** - Add the file
2. **Update EmailService** - Replace with sanitized version
3. **Add unit tests** for HtmlEscape utility
4. **Test with malicious inputs** - Verify escaping works
5. **Review all email templates** - Ensure all variables are escaped

#### Testing Recommendations

Create `/home/user/AiDeepRef/apps/api/src/common/utils/html-escape.util.spec.ts`:

```typescript
import { HtmlEscape } from './html-escape.util';

describe('HtmlEscape', () => {
  describe('escape', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("XSS")</script>';
      const output = HtmlEscape.escape(input);
      expect(output).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
      expect(output).not.toContain('<script>');
    });

    it('should escape ampersands', () => {
      expect(HtmlEscape.escape('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should handle null and undefined', () => {
      expect(HtmlEscape.escape(null)).toBe('');
      expect(HtmlEscape.escape(undefined)).toBe('');
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow valid https URLs', () => {
      const url = 'https://example.com/reset?token=abc123';
      expect(HtmlEscape.sanitizeUrl(url)).toContain('https');
    });

    it('should block javascript: protocol', () => {
      const url = 'javascript:alert("XSS")';
      expect(HtmlEscape.sanitizeUrl(url)).toBe('#');
    });

    it('should block data: protocol', () => {
      const url = 'data:text/html,<script>alert("XSS")</script>';
      expect(HtmlEscape.sanitizeUrl(url)).toBe('#');
    });

    it('should handle malformed URLs', () => {
      expect(HtmlEscape.sanitizeUrl('not-a-url')).toBe('#');
    });
  });

  describe('sanitizeCode', () => {
    it('should allow alphanumeric codes', () => {
      expect(HtmlEscape.sanitizeCode('ABC123')).toBe('ABC123');
    });

    it('should throw on non-alphanumeric', () => {
      expect(() => HtmlEscape.sanitizeCode('<script>')).toThrow();
    });
  });
});
```

**Integration Test:**

```typescript
// Test malicious KYC reason
await emailService.sendKycStatusEmail(
  'user@example.com',
  'failed',
  'Verification failed. <a href="http://evil.com">Click here</a> to fix it'
);

// Check email output - should contain escaped HTML
// <p><strong>Reason:</strong> Verification failed. &lt;a href=&quot;http://evil.com&quot;&gt;Click here&lt;/a&gt; to fix it</p>
```

#### Estimated Time to Fix
**2.5 hours** (including utility creation and comprehensive testing)

---

### Issue #6: CSRF Cookie Readable by JavaScript

**File:** `/home/user/AiDeepRef/apps/api/src/common/guards/csrf.guard.ts:64`

#### Current Code Analysis
```typescript
// Line 62-68
response.cookie(this.CSRF_COOKIE, token, {
  httpOnly: false,  // ❌ JavaScript can read this cookie
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 3600000, // 1 hour
});
```

**Problem:**
- CSRF cookie is readable by JavaScript (`httpOnly: false`)
- Comment says "so JavaScript can read it" - this is intentional but insecure
- Opens door for XSS attacks to steal CSRF tokens
- Defeats the purpose of CSRF protection

#### Security Risk Explanation
- **Severity:** High (CVSS 7.3)
- **Impact:** XSS can steal CSRF tokens, bypassing CSRF protection
- **Attack Vector:**
  - XSS vulnerability elsewhere in app
  - Malicious browser extension
  - Third-party JavaScript compromise
  - Token can be exfiltrated and used for CSRF attacks
- **Data Exposure:** CSRF tokens leaked via XSS
- **OWASP Category:** A03:2021 - Injection (XSS), A01:2021 - Broken Access Control
- **Real-world Impact:**
  - Attacker combines XSS + CSRF to perform actions as victim
  - Token theft enables automated attacks
  - Defeats defense-in-depth

#### Exact Code Changes

The issue is that the implementation uses a "double-submit cookie" pattern incorrectly. The correct approach is to use a header-only approach or encrypted double-submit.

**BEFORE:**
```typescript
private generateCsrfToken(request: any, response: any): void {
  let token = request.session?.csrfToken;

  if (!token) {
    token = crypto.randomBytes(32).toString('hex');

    if (request.session) {
      request.session.csrfToken = token;
    }

    // Set cookie (httpOnly: false so JavaScript can read it)
    response.cookie(this.CSRF_COOKIE, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000,
    });

    response.setHeader('X-CSRF-Token', token);
    this.logger.debug(`Generated new CSRF token for ${request.ip}`);
  }

  request.csrfToken = token;
}
```

**AFTER (Secure Implementation):**

```typescript
import * as crypto from 'crypto';

private generateCsrfToken(request: any, response: any): void {
  // Use session-based CSRF token (most secure)
  let token = request.session?.csrfToken;

  if (!token) {
    // Generate cryptographically secure token
    token = crypto.randomBytes(32).toString('hex');

    // Store ONLY in session (server-side)
    if (request.session) {
      request.session.csrfToken = token;
    } else {
      this.logger.error('Session not available for CSRF token storage');
      throw new Error('Session required for CSRF protection');
    }

    // SECURITY: Send token via header only (not cookie)
    // Frontend will read from header and send back in subsequent requests
    response.setHeader('X-CSRF-Token', token);

    this.logger.debug(`Generated new CSRF token for ${request.ip}`);
  } else {
    // Token exists in session, expose via header
    response.setHeader('X-CSRF-Token', token);
  }

  // Make token available to request context
  request.csrfToken = token;
}

private validateCsrfToken(request: any): boolean {
  // Get token from header (primary method for SPAs)
  const headerToken = request.headers[this.CSRF_HEADER] || request.headers['x-xsrf-token'];

  // Get token from body (for form submissions)
  const bodyToken = request.body?._csrf || request.body?.csrfToken;

  // Get session token (source of truth)
  const sessionToken = request.session?.csrfToken;

  if (!sessionToken) {
    this.logger.error(`No CSRF token in session for ${request.method} ${request.url} from ${request.ip}`);
    throw new ForbiddenException('CSRF token not initialized');
  }

  // Determine which token to validate
  const providedToken = headerToken || bodyToken;

  if (!providedToken) {
    this.logger.warn(`CSRF token missing for ${request.method} ${request.url} from ${request.ip}`);
    throw new ForbiddenException('CSRF token missing');
  }

  // Validate against session token using constant-time comparison
  const isValid = crypto.timingSafeEqual(
    Buffer.from(sessionToken),
    Buffer.from(providedToken)
  );

  if (!isValid) {
    this.logger.error(`Invalid CSRF token for ${request.method} ${request.url} from ${request.ip}`);

    if (request.user) {
      this.logger.error(`Potential CSRF attack against user ${request.user.email} from IP ${request.ip}`);
    }

    throw new ForbiddenException('Invalid CSRF token');
  }

  this.logger.debug(`CSRF token validated for ${request.method} ${request.url}`);
  return true;
}
```

**Update Frontend to Read from Header:**

Frontend code needs to be updated to read CSRF token from response header instead of cookie:

```typescript
// Frontend: apps/web/src/app/core/interceptors/csrf.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class CsrfInterceptor implements HttpInterceptor {
  private csrfToken: string | null = null;

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Add CSRF token to state-changing requests
    if (!this.isSafeMethod(req.method) && this.csrfToken) {
      req = req.clone({
        setHeaders: {
          'X-CSRF-Token': this.csrfToken
        }
      });
    }

    // Capture CSRF token from response headers
    return next.handle(req).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          const token = event.headers.get('X-CSRF-Token');
          if (token) {
            this.csrfToken = token;
            // Optionally store in sessionStorage for persistence
            sessionStorage.setItem('csrf-token', token);
          }
        }
      })
    );
  }

  private isSafeMethod(method: string): boolean {
    return ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
  }
}
```

#### Implementation Steps

1. **Update CSRF Guard** - Remove cookie, use header-only
2. **Update session configuration** - Ensure sessions are working
3. **Create/update frontend CSRF interceptor** - Read token from header
4. **Test CSRF protection** - Verify it works with new approach
5. **Update documentation** - Document the token flow

#### Testing Recommendations

**Test Case 1: GET request receives CSRF token**
```bash
curl -X GET http://localhost:3000/api/v1/auth/test \
  -c cookies.txt \
  -v

# Expected: Response includes X-CSRF-Token header
# Expected: No csrf-token cookie in Set-Cookie headers
```

**Test Case 2: POST without token fails**
```bash
curl -X POST http://localhost:3000/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' \
  -b cookies.txt

# Expected: 403 Forbidden - CSRF token missing
```

**Test Case 3: POST with valid token succeeds**
```bash
# First, get token from GET request
TOKEN=$(curl -X GET http://localhost:3000/api/v1/health -c cookies.txt -v 2>&1 | grep -i "x-csrf-token" | cut -d' ' -f3)

# Then use it in POST
curl -X POST http://localhost:3000/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{"email":"test@test.com","password":"test"}' \
  -b cookies.txt

# Expected: Request succeeds (or fails auth, but not CSRF)
```

**Test Case 4: Verify cookie is NOT set**
```bash
curl -X GET http://localhost:3000/api/v1/health -v 2>&1 | grep -i "set-cookie"

# Expected: No csrf-token cookie in output
```

**Test Case 5: Frontend integration test**
```typescript
// In Angular/React app
describe('CSRF Protection', () => {
  it('should retrieve CSRF token from header on first request', async () => {
    const response = await http.get('/api/v1/health');
    const csrfToken = response.headers.get('x-csrf-token');
    expect(csrfToken).toBeTruthy();
  });

  it('should include CSRF token in POST requests', async () => {
    // First GET to retrieve token
    await http.get('/api/v1/health');

    // Then POST should include token automatically via interceptor
    const response = await http.post('/api/v1/data', { test: 'data' });
    expect(response.status).toBe(200);
  });

  it('should fail POST without CSRF token', async () => {
    // Clear interceptor token
    clearCsrfToken();

    try {
      await http.post('/api/v1/data', { test: 'data' });
      fail('Should have thrown');
    } catch (error) {
      expect(error.status).toBe(403);
      expect(error.message).toContain('CSRF');
    }
  });
});
```

#### Alternative: Encrypted Double-Submit Pattern (More Complex)

If you need to support scenarios without sessions:

```typescript
// Generate token pair
const tokenValue = crypto.randomBytes(32).toString('hex');
const tokenSecret = crypto.randomBytes(32).toString('hex');

// Store secret in httpOnly cookie
response.cookie('csrf-secret', tokenSecret, {
  httpOnly: true,  // ✅ JavaScript cannot read
  secure: true,
  sameSite: 'strict',
});

// Send value in header (JavaScript reads this)
response.setHeader('X-CSRF-Token', tokenValue);

// On validation: decrypt and compare
// This is more complex and requires encryption/decryption logic
```

#### Estimated Time to Fix
**2 hours** (including frontend interceptor updates and testing)

---

### Issue #7: Magic Link Tokens Stored in Plaintext

**Files:**
- `/home/user/AiDeepRef/apps/api/src/database/entities/user.entity.ts:63`
- `/home/user/AiDeepRef/apps/api/src/auth/auth.service.ts:210`

#### Current Code Analysis

**Entity (user.entity.ts):**
```typescript
// Line 62-66
@Column({ nullable: true })
magicLinkToken: string | null;  // ❌ Stored in plaintext

@Column({ nullable: true })
magicLinkExpiry: Date | null;
```

**Service (auth.service.ts):**
```typescript
// Line 204-212
const token = crypto.randomBytes(32).toString('hex');  // ❌ Plaintext token
const expiry = new Date();
expiry.setMinutes(expiry.getMinutes() + 15);

// Save token to user
user.magicLinkToken = token;  // ❌ Stored directly
user.magicLinkExpiry = expiry;
await this.userRepository.save(user);
```

**Verification:**
```typescript
// Line 224-227
const user = await this.userRepository.findOne({
  where: { magicLinkToken: token },  // ❌ Query by plaintext
});
```

**Problem:**
- Magic link tokens stored in plaintext in database
- If database is compromised, attacker gets all active magic links
- Can impersonate any user who requested a magic link
- Tokens are long-lived (15 minutes)

#### Security Risk Explanation
- **Severity:** High (CVSS 8.1)
- **Impact:** Account takeover, authentication bypass
- **Attack Vector:**
  - Database breach exposes all active magic link tokens
  - SQL injection could leak tokens
  - Database backup compromise
  - Insider threat
- **Data Exposure:** Active authentication tokens for all users
- **OWASP Category:** A02:2021 - Cryptographic Failures
- **Real-world Impact:**
  - Mass account takeover during breach
  - No way to invalidate compromised tokens (except wait for expiry)
  - Attacker can authenticate as any user

**Similar to:** Storing passwords in plaintext - just as dangerous!

#### Exact Code Changes

**Solution:** Hash tokens before storing (like passwords), verify by hashing and comparing.

**Step 1: Update User Entity**

File: `/home/user/AiDeepRef/apps/api/src/database/entities/user.entity.ts`

```typescript
// Line 62-66 - BEFORE
@Column({ nullable: true })
magicLinkToken: string | null;

@Column({ nullable: true })
magicLinkExpiry: Date | null;

// AFTER
@Column({ nullable: true })
magicLinkTokenHash: string | null;  // ✅ Store hash, not plaintext

@Column({ nullable: true })
magicLinkExpiry: Date | null;

// Also update email verification to use hashes
@Column({ nullable: true })
emailVerificationCodeHash: string | null;  // ✅ Changed from plaintext

@Column({ nullable: true })
emailVerificationExpiry: Date | null;
```

**Step 2: Create Database Migration**

Create: `/home/user/AiDeepRef/apps/api/src/database/migrations/XXXXXX-hash-magic-link-tokens.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class HashMagicLinkTokens1732108800000 implements MigrationInterface {
  name = 'HashMagicLinkTokens1732108800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename columns to reflect they now store hashes
    await queryRunner.renameColumn('users', 'magicLinkToken', 'magicLinkTokenHash');
    await queryRunner.renameColumn('users', 'emailVerificationCode', 'emailVerificationCodeHash');

    // Clear existing tokens (they're plaintext, can't be migrated)
    await queryRunner.query(`
      UPDATE users
      SET magicLinkTokenHash = NULL,
          magicLinkExpiry = NULL,
          emailVerificationCodeHash = NULL,
          emailVerificationExpiry = NULL
      WHERE magicLinkTokenHash IS NOT NULL
         OR emailVerificationCodeHash IS NOT NULL
    `);

    // Add comment explaining the column stores hashed values
    await queryRunner.query(`
      COMMENT ON COLUMN users.magicLinkTokenHash IS 'Bcrypt hash of magic link token (never store plaintext)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN users.emailVerificationCodeHash IS 'Bcrypt hash of email verification code (never store plaintext)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.renameColumn('users', 'magicLinkTokenHash', 'magicLinkToken');
    await queryRunner.renameColumn('users', 'emailVerificationCodeHash', 'emailVerificationCode');
  }
}
```

**Step 3: Update Auth Service**

File: `/home/user/AiDeepRef/apps/api/src/auth/auth.service.ts`

```typescript
// Update requestMagicLink method
async requestMagicLink(magicLinkDto: MagicLinkDto) {
  const { email } = magicLinkDto;

  const user = await this.userRepository.findOne({ where: { email } });
  if (!user) {
    // Don't reveal if user exists or not for security
    return { success: true, message: 'If an account exists, a magic link has been sent.' };
  }

  // Generate magic link token (this will be sent in email)
  // SECURITY: Generate a URL-safe token with high entropy
  const token = crypto.randomBytes(32).toString('base64url');  // ✅ URL-safe format
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 15); // 15 minutes expiry

  // SECURITY: Hash the token before storing (like password)
  // Use bcrypt with lower rounds (8) since tokens are already random
  const tokenHash = await bcrypt.hash(token, 8);  // ✅ Store hash only

  // Save hashed token to user
  user.magicLinkTokenHash = tokenHash;  // ✅ Never store plaintext
  user.magicLinkExpiry = expiry;
  await this.userRepository.save(user);

  // Generate magic link URL with plaintext token (sent via email)
  const baseUrl = this.configService.get('APP_URL', 'http://localhost:3000');
  const magicLink = `${baseUrl}/api/v1/auth/magic-link/verify/${token}`;

  // Send email with plaintext token in URL
  await this.emailService.sendMagicLinkEmail(email, magicLink);

  this.logger.log(`Magic link generated for user ${email}`);

  return { success: true, message: 'If an account exists, a magic link has been sent.' };
}

// Update verifyMagicLink method
async verifyMagicLink(token: string) {
  // SECURITY: We can't query by hash, need to check all non-expired tokens
  // Optimization: Only get users with non-expired magic links
  const now = new Date();
  const usersWithActiveTokens = await this.userRepository
    .createQueryBuilder('user')
    .where('user.magicLinkTokenHash IS NOT NULL')
    .andWhere('user.magicLinkExpiry > :now', { now })
    .getMany();

  if (!usersWithActiveTokens || usersWithActiveTokens.length === 0) {
    // No active tokens - don't reveal why validation failed
    throw new UnauthorizedException('Invalid or expired magic link');
  }

  // Find user by comparing hashed token
  // SECURITY: Use constant-time comparison via bcrypt
  let validUser: User | null = null;

  for (const user of usersWithActiveTokens) {
    if (user.magicLinkTokenHash) {
      const isValid = await bcrypt.compare(token, user.magicLinkTokenHash);
      if (isValid) {
        validUser = user;
        break;  // Found matching user
      }
    }
  }

  if (!validUser || !validUser.magicLinkExpiry || validUser.magicLinkExpiry < new Date()) {
    // Token doesn't match any user or is expired
    throw new UnauthorizedException('Invalid or expired magic link');
  }

  // Clear magic link token (one-time use)
  validUser.magicLinkTokenHash = null;
  validUser.magicLinkExpiry = null;
  validUser.lastLoginAt = new Date();
  validUser.emailVerified = true; // Auto-verify email if they can access their email
  await this.userRepository.save(validUser);

  this.logger.log(`Successful magic link authentication for user ${validUser.email}`);

  // Generate JWT token
  const jwtToken = this.generateToken(validUser);

  return {
    userId: validUser.id,
    token: jwtToken,
    role: validUser.role,
    email: validUser.email,
  };
}

// Update signup method for email verification
async signup(signupDto: SignupDto) {
  const { email, password, firstName, lastName, role } = signupDto;

  // Check if user exists
  const existingUser = await this.userRepository.findOne({ where: { email } });
  if (existingUser) {
    throw new ConflictException('User with this email already exists');
  }

  // Validate password complexity
  await this.validatePassword(password);

  // Hash password with stronger salt rounds
  const hashedPassword = await bcrypt.hash(password, 12);

  // Generate verification code (6-digit)
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const verificationExpiry = new Date();
  verificationExpiry.setHours(verificationExpiry.getHours() + 24);

  // SECURITY: Hash verification code before storing
  const verificationCodeHash = await bcrypt.hash(verificationCode, 8);  // ✅

  // Create user
  const user = this.userRepository.create({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    role,
    emailVerificationCodeHash: verificationCodeHash,  // ✅ Store hash
    emailVerificationExpiry: verificationExpiry,
  });

  const savedUser = await this.userRepository.save(user);

  // Generate JWT tokens
  const accessToken = this.generateToken(savedUser);
  const refreshToken = this.generateRefreshToken(savedUser);

  // Send verification email with plaintext code
  await this.emailService.sendVerificationEmail(savedUser.email, verificationCode);

  return {
    userId: savedUser.id,
    email: savedUser.email,
    accessToken,
    refreshToken,
    emailVerified: savedUser.emailVerified,
    role: savedUser.role,
  };
}

// Update verifyEmail method
async verifyEmail(verifyEmailDto: VerifyEmailDto) {
  const { email, code } = verifyEmailDto;

  const user = await this.userRepository.findOne({ where: { email } });
  if (!user) {
    throw new UnauthorizedException('User not found');
  }

  if (user.emailVerified) {
    return { verified: true };
  }

  // Check expiry first
  if (!user.emailVerificationExpiry || user.emailVerificationExpiry < new Date()) {
    throw new UnauthorizedException('Verification code expired');
  }

  // SECURITY: Verify code by comparing hash
  if (!user.emailVerificationCodeHash) {
    throw new UnauthorizedException('No verification code on file');
  }

  const isCodeValid = await bcrypt.compare(code, user.emailVerificationCodeHash);

  if (!isCodeValid) {
    throw new UnauthorizedException('Invalid verification code');
  }

  // Code is valid - verify email
  user.emailVerified = true;
  user.emailVerificationCodeHash = null;  // ✅ Clear hash
  user.emailVerificationExpiry = null;
  await this.userRepository.save(user);

  this.logger.log(`Email verified for user ${email}`);

  return { verified: true };
}
```

#### Implementation Steps

1. **Create database migration** - Rename columns, clear existing tokens
2. **Run migration** - `npm run migration:run`
3. **Update User entity** - Change column names
4. **Update AuthService** - Implement hashing logic
5. **Test magic link flow** - Verify end-to-end
6. **Test email verification flow** - Verify end-to-end
7. **Update API documentation** - Note that tokens are one-time use

#### Testing Recommendations

**Test Case 1: Magic link generation and verification**
```typescript
describe('Magic Link Security', () => {
  it('should hash magic link token before storage', async () => {
    const email = 'test@example.com';
    await authService.requestMagicLink({ email });

    // Check database - token should be hashed
    const user = await userRepository.findOne({ where: { email } });
    expect(user.magicLinkTokenHash).toBeTruthy();
    expect(user.magicLinkTokenHash).toMatch(/^\$2[aby]\$/);  // Bcrypt format
    expect(user.magicLinkTokenHash.length).toBeGreaterThan(40);
  });

  it('should verify magic link with correct token', async () => {
    const email = 'test@example.com';
    const result = await authService.requestMagicLink({ email });

    // Extract token from email (in real scenario, from email content)
    const magicLink = 'captured_from_email';  // Mock
    const token = magicLink.split('/').pop();

    // Verify should succeed
    const authResult = await authService.verifyMagicLink(token);
    expect(authResult.userId).toBeTruthy();
    expect(authResult.token).toBeTruthy();
  });

  it('should reject invalid magic link token', async () => {
    const email = 'test@example.com';
    await authService.requestMagicLink({ email });

    // Try with wrong token
    await expect(
      authService.verifyMagicLink('invalid-token')
    ).rejects.toThrow('Invalid or expired magic link');
  });

  it('should clear token after successful use (one-time use)', async () => {
    const email = 'test@example.com';
    const result = await authService.requestMagicLink({ email });
    const token = 'captured_from_email';

    // First use - should work
    await authService.verifyMagicLink(token);

    // Second use - should fail
    await expect(
      authService.verifyMagicLink(token)
    ).rejects.toThrow('Invalid or expired magic link');

    // Verify token is cleared from database
    const user = await userRepository.findOne({ where: { email } });
    expect(user.magicLinkTokenHash).toBeNull();
  });

  it('should reject expired magic link', async () => {
    const email = 'test@example.com';
    await authService.requestMagicLink({ email });
    const token = 'captured_from_email';

    // Fast-forward time by 16 minutes
    jest.useFakeTimers();
    jest.advanceTimersByTime(16 * 60 * 1000);

    await expect(
      authService.verifyMagicLink(token)
    ).rejects.toThrow('Invalid or expired magic link');

    jest.useRealTimers();
  });
});
```

**Test Case 2: Performance consideration**

The new approach requires iterating through users with active tokens. For large user bases, add index:

```typescript
// In user.entity.ts
@Index(['magicLinkExpiry'])  // ✅ Speed up queries
@Column({ nullable: true })
magicLinkExpiry: Date | null;
```

**Test Case 3: Email verification**
```typescript
describe('Email Verification Security', () => {
  it('should hash verification code before storage', async () => {
    const result = await authService.signup({
      email: 'test@example.com',
      password: 'SecurePass123!',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.SEEKER,
    });

    const user = await userRepository.findOne({
      where: { email: 'test@example.com' }
    });

    expect(user.emailVerificationCodeHash).toBeTruthy();
    expect(user.emailVerificationCodeHash).toMatch(/^\$2[aby]\$/);
  });

  it('should verify email with correct code', async () => {
    // Signup user
    await authService.signup({...});
    const code = 'captured_from_email';  // 6-digit code

    // Verify should succeed
    const result = await authService.verifyEmail({
      email: 'test@example.com',
      code,
    });

    expect(result.verified).toBe(true);
  });
});
```

#### Performance Optimization

For high-traffic applications, consider caching active token hashes in Redis:

```typescript
// When generating magic link
await redis.setex(`magic:${hashedToken}`, 900, userId);  // 15 min TTL

// When verifying
const userId = await redis.get(`magic:${hash(token)}`);
if (userId) {
  // Fast path - token found in cache
  const user = await userRepository.findOne({ where: { id: userId } });
  // ... verify and authenticate
}
```

#### Estimated Time to Fix
**3 hours** (including migration, testing, and performance considerations)

---

## Bonus Issue

### Issue #8: Missing sendSecurityAlert Method

**File:** `/home/user/AiDeepRef/apps/api/src/auth/auth.service.ts:357`

#### Current Code Analysis
```typescript
// Line 357
await this.emailService.sendSecurityAlert(user.email, 'Account locked due to multiple failed login attempts');
```

**Problem:** Method is called but doesn't exist in EmailService

#### Fix
Already included in Issue #5 solution above. The `sendSecurityAlert` method was added to EmailService.

---

## Overall Security Timeline

### Priority Order (by risk and dependencies)

| Priority | Issue | Time | Can Start | Blocker |
|----------|-------|------|-----------|---------|
| 1 | Issue #2: Session Secret | 1.5h | Immediate | None |
| 2 | Issue #1: Sentry Handler | 2h | Immediate | None |
| 3 | Issue #3: API Key Validation | 3h | Immediate | None |
| 4 | Issue #7: Magic Link Hashing | 3h | After #2 | Needs session |
| 5 | Issue #6: CSRF Cookie | 2h | After #2 | Needs session |
| 6 | Issue #5: Email Escaping | 2.5h | After #7 | None |
| 7 | Issue #4: CORS | 1.5h | Immediate | None |

**Total Time:** 15.5 hours

### Recommended Schedule

**Day 1 (6-8 hours):**
- ✅ Issue #2: Session Secret (1.5h) - CRITICAL, blocks others
- ✅ Issue #1: Sentry Handler (2h) - Independent
- ✅ Issue #3: API Key Validation (3h) - Independent
- ✅ Issue #4: CORS (1.5h) - Independent

**Day 2 (6-8 hours):**
- ✅ Issue #7: Magic Link Hashing (3h) - Needs session from Day 1
- ✅ Issue #6: CSRF Cookie (2h) - Needs session from Day 1
- ✅ Issue #5: Email Escaping (2.5h) - Can integrate with #7

**Day 3 (2-4 hours):**
- ✅ Integration testing
- ✅ Security audit verification
- ✅ Documentation updates
- ✅ Deploy to staging

---

## Dependencies Between Fixes

```
Issue #2 (Session Secret)
    ├─→ Issue #7 (Magic Links) - Needs secure sessions
    └─→ Issue #6 (CSRF) - Uses session storage

Issue #7 (Magic Links)
    └─→ Issue #5 (Email Escaping) - Magic links sent via email

Independent:
    - Issue #1 (Sentry)
    - Issue #3 (API Keys)
    - Issue #4 (CORS)
```

---

## Rollout Strategy

### Phase 1: Critical Infrastructure (Deploy First)
1. **Issue #2: Session Secret** - Deploy with generated secret
2. **Issue #1: Sentry Handler** - Enable error monitoring
3. **Issue #3: API Key Validation** - Prevent silent failures

**Why:** These are infrastructure-level fixes that don't change application behavior but prevent catastrophic failures.

**Deployment:**
```bash
# Generate secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))" > .session-secret

# Update .env
export SESSION_SECRET=$(cat .session-secret)
export SENTRY_DSN=your-sentry-dsn
export ANTHROPIC_API_KEY=your-key

# Deploy
npm run build
npm run migration:run
pm2 restart deepref-api
```

### Phase 2: Authentication Security (Deploy Second)
1. **Issue #7: Magic Link Hashing** - Run migration first
2. **Issue #6: CSRF Cookie** - Update frontend interceptor
3. **Issue #5: Email Escaping** - Deploy with #7

**Why:** These require database migrations and frontend updates. Deploy together to avoid breaking changes.

**Deployment:**
```bash
# Run migrations
npm run migration:run

# Deploy backend
npm run build
pm2 restart deepref-api

# Deploy frontend (updated CSRF interceptor)
cd apps/web
npm run build
# Deploy to CDN/web server
```

### Phase 3: Access Control (Deploy Last)
1. **Issue #4: CORS** - Strictest last to avoid breaking development

**Why:** CORS changes can break integrations. Deploy last when everything else is stable.

**Deployment:**
```bash
# Update .env
export CORS_ALLOW_NULL_ORIGIN=false  # Production
export CORS_ORIGIN=https://yourdomain.com

# Restart
pm2 restart deepref-api

# Test all integrations
npm run test:e2e
```

### Rollback Plan

Each phase should have a rollback plan:

**Phase 1 Rollback:**
```bash
# Restore previous .env
git checkout HEAD~1 -- .env
pm2 restart deepref-api
```

**Phase 2 Rollback:**
```bash
# Rollback migration
npm run migration:revert
# Restore previous code
git revert <commit-hash>
pm2 restart deepref-api
```

**Phase 3 Rollback:**
```bash
# Temporarily enable null origin
export CORS_ALLOW_NULL_ORIGIN=true
pm2 restart deepref-api
```

---

## Verification Checklist

### Pre-Deployment Checklist

**Environment Setup:**
- [ ] All required environment variables set in .env
- [ ] SESSION_SECRET is unique and 64+ characters
- [ ] SENTRY_DSN configured and tested
- [ ] At least one AI provider API key configured
- [ ] CORS_ORIGIN set to production domain
- [ ] CORS_ALLOW_NULL_ORIGIN=false in production

**Code Changes:**
- [ ] All 7 issues addressed in code
- [ ] Database migrations created and tested
- [ ] Unit tests written for new utilities
- [ ] Integration tests passing
- [ ] No console.log or debug statements in production code

**Database:**
- [ ] Migrations run successfully
- [ ] Existing magic link tokens cleared
- [ ] Indexes created for performance
- [ ] Backup taken before migration

**Frontend:**
- [ ] CSRF interceptor updated to read from header
- [ ] Session storage used for CSRF token
- [ ] All API calls tested
- [ ] No breaking changes to public APIs

### Post-Deployment Verification

**Issue #1: Sentry**
- [ ] Trigger test error, appears in Sentry within 30 seconds
- [ ] Sensitive headers (Authorization, Cookie) not visible
- [ ] Environment correctly set (production)
- [ ] Stack traces complete

**Issue #2: Session Secret**
- [ ] Application starts without errors
- [ ] Sessions persist across requests
- [ ] Session cookies have secure, httpOnly, sameSite flags
- [ ] Cannot start app with weak/default secret

**Issue #3: API Keys**
- [ ] Application starts with valid API keys
- [ ] Application fails to start with invalid keys
- [ ] API calls to AI providers succeed
- [ ] Logs show sanitized keys (first 4...last 4 chars)

**Issue #4: CORS**
- [ ] Requests from allowed origins succeed
- [ ] Requests from unauthorized origins blocked
- [ ] Requests without Origin header blocked (production)
- [ ] Preflight requests handled correctly

**Issue #5: Email Escaping**
- [ ] Send test emails with malicious input
- [ ] Verify HTML is escaped in email content
- [ ] Links are validated and sanitized
- [ ] XSS payloads rendered harmless

**Issue #6: CSRF**
- [ ] GET requests receive CSRF token in header
- [ ] POST without token returns 403
- [ ] POST with valid token succeeds
- [ ] No csrf-token cookie set (only in session)

**Issue #7: Magic Links**
- [ ] Magic link tokens hashed in database
- [ ] Verification works with correct token
- [ ] Verification fails with incorrect token
- [ ] Tokens are one-time use only
- [ ] Expired tokens rejected

### Security Audit

Run automated security checks:

```bash
# Dependency vulnerabilities
npm audit

# Code quality & security
npm run lint
npm run test:security

# OWASP ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://your-api-domain.com

# Check for secrets in code
trufflehog --regex --entropy=False .

# SSL/TLS configuration
ssllabs-scan --quiet your-api-domain.com
```

### Monitoring

Set up alerts for:

```yaml
# Sentry Alerts
- High error rate (>10 errors/minute)
- CSRF attack attempts
- Failed authentication (>5/minute)

# Application Logs
- SESSION_SECRET validation failures
- API key validation failures
- CORS violations
- Magic link verification failures

# Infrastructure
- High CPU usage (>80%)
- Memory leaks
- Database connection pool exhaustion
```

### Performance Benchmarks

Measure performance before and after:

```bash
# API response times
ab -n 1000 -c 10 https://your-api.com/api/v1/health

# Magic link verification (with hashing)
ab -n 100 -c 5 https://your-api.com/api/v1/auth/magic-link/verify/test

# Database query performance
# Should add index on magicLinkExpiry to maintain performance
```

---

## Additional Recommendations

### 1. Security Headers

Add comprehensive security headers:

```typescript
// apps/api/src/common/middleware/helmet.middleware.ts
import * as helmet from 'helmet';

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // For Swagger
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,  // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
});
```

### 2. Rate Limiting

Implement rate limiting on sensitive endpoints:

```typescript
// Protect magic link generation
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 3, ttl: 900000 } })  // 3 per 15 minutes
async requestMagicLink() { ... }

// Protect email verification
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 5, ttl: 3600000 } })  // 5 per hour
async verifyEmail() { ... }
```

### 3. Audit Logging

Log all security-relevant events:

```typescript
// Create audit log service
this.auditLogger.log({
  event: 'MAGIC_LINK_GENERATED',
  userId: user.id,
  email: user.email,
  ip: request.ip,
  userAgent: request.headers['user-agent'],
  timestamp: new Date(),
});
```

### 4. Security Testing

Add security-focused tests:

```bash
# Add to package.json
"scripts": {
  "test:security": "jest --testMatch='**/*.security.spec.ts'",
  "test:e2e:security": "jest --config ./test/jest-e2e.json --testMatch='**/security/*.spec.ts'"
}
```

### 5. Documentation

Update security documentation:

```markdown
# SECURITY.md

## Reporting Security Issues
Email: security@deepref.com

## Security Features
- Session-based authentication with secure secrets
- CSRF protection with session-backed tokens
- Magic link tokens hashed before storage
- Email content sanitized against XSS
- API keys validated on startup
- Comprehensive error monitoring with Sentry

## Security Headers
- HSTS enabled
- CSP configured
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
```

---

## Summary

This remediation plan addresses **7 critical and high-priority security vulnerabilities**:

✅ **Critical Issues (3):**
1. Sentry error handler properly initialized
2. Session secrets validated and secured
3. API keys validated with proper error handling

✅ **High Priority Issues (4):**
4. CORS protection enforced
5. Email templates sanitized against injection
6. CSRF tokens stored securely (session-only)
7. Magic link tokens hashed before storage

**Total Implementation Time:** 15.5 hours
**Recommended Timeline:** 2-3 days
**Risk Level After Fixes:** Significantly reduced

All fixes include:
- ✅ Detailed code examples
- ✅ Before/after comparisons
- ✅ Implementation steps
- ✅ Comprehensive testing
- ✅ Deployment guidance
- ✅ Rollback procedures

**Next Steps:**
1. Review this plan with development team
2. Set up development environment for testing
3. Execute Phase 1 (critical infrastructure)
4. Execute Phase 2 (authentication security)
5. Execute Phase 3 (access control)
6. Run full security verification
7. Deploy to production

---

**Document Version:** 1.0
**Last Updated:** 2025-11-20
**Author:** Security Vulnerability Remediation Specialist
**Status:** Ready for Implementation
