# AI Provider Integration - Implementation Guide

## Overview

This guide provides comprehensive information about the AI provider integration, including architecture, testing strategies, monitoring, cost optimization, and implementation estimates.

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Application Layer                     │
├─────────────────────────────────────────────────────────────┤
│  AiService │ ReferencesService │ Other Services              │
├─────────────────────────────────────────────────────────────┤
│                    AI Integration Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ FallbackStrat│  │ AICacheServ  │  │ Prompt Mgmt  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│                      Provider Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Anthropic   │  │   Google     │  │   OpenAI     │      │
│  │   Provider   │  │   Provider   │  │   Provider   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **AI Service** (`ai.service.ts`)
   - Main entry point for AI operations
   - Handles caching, validation, and error handling
   - Methods: `verifyAuthenticity()`, `generateQuestions()`, `calculateRCS()`

2. **Fallback Strategy** (`fallback.strategy.ts`)
   - Manages provider fallback chain: Anthropic → Google → OpenAI
   - Automatic retry and timeout handling
   - Provider health monitoring

3. **AI Cache Service** (`ai-cache.service.ts`)
   - LRU cache with TTL expiration
   - Cost and token tracking
   - Cache statistics and health monitoring

4. **Prompt Configuration** (`prompts.config.ts`)
   - Centralized prompt templates
   - Input sanitization
   - Prompt injection protection

5. **Output Validator** (`output-validator.ts`)
   - JSON parsing and validation
   - Schema enforcement
   - Security checks (XSS, data exfiltration, PII detection)

## Testing Approach

### Unit Testing

#### Testing AI Service

Create mock providers and services:

```typescript
// ai.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { FallbackStrategy } from './strategies/fallback.strategy';
import { AICacheService } from './services/ai-cache.service';

describe('AiService', () => {
  let service: AiService;
  let fallbackStrategy: jest.Mocked<FallbackStrategy>;
  let cacheService: jest.Mocked<AICacheService>;

  beforeEach(async () => {
    // Create mocks
    const mockFallbackStrategy = {
      execute: jest.fn(),
      getStatistics: jest.fn(),
      resetMetrics: jest.fn(),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      getStatistics: jest.fn(),
      resetStatistics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: FallbackStrategy,
          useValue: mockFallbackStrategy,
        },
        {
          provide: AICacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    fallbackStrategy = module.get(FallbackStrategy);
    cacheService = module.get(AICacheService);
  });

  describe('verifyAuthenticity', () => {
    it('should return cached result if available', async () => {
      // Arrange
      const cachedResult = {
        authenticityScore: 85.5,
        deepfakeProbability: 14.5,
        confidence: 'high',
      };
      cacheService.get.mockReturnValue(cachedResult);

      // Act
      const result = await service.verifyAuthenticity({
        mediaUrl: 'https://example.com/video.mp4',
        mediaType: 'video',
      });

      // Assert
      expect(result).toEqual(cachedResult);
      expect(fallbackStrategy.execute).not.toHaveBeenCalled();
    });

    it('should call AI provider when cache miss', async () => {
      // Arrange
      cacheService.get.mockReturnValue(null);
      fallbackStrategy.execute.mockResolvedValue({
        content: JSON.stringify({
          authenticityScore: 85.5,
          deepfakeProbability: 14.5,
          confidence: 'high',
          indicators: {
            visualConsistency: 90,
            audioConsistency: 85,
            temporalCoherence: 88,
            metadataAnalysis: 80,
          },
          findings: ['Natural facial movements'],
          recommendedActions: ['No further action required'],
        }),
        provider: 'AnthropicProvider',
        model: 'claude-opus-4',
        tokenUsage: { input: 100, output: 200, total: 300 },
        cost: 0.015,
      });

      // Act
      const result = await service.verifyAuthenticity({
        mediaUrl: 'https://example.com/video.mp4',
        mediaType: 'video',
      });

      // Assert
      expect(result.authenticityScore).toBe(85.5);
      expect(fallbackStrategy.execute).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should handle invalid AI response format', async () => {
      // Arrange
      cacheService.get.mockReturnValue(null);
      fallbackStrategy.execute.mockResolvedValue({
        content: 'Invalid JSON',
        provider: 'AnthropicProvider',
        model: 'claude-opus-4',
      });

      // Act & Assert
      await expect(
        service.verifyAuthenticity({
          mediaUrl: 'https://example.com/video.mp4',
          mediaType: 'video',
        }),
      ).rejects.toThrow();
    });
  });

  describe('generateQuestions', () => {
    it('should generate questions for given role', async () => {
      // Arrange
      cacheService.get.mockReturnValue(null);
      fallbackStrategy.execute.mockResolvedValue({
        content: JSON.stringify({
          questions: [
            {
              id: 1,
              category: 'technical',
              question: 'How would you rate their coding skills?',
              rationale: 'Assesses technical competency',
            },
          ],
          recommendedQuestionCount: 5,
          estimatedResponseTime: 10,
        }),
        provider: 'AnthropicProvider',
        model: 'claude-sonnet-4.5',
        tokenUsage: { input: 50, output: 150, total: 200 },
        cost: 0.008,
      });

      // Act
      const result = await service.generateQuestions({
        role: 'Software Engineer',
        jobDescription: 'Full-stack developer with React and Node.js',
      });

      // Assert
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0]).toContain('coding skills');
    });

    it('should fallback to default questions when AI fails', async () => {
      // Arrange
      cacheService.get.mockReturnValue(null);
      const allProvidersError = new Error('All AI providers failed');
      allProvidersError.name = 'AllProvidersFailedException';
      fallbackStrategy.execute.mockRejectedValue(allProvidersError);

      // Act
      const result = await service.generateQuestions({
        role: 'Software Engineer',
        jobDescription: 'Full-stack developer',
      });

      // Assert
      expect(result.questions.length).toBeGreaterThan(0);
      expect(result.metadata.isFallback).toBe(true);
    });
  });
});
```

