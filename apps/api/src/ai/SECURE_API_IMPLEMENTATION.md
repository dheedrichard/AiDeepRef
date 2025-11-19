# Secure AI API Layer - Implementation Documentation

## Overview

This document describes the secure API layer implementation for DeepRef's AI services. The primary goal is to ensure that **system prompts are never exposed to clients** while providing a robust, scalable, and secure interface for AI interactions.

---

## Architecture

### Core Components

1. **PromptManagerService** - Manages encrypted system prompts
2. **SessionManagerService** - Handles session lifecycle and expiration
3. **InteractionLoggerService** - Logs all interactions for fine-tuning
4. **BulkProcessorService** - Processes batch operations with caching
5. **SecureAIChatService** - Main orchestrator for chat interactions

### Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Request                        │
└───────────────────────────────┬─────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   JwtAuthGuard        │ ← User Authentication
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │ AgentSessionGuard     │ ← Session Ownership
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │ RateLimitByAgentGuard │ ← Rate Limiting
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │  Controller Layer     │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │ SecureAIChatService   │ ← Orchestrator
                    └───────────┬───────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
        │PromptManager │ │SessionMgr │ │InteractionLog│
        └──────────────┘ └───────────┘ └──────────────┘
                │
        ┌───────▼───────┐
        │ Encrypted DB  │ ← System prompts NEVER exposed
        └───────────────┘
```

---

## API Endpoints

### 1. Session Management

#### Start Session
```http
POST /api/v1/ai/sessions/start
Authorization: Bearer <jwt_token>

{
  "session_type": "reference_coach",
  "metadata": {
    "context": "job_application"
  }
}

Response 201:
{
  "agent_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_id": "660e8400-e29b-41d4-a716-446655440001"
}
```

#### End Session
```http
POST /api/v1/ai/sessions/end
Authorization: Bearer <jwt_token>

{
  "agent_id": "550e8400-e29b-41d4-a716-446655440000"
}

Response 200:
{
  "success": true,
  "duration_minutes": 15
}
```

#### Get Session History
```http
GET /api/v1/ai/sessions/:agentId/history
Authorization: Bearer <jwt_token>

Response 200:
{
  "messages": [
    {
      "role": "user",
      "content": "How should I structure my reference request?",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "role": "assistant",
      "content": "Here are some tips...",
      "timestamp": "2024-01-15T10:30:02Z"
    }
  ]
}
```

**Security Note:** History NEVER includes system prompts.

---

### 2. Chat Interaction

#### Send Message
```http
POST /api/v1/ai/chat
Authorization: Bearer <jwt_token>

{
  "agent_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "How should I structure my reference request?"
}

Response 200:
{
  "message": "Here are some tips for structuring your reference request...",
  "interaction_id": "770e8400-e29b-41d4-a716-446655440002",
  "tokens_used": 150,
  "model_used": "claude-3-5-sonnet-20241022"
}
```

#### Stream Message (SSE)
```http
POST /api/v1/ai/chat/stream
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "agent_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "How should I structure my reference request?"
}

Response 200 (Server-Sent Events):
data: {"chunk": "Here", "done": false}
data: {"chunk": " are", "done": false}
data: {"chunk": " some", "done": false}
...
data: {"chunk": "", "done": true, "interaction_id": "770e8400..."}
```

---

### 3. Bulk Processing

```http
POST /api/v1/ai/batch
Authorization: Bearer <jwt_token>

{
  "agent_id": "550e8400-e29b-41d4-a716-446655440000",
  "operations": [
    {
      "type": "analyze_reference",
      "data": {"text": "John is an excellent developer"},
      "reference_id": "ref-001"
    },
    {
      "type": "analyze_reference",
      "data": {"text": "Sarah is outstanding"},
      "reference_id": "ref-002"
    }
  ]
}

