# AI Provider Configuration Guide

## Environment Variables

Add these variables to your `.env` file:

```bash
# ============================================
# AI Provider Configuration
# ============================================

# Anthropic Configuration (Primary Provider)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxx
ANTHROPIC_MODEL_OPUS=claude-opus-4-20250514
ANTHROPIC_MODEL_SONNET=claude-sonnet-4-5-20250514
ANTHROPIC_MODEL_HAIKU=claude-haiku-4-5-20250514

# Google AI Configuration (Secondary Provider)
GOOGLE_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxx
GOOGLE_MODEL_PRO=gemini-3-pro
GOOGLE_MODEL_FLASH=gemini-3-flash

# OpenAI Configuration (Tertiary Provider)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_ORGANIZATION=org-xxxxxxxxxxxxxxxxx  # Optional
OPENAI_MODEL=gpt-5.1-turbo

# ============================================
# AI Service Configuration
# ============================================

# Fallback Strategy
AI_FALLBACK_ENABLED=true
AI_RETRY_ATTEMPTS=3
AI_TIMEOUT_MS=30000  # 30 seconds

# Cost Optimization
AI_COST_OPTIMIZATION=true

# ============================================
# Cache Configuration
# ============================================

# Cache Settings
AI_CACHE_ENABLED=true
AI_CACHE_TTL_MS=3600000  # 1 hour
AI_CACHE_MAX_SIZE=1000   # Maximum cache entries

# ============================================
# Rate Limiting (Optional)
# ============================================

# Per-user rate limits
AI_RATE_LIMIT_WINDOW_MS=60000  # 1 minute
AI_RATE_LIMIT_MAX_REQUESTS=100

# ============================================
# Logging and Monitoring
# ============================================

# Log Levels: error, warn, log, debug, verbose
LOG_LEVEL=log

# Enable detailed AI operation logging
AI_DETAILED_LOGGING=true

# ============================================
# Security Settings
# ============================================

# URL Validation
AI_ALLOW_INTERNAL_URLS=false

# Input Limits
AI_MAX_INPUT_LENGTH=50000
AI_MAX_PROMPT_LENGTH=10000
```

## Configuration Details

### Provider Priority

Providers are tried in the following order:

1. **Anthropic** (Primary)
   - Best quality-to-cost ratio
   - Latest Claude models
   - Excellent reasoning capabilities

2. **Google** (Secondary)
   - Cost-effective fallback
   - Good performance
   - Gemini 3 models

3. **OpenAI** (Tertiary)
   - Final fallback
   - GPT-5.1-turbo
   - Universal model for all tasks

### Model Selection by Task

#### Anthropic Models
- **Deepfake Detection**: Claude Opus 4 (complex reasoning)
- **Question Generation**: Claude Sonnet 4.5 (balanced)
- **RCS Scoring**: Claude Sonnet 4.5 (balanced)
- **Simple Tasks**: Claude Haiku 4.5 (fast)

#### Google Models
- **Complex Tasks**: Gemini 3 Pro
- **Simple Tasks**: Gemini 3 Flash

#### OpenAI Models
- **All Tasks**: GPT-5.1-turbo (unified model)

### Cache Configuration

#### Recommended TTL by Task Type

```typescript
// In your configuration
const CACHE_TTL_CONFIG = {
  AUTHENTICITY_VERIFICATION: 86400000,  // 24 hours (media doesn't change)
  QUESTION_GENERATION: 3600000,         // 1 hour (reusable for same role)
  REFERENCE_QUALITY_SCORING: 3600000,   // 1 hour (reference-specific)
  AI_CHAT: 0,                           // No caching (conversational)
};
```

#### Cache Size Recommendations

| Deployment Size | Max Cache Size | Memory Usage (est.) |
|----------------|----------------|---------------------|
| Small (< 1k users) | 500 | ~25 MB |
| Medium (1k-10k users) | 1000 | ~50 MB |
| Large (10k-100k users) | 5000 | ~250 MB |
| Enterprise (> 100k users) | Use Redis | N/A |

### Cost Optimization Settings

#### Task Complexity Mapping

```typescript
{
  // Use cheaper models for simple tasks
  SIMPLE_CLASSIFICATION: {
    capability: 'simple',
    maxTokens: 500,
    temperature: 0.2,
  },

  // Balanced models for standard tasks
  QUESTION_GENERATION: {
    capability: 'standard',
    maxTokens: 1500,
    temperature: 0.7,
  },

  // Premium models for complex tasks
  DEEPFAKE_DETECTION: {
    capability: 'complex',
    maxTokens: 2048,
    temperature: 0.3,
  },
}
```

### Monitoring Configuration

#### Health Check Endpoint

```typescript
GET /ai/health

Response:
{
  "status": "healthy",
  "providers": [
    {
      "name": "AnthropicProvider",
      "status": "available",
      "availability": 99.8,
      "averageLatency": 1234,
      "totalRequests": 1000,
      "successRate": 99.8
    }
  ],
  "cache": {
    "hitRate": 67.5,
    "healthy": true,
    "totalEntries": 450
  }
}
```

#### Statistics Endpoint

```typescript
GET /ai/statistics

Response:
{
  "fallback": {
    "fallbackEnabled": true,
    "costOptimization": true,
    "providers": [
      {
        "name": "AnthropicProvider",
        "priority": "PRIMARY",
        "metrics": {
          "totalRequests": 1000,
          "successfulRequests": 998,
          "failedRequests": 2,
          "averageLatency": 1234,
          "totalTokens": 250000,
          "totalCost": 12.50,
          "status": "available"
        }
      }
    ]
  },
  "cache": {
    "totalEntries": 450,
    "totalHits": 675,
    "totalMisses": 325,
    "hitRate": 67.5,
    "costSaved": 8.40,
    "tokensSaved": 168000
  }
}
```