#### Testing Providers

Mock the SDK clients:

```typescript
// anthropic.provider.spec.ts
describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;
  let mockClient: jest.Mocked<Anthropic>;

  beforeEach(() => {
    mockClient = {
      messages: {
        create: jest.fn(),
      },
    } as any;

    // Inject mock client
    provider = new AnthropicProvider(mockConfigService);
    (provider as any).client = mockClient;
  });

  it('should generate response successfully', async () => {
    mockClient.messages.create.mockResolvedValue({
      id: 'msg_123',
      content: [{ type: 'text', text: 'Test response' }],
      usage: { input_tokens: 10, output_tokens: 20 },
      stop_reason: 'end_turn',
    });

    const result = await provider.generate('Test prompt');

    expect(result.content).toBe('Test response');
    expect(result.tokenUsage.total).toBe(30);
  });
});
```

### Integration Testing

Test the full flow with real providers (or using provider test APIs):

```typescript
describe('AI Integration Tests', () => {
  let app: INestApplication;
  let aiService: AiService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AiModule, ConfigModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    aiService = app.get<AiService>(AiService);
  });

  it('should verify authenticity end-to-end', async () => {
    const result = await aiService.verifyAuthenticity({
      mediaUrl: 'https://test.example.com/sample.mp4',
      mediaType: 'video',
    });

    expect(result.authenticityScore).toBeDefined();
    expect(result.authenticityScore).toBeGreaterThanOrEqual(0);
    expect(result.authenticityScore).toBeLessThanOrEqual(100);
  });
});
```

### E2E Testing

Test through the API endpoints:

```typescript
describe('AI Endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ai/verify-authenticity (POST)', () => {
    return request(app.getHttpServer())
      .post('/ai/verify-authenticity')
      .send({
        mediaUrl: 'https://example.com/video.mp4',
        mediaType: 'video',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.authenticityScore).toBeDefined();
      });
  });
});
```

## Monitoring and Logging

### Metrics to Track

1. **Provider Metrics**
   - Request count (total, successful, failed)
   - Average latency
   - Token usage
   - Cost per provider
   - Error rate
   - Availability status

2. **Cache Metrics**
   - Hit rate
   - Miss rate
   - Memory usage
   - Cost savings
   - Tokens saved

3. **Business Metrics**
   - Authenticity scores distribution
   - RCS scores distribution
   - Red flags frequency
   - Processing times

### Logging Strategy

```typescript
// Structured logging example
this.logger.log({
  event: 'AUTHENTICITY_VERIFICATION_COMPLETE',
  referenceId: id,
  provider: response.provider,
  model: response.model,
  duration: latency,
  cost: response.cost,
  tokenUsage: response.tokenUsage,
  authenticityScore: score,
  confidence: confidence,
  timestamp: new Date().toISOString(),
});
```

### Monitoring Dashboard

Create endpoints for monitoring:

```typescript
@Get('statistics')
getStatistics() {
  return this.aiService.getStatistics();
}

@Get('health')
getHealth() {
  const stats = this.fallbackStrategy.getStatistics();
  const cacheStats = this.cacheService.getStatistics();

  return {
    status: 'healthy',
    providers: stats.providers.map(p => ({
      name: p.name,
      status: p.metrics.status,
      availability: p.metrics.successfulRequests / p.metrics.totalRequests,
    })),
    cache: {
      hitRate: cacheStats.hitRate,
      healthy: this.cacheService.isHealthy(),
    },
  };
}
```

## Cost Optimization

### 1. Caching Strategy