Response 200:
{
  "results": [
    {
      "reference_id": "ref-001",
      "success": true,
      "response": "Analysis: Positive sentiment..."
    },
    {
      "reference_id": "ref-002",
      "success": true,
      "response": "Analysis: Highly positive..."
    }
  ],
  "total_tokens": 450,
  "total_latency_ms": 2500,
  "cache_hits": 1
}
```

**Performance Note:** Uses Anthropic prompt caching for 90% cost reduction on subsequent operations.

---

### 4. Admin Endpoints

#### List Prompts (Admin Only)
```http
GET /api/v1/ai/prompts?sessionType=reference_coach
Authorization: Bearer <admin_jwt_token>

Response 200:
[
  {
    "id": "prompt-123",
    "session_type": "reference_coach",
    "system_prompt_encrypted": "iv:authTag:encrypted...",
    "model_preference": "claude-3-5-sonnet-20241022",
    "is_active": true,
    "version": 2
  }
]
```

#### Create Prompt (Admin Only)
```http
POST /api/v1/ai/prompts
Authorization: Bearer <admin_jwt_token>

{
  "session_type": "reference_coach",
  "system_prompt": "You are a professional reference coach...",
  "model_preference": "claude-3-5-sonnet-20241022",
  "model_config": {
    "temperature": 0.7,
    "max_tokens": 2048
  }
}
```

#### Export for Fine-Tuning (Admin Only)
```http
POST /api/v1/ai/finetune/export
Authorization: Bearer <admin_jwt_token>

{
  "sessionType": "reference_coach",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "excludeFlagged": true
}

Response 201:
{
  "id": "export-456",
  "file_path": "/path/to/exports/finetune-export-456.jsonl",
  "interaction_count": 1523,
  "status": "completed"
}
```

---

## Security Measures

### ✅ Implemented Security Checks

#### 1. System Prompt Protection
- ✅ All system prompts encrypted with AES-256-GCM
- ✅ Decryption only happens server-side
- ✅ No system prompts in any API response
- ✅ No system prompts in interaction history
- ✅ No system prompts in fine-tune exports

#### 2. Session Validation
- ✅ Agent session ownership validation
- ✅ Session expiration checks (24-hour default)
- ✅ Session status validation (active/ended/expired)
- ✅ Automatic cleanup of expired sessions (hourly cron)

#### 3. Input Sanitization
- ✅ Removes prompt injection patterns:
  - `{system}`
  - `{prompt}`
  - `{instruction}`
  - `{assistant}`
  - `<|system|>`
  - `<|im_start|>` / `<|im_end|>`
- ✅ Maximum message length: 5000 characters
- ✅ Minimum message length: 1 character

#### 4. Rate Limiting
- ✅ 10 messages per minute per agent
- ✅ In-memory rate limiting (production: use Redis)
- ✅ Graceful error messages with retry-after headers

#### 5. Auto-Flagging
Auto-flags suspicious interactions containing:
- "ignore previous instructions"
- "forget system prompt"
- "reveal prompt"
- "what are your instructions"
- "show me system message"

---

## Service Implementations

### 1. PromptManagerService

**Responsibilities:**
- Manage encrypted system prompts
- Version control for prompts
- Decrypt prompts server-side only

**Key Methods:**
```typescript
getPromptForSessionType(type: string): Promise<AIPrompt>
getDecryptedPrompt(promptId: string): Promise<string>  // NEVER exposed to client
createPrompt(dto: CreatePromptDto): Promise<AIPrompt>
updatePrompt(id: string, dto: UpdatePromptDto): Promise<AIPrompt>
```

**Security:**
- AES-256-GCM encryption
- IV + AuthTag + Encrypted data format
- Encryption key from environment variable

---

### 2. SessionManagerService

**Responsibilities:**
- Create and manage AI sessions
- Validate session ownership
- Auto-expire sessions after 24 hours

**Key Methods:**
```typescript
startSession(dto: StartSessionDto): Promise<SessionResponse>
endSession(agentId: string): Promise<{ success: boolean; duration_minutes: number }>
getSessionByAgentId(agentId: string, userId: string): Promise<AISession>
cleanupExpiredSessions(): Promise<void>  // Cron: Every hour
```

**Features:**
- Agent ID as public-facing identifier
- Session ID for internal tracking
- Automatic expiration after 24 hours
- Manual session termination

---

### 3. InteractionLoggerService

**Responsibilities:**
- Log every AI interaction
- Export data for fine-tuning
- Track usage statistics

**Key Methods:**
```typescript
logInteraction(dto: LogInteractionDto): Promise<AIInteraction>
getHistory(sessionId: string): Promise<Array<{ role, content, timestamp }>>
exportForFineTuning(filters: FineTuneFilters): Promise<FineTuneExport>
```

**Export Format (JSONL):**
```jsonl
{"messages":[{"role":"user","content":"..."},{"role":"assistant","content":"..."}],"metadata":{...}}
{"messages":[{"role":"user","content":"..."},{"role":"assistant","content":"..."}],"metadata":{...}}
```

**Note:** Exports NEVER include system prompts.

---

### 4. BulkProcessorService

**Responsibilities:**
- Process multiple operations efficiently
- Implement prompt caching for cost savings
- Group operations by type

**Key Methods:**
```typescript
processBatch(agentId: string, userId: string, operations: BulkOperation[]): Promise<BulkResult>
```

**Performance:**
- Groups operations by type
- First operation: Establishes cache
- Subsequent operations: 90% cost reduction via caching
- In-memory prompt cache (5-minute TTL)

**Caching Strategy:**
```typescript
// First call - establish cache
{
  system: "prompt...",
  cache_control: { type: 'ephemeral' }
}