## Deployment Checklist

### Pre-Deployment

- [ ] Set all required environment variables
- [ ] Verify API keys are valid
- [ ] Test each provider individually
- [ ] Configure appropriate cache TTL
- [ ] Set up monitoring/alerting
- [ ] Review security settings
- [ ] Test fallback mechanism
- [ ] Load test the system

### Post-Deployment

- [ ] Monitor provider health
- [ ] Track cost metrics
- [ ] Review cache hit rates
- [ ] Check error rates
- [ ] Verify response times
- [ ] Review security logs
- [ ] Optimize based on metrics

## Security Best Practices

### API Key Management

1. **Never commit API keys** to version control
2. **Use environment variables** or secure vaults (AWS Secrets Manager, Azure Key Vault)
3. **Rotate keys regularly** (every 90 days)
4. **Use separate keys** for development, staging, and production
5. **Monitor API key usage** for anomalies

### Request Validation

1. **Validate all URLs** to prevent SSRF attacks
2. **Sanitize user inputs** to prevent prompt injection
3. **Limit input sizes** to prevent DoS attacks
4. **Rate limit requests** per user/IP
5. **Log all requests** for audit trails

### Output Security

1. **Validate AI responses** against schemas
2. **Sanitize outputs** before returning to users
3. **Detect and remove PII** from responses
4. **Check for data exfiltration** attempts
5. **Monitor for unusual patterns**

## Performance Tuning

### Latency Optimization

1. **Enable caching** (Target: 70%+ hit rate)
2. **Use appropriate model tiers** for each task
3. **Set realistic timeouts** (15-30 seconds)
4. **Implement request queuing** for high load
5. **Use streaming** for long responses

### Cost Optimization

1. **Monitor token usage** per endpoint
2. **Optimize prompts** to reduce tokens
3. **Use cheaper models** when appropriate
4. **Implement aggressive caching**
5. **Batch requests** when possible

### Expected Performance Metrics

| Metric | Target | Excellent |
|--------|--------|-----------|
| Cache Hit Rate | > 60% | > 80% |
| Average Latency | < 3s | < 1.5s |
| Success Rate | > 99% | > 99.9% |
| Cost per Request | < $0.05 | < $0.02 |
| Availability | > 99.5% | > 99.9% |

## Troubleshooting

### Provider Connection Issues

```bash
# Test Anthropic connection
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-haiku-4-5-20250514",
    "max_tokens": 10,
    "messages": [{"role": "user", "content": "Hi"}]
  }'

# Test Google connection
curl "https://generativelanguage.googleapis.com/v1/models/gemini-3-flash:generateContent?key=$GOOGLE_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Hi"}]}]}'

# Test OpenAI connection
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.1-turbo",
    "messages": [{"role": "user", "content": "Hi"}],
    "max_tokens": 10
  }'
```

### Cache Issues

```typescript
// Clear cache
POST /ai/admin/cache/clear

// Check cache health
GET /ai/admin/cache/health

// View cache statistics
GET /ai/statistics
```

### High Costs

1. Check model selection configuration
2. Review cache hit rate (should be > 60%)
3. Analyze token usage per request
4. Optimize prompt templates
5. Enable cost optimization mode

### Provider Failures

1. Check API key validity
2. Verify rate limits not exceeded
3. Check provider status pages:
   - Anthropic: https://status.anthropic.com
   - Google: https://status.cloud.google.com
   - OpenAI: https://status.openai.com
4. Review error logs
5. Test fallback mechanism

## Scaling Considerations

### Horizontal Scaling

When scaling to multiple instances:

1. **Use Redis for caching** instead of in-memory cache
2. **Centralize metrics** using a metrics aggregator
3. **Implement distributed rate limiting**
4. **Use load balancer** with session affinity
5. **Monitor per-instance metrics**

### Redis Cache Configuration

```typescript
// Example Redis cache adapter
import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisCacheService extends AICacheService {
  private redis: Redis;

  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD,
    });
  }

  async get<T>(taskType: string, prompt: string): Promise<T | null> {
    const key = this.generateKey(taskType, prompt);
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set<T>(taskType: string, prompt: string, data: T, ttl?: number): Promise<void> {
    const key = this.generateKey(taskType, prompt);
    await this.redis.setex(key, ttl || 3600, JSON.stringify(data));
  }
}
```

## Cost Calculator

Estimate your monthly costs:

```
Monthly Cost = (Requests per Month) × (Average Tokens per Request) × (Cost per Token)

Example:
- 100,000 requests/month
- 1,000 average tokens/request (500 input + 500 output)
- Primarily using Sonnet: $3 input + $15 output per 1M tokens
- 70% cache hit rate

Without Cache:
Cost = 100,000 × (500 × $3/1M + 500 × $15/1M)
     = 100,000 × ($0.0015 + $0.0075)
     = 100,000 × $0.009
     = $900/month

With 70% Cache:
Cost = $900 × 0.30 = $270/month
Savings = $630/month (70%)
```

## Support

For issues or questions:
1. Check this documentation
2. Review the Implementation Guide
3. Check provider status pages
4. Review application logs
5. Contact the development team