- **TTL Configuration**: Set appropriate TTL based on content volatility
  - Authenticity verification: 24 hours (media doesn't change)
  - Question generation: 1 hour (role-specific, can be reused)
  - RCS calculation: 1 hour (reference content specific)

- **Cache Warming**: Pre-populate cache with common queries
  ```typescript
  await cacheService.warmUp([
    {
      taskType: 'QUESTION_GENERATION',
      prompt: 'Software Engineer|...',
      data: cachedQuestions,
      metadata: { cost: 0.008, tokenUsage: 200 },
    },
  ]);
  ```

### 2. Model Selection

- Use cheaper models for simple tasks:
  - Simple classification: Haiku/Flash (90% cost reduction)
  - Standard tasks: Sonnet/Pro (60% cost reduction)
  - Complex analysis: Opus only when necessary

- Current cost savings:
  - Haiku: $0.25/$1.25 per 1M tokens
  - Sonnet: $3/$15 per 1M tokens
  - Opus: $15/$75 per 1M tokens

### 3. Token Optimization

- Truncate long prompts intelligently
- Use system prompts efficiently
- Set appropriate `maxTokens` for each task
- Batch requests when possible

### 4. Provider Selection

- Primary: Anthropic (best quality/cost ratio)
- Secondary: Google (cost-effective fallback)
- Tertiary: OpenAI (final fallback)

### Expected Cost Reduction

| Strategy | Estimated Savings |
|----------|------------------|
| Caching (70% hit rate) | 70% reduction |
| Smart model selection | 60% reduction |
| Token optimization | 30% reduction |
| **Total Potential** | **85-90% reduction** |

## Implementation Timeline

### Phase 1: Core Integration (Week 1)
- ✅ Provider implementations (DONE)
- ✅ Fallback strategy (DONE)
- ✅ AI Service implementation (DONE)
- ✅ Cache service (DONE)
- ✅ Output validation (DONE)
- ✅ Prompt templates (DONE)

**Estimated Time**: 40 hours (COMPLETED)

### Phase 2: Integration & Testing (Week 2)
- ⏱️ Unit tests for all components: 16 hours
- ⏱️ Integration tests: 8 hours
- ⏱️ E2E tests: 8 hours
- ⏱️ Bug fixes and refinements: 8 hours

**Estimated Time**: 40 hours

### Phase 3: Monitoring & Optimization (Week 3)
- ⏱️ Monitoring dashboard: 8 hours
- ⏱️ Alert configuration: 4 hours
- ⏱️ Performance optimization: 8 hours
- ⏱️ Documentation: 8 hours
- ⏱️ Training materials: 4 hours

**Estimated Time**: 32 hours

### Phase 4: Production Deployment (Week 4)
- ⏱️ Staging deployment: 4 hours
- ⏱️ Load testing: 8 hours
- ⏱️ Security audit: 8 hours
- ⏱️ Production deployment: 4 hours
- ⏱️ Post-deployment monitoring: 8 hours

**Estimated Time**: 32 hours

### Total Implementation Time: 144 hours (18 days)

## Feature-Specific Estimates

| Feature | Estimated Time | Complexity |
|---------|---------------|------------|
| Deepfake Detection | 12 hours | High |
| Question Generation | 8 hours | Medium |
| RCS Calculation | 10 hours | High |
| AI Chat | 6 hours | Low |
| Batch Processing | 8 hours | Medium |
| Streaming Responses | 6 hours | Medium |
| Provider Fallback | 10 hours | High |
| Caching Layer | 8 hours | Medium |
| Output Validation | 8 hours | Medium |
| Prompt Injection Protection | 6 hours | Medium |

## Security Considerations

### Input Validation
- URL sanitization (SSRF protection)
- Prompt injection detection
- Input length limits
- Content sanitization

### Output Validation
- JSON schema validation
- XSS prevention
- Data exfiltration detection
- PII detection and removal

### API Security
- Rate limiting per user/session
- API key rotation
- Request signing
- Audit logging

## Error Handling Strategy

### Error Types

1. **Provider Errors**
   - Rate limiting: Automatic retry with backoff
   - API errors: Fallback to next provider
   - Timeout: Retry with exponential backoff

2. **Validation Errors**
   - Invalid input: Return 400 with details
   - Invalid output: Log and retry or use fallback

3. **Business Logic Errors**
   - Low authenticity: Flag for review
   - Missing data: Use default values or fail gracefully

### Fallback Chain

```
Request → Anthropic
          ↓ (fails)
       → Google
          ↓ (fails)
       → OpenAI
          ↓ (fails)
       → Heuristic Fallback
```

## Best Practices

1. **Always use caching** for repeated queries
2. **Monitor provider health** and adjust fallback priorities
3. **Log all AI interactions** for debugging and auditing
4. **Validate all inputs** before sending to AI
5. **Validate all outputs** before returning to users
6. **Set appropriate timeouts** for each task type
7. **Use streaming** for long-running tasks when appropriate
8. **Batch requests** when possible to reduce API calls
9. **Monitor costs** and adjust model selection accordingly
10. **Test thoroughly** with real-world scenarios

## Troubleshooting

### Common Issues

1. **High latency**
   - Check provider status
   - Verify network connectivity
   - Review model selection (use faster models)
   - Check cache hit rate

2. **High costs**
   - Review model selection
   - Check cache configuration
   - Optimize prompts (reduce tokens)
   - Implement batch processing

3. **Low quality results**
   - Review prompt templates
   - Adjust temperature settings
   - Use higher-tier models for critical tasks
   - Collect feedback and fine-tune

4. **Provider failures**
   - Check API keys and quotas
   - Review error logs
   - Verify fallback configuration
   - Contact provider support if needed

## Support and Maintenance

- Regular model updates (quarterly)
- Prompt optimization (monthly)
- Cost analysis (weekly)
- Performance tuning (as needed)
- Security audits (quarterly)