// Subsequent calls - use cache
{
  system: "prompt...",  // Uses cached version
  cache_control: undefined
}
```

---

### 5. SecureAIChatService

**Responsibilities:**
- Main orchestrator for chat interactions
- Coordinate between all services
- Ensure no system prompt exposure

**Workflow:**
```
1. Validate session ownership
2. Get system prompt (server-side only)
3. Build full prompt (hidden from user)
4. Call LLM with fallback
5. Log interaction
6. Update session stats
7. Return ONLY AI response (no system prompt)
```

**Key Methods:**
```typescript
chat(agentId: string, message: string, userId: string): Promise<ChatResponse>
chatStream(agentId: string, message: string, userId: string): Observable<StreamChunk>
getHistory(agentId: string, userId: string): Promise<Array<{ role, content, timestamp }>>
```

---

## Database Schema

### ai_prompts
```sql
CREATE TABLE ai_prompts (
  id UUID PRIMARY KEY,
  session_type VARCHAR(50) UNIQUE NOT NULL,
  system_prompt_encrypted TEXT NOT NULL,  -- NEVER exposed to client
  model_preference VARCHAR(100) DEFAULT 'claude-3-5-sonnet-20241022',
  model_config JSONB,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### ai_sessions
```sql
CREATE TABLE ai_sessions (
  id UUID PRIMARY KEY,
  agent_id UUID UNIQUE NOT NULL,  -- Public-facing identifier
  user_id UUID NOT NULL,
  session_type VARCHAR(50) NOT NULL,
  prompt_id UUID REFERENCES ai_prompts(id),
  metadata JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active',
  ended_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  interaction_count INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agent_id ON ai_sessions(agent_id);
CREATE INDEX idx_user_created ON ai_sessions(user_id, created_at);
```

### ai_interactions
```sql
CREATE TABLE ai_interactions (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES ai_sessions(id),
  prompt_id UUID REFERENCES ai_prompts(id),
  user_input TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  model_used VARCHAR(100) NOT NULL,
  tokens_used INTEGER NOT NULL,
  latency_ms INTEGER,
  metadata JSONB,
  flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_session_created ON ai_interactions(session_id, created_at);
CREATE INDEX idx_created ON ai_interactions(created_at);
```

---

## Testing

### Test Coverage

**Target:** >90% code coverage

**Test Files:**
- `secure-ai-chat.service.spec.ts`
- `prompt-manager.service.spec.ts`
- `session-manager.service.spec.ts`
- `interaction-logger.service.spec.ts`
- `bulk-processor.service.spec.ts`
- `agent-session.guard.spec.ts`
- `rate-limit-by-agent.guard.spec.ts`

### Critical Test Cases

#### SecureAIChatService
```typescript
✅ Should never expose system prompt in response
✅ Should log all interactions
✅ Should validate session ownership
✅ Should handle LLM failures gracefully
✅ Should update session statistics
```

#### AgentSessionGuard
```typescript
✅ Should allow valid session
✅ Should reject expired session
✅ Should reject inactive session
✅ Should reject missing agent_id
✅ Should reject unauthenticated user
```

#### PromptManagerService
```typescript
✅ Should encrypt system prompt before saving
✅ Should decrypt system prompt correctly
✅ Should deactivate old prompts when creating new one
✅ Should throw error if no active prompt exists
```

---

## Performance Metrics

### Bulk Processing with Caching

**Scenario:** Processing 10 reference analyses

**Without Caching:**
```
10 operations × 1000 tokens = 10,000 tokens
Cost: $15.00 (at $1.50 per 1M tokens)
```

**With Caching:**
```
1st operation: 1000 tokens (full prompt)
9 remaining: 9 × 100 tokens = 900 tokens (cached)
Total: 1,900 tokens
Cost: $2.85

Savings: 81% reduction
```

### Rate Limits

- **Per Agent:** 10 messages/minute
- **Per User:** No global limit (rely on per-agent limits)
- **Admin Endpoints:** No rate limiting

### Session Expiration

- **Default TTL:** 24 hours
- **Cleanup Frequency:** Every hour (cron)
- **Manual Extension:** Available via API

---

## Environment Variables

```env
# Required
PROMPT_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef...  # 64 hex chars (32 bytes)

# Optional
SESSION_EXPIRATION_HOURS=24
RATE_LIMIT_PER_MINUTE=10
CACHE_TTL_MINUTES=5
```

---

## Deployment Checklist

### Before Production

- [ ] Set PROMPT_ENCRYPTION_KEY environment variable
- [ ] Migrate database (create ai_prompts, ai_sessions, ai_interactions tables)
- [ ] Create initial system prompts for each session type
- [ ] Set up Redis for rate limiting (replace in-memory store)
- [ ] Configure monitoring for flagged interactions
- [ ] Set up alerts for high token usage
- [ ] Test all endpoints with Postman/curl
- [ ] Run full test suite: `npm run test:cov`
- [ ] Verify >90% code coverage
- [ ] Test rate limiting under load
- [ ] Test session expiration and cleanup
- [ ] Verify no system prompts in responses

---

## Maintenance

### Regular Tasks

**Daily:**
- Monitor flagged interactions
- Review high token usage sessions

**Weekly:**
- Export fine-tuning data
- Analyze usage patterns
- Review rate limit violations

**Monthly:**
- Rotate encryption keys (if policy requires)
- Archive old interaction logs
- Update system prompts based on feedback

---

## Security Incident Response

### If System Prompt Leaks

1. **Immediate:**
   - Flag affected interaction
   - End affected session
   - Rotate prompt version

2. **Investigation:**
   - Review interaction logs
   - Identify root cause
   - Update sanitization rules

3. **Prevention:**
   - Add new sanitization patterns
   - Update prompt injection detection
   - Enhance response validation

---

## Future Enhancements

### Planned Features

1. **Redis-based Rate Limiting**
   - Distributed rate limiting
   - Configurable limits per user tier

2. **Advanced Prompt Versioning**
   - A/B testing for prompts
   - Gradual rollout of new prompts

3. **Real-time Monitoring**
   - Grafana dashboards
   - Prometheus metrics
   - Alert on anomalies

4. **Enhanced Caching**
   - Redis-based prompt cache
   - Shared cache across instances

5. **Audit Logging**
   - Admin action logging
   - Prompt change tracking
   - Compliance reporting

---

## Support

For questions or issues:
- Technical Lead: Backend API Security Specialist
- Documentation: `/apps/api/src/ai/README.md`
- Test Reports: `npm run test:cov`
