# AI Integration Module - DeepRef Platform

## Overview

The DeepRef AI module provides a comprehensive multi-provider AI integration with intelligent fallback strategies, supporting the latest models from Anthropic, Google, and OpenAI.

## Architecture

```
ai/
├── providers/          # AI Provider Implementations
│   ├── base.provider.ts       # Abstract base class
│   ├── anthropic.provider.ts  # PRIMARY: Claude models
│   ├── google.provider.ts     # SECONDARY: Gemini models
│   └── openai.provider.ts     # TERTIARY: GPT models
├── strategies/         # Execution Strategies
│   └── fallback.strategy.ts   # Automatic failover logic
├── services/          # AI-Powered Business Services
│   ├── reference-coach.service.ts        # Career coaching
│   ├── verification-orchestrator.service.ts  # Document/identity verification
│   ├── authenticity-analyzer.service.ts  # Deepfake detection
│   └── reference-intelligence.service.ts # Reference analysis
└── config/            # Configuration
    └── ai-models.config.ts    # Model selection & routing
```

## Model Versions

### Primary Provider: Anthropic (Claude)
- **Claude Opus 4.1** (`claude-opus-4-20250514`) - Complex reasoning, architecture decisions
- **Claude Sonnet 4.5** (`claude-sonnet-4-5-20250514`) - Main application logic, balanced performance
- **Claude Haiku 4.5** (`claude-haiku-4-5-20250514`) - Fast responses, simple tasks

### Secondary Provider: Google (Gemini)
- **Gemini 3 Pro** (`gemini-3-pro`) - Complex tasks fallback
- **Gemini 3 Flash** (`gemini-3-flash`) - Fast responses fallback

### Tertiary Provider: OpenAI (GPT)
- **GPT 5.1 Turbo** (`gpt-5.1-turbo`) - Last resort fallback

## Quick Start

### 1. Configuration

Copy the environment template and add your API keys:

```bash
cp apps/api/.env.ai.example apps/api/.env
# Edit .env and add your API keys
```

Required environment variables:
```env
# Anthropic (PRIMARY)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL_OPUS=claude-opus-4-20250514
ANTHROPIC_MODEL_SONNET=claude-sonnet-4-5-20250514
ANTHROPIC_MODEL_HAIKU=claude-haiku-4-5-20250514

# Google (SECONDARY)
GOOGLE_API_KEY=AIza...
GOOGLE_MODEL_PRO=gemini-3-pro
GOOGLE_MODEL_FLASH=gemini-3-flash

# OpenAI (TERTIARY)
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-5.1-turbo
```

### 2. Import AI Module

```typescript
import { Module } from '@nestjs/common';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [AiModule],
})
export class AppModule {}
```

### 3. Use AI Services

#### Reference Coach Service

```typescript
import { ReferenceCoachService } from './ai/services/reference-coach.service';

@Injectable()
export class MyService {
  constructor(private referenceCoach: ReferenceCoachService) {}

  async analyzeCandidate() {
    // Analyze resume and suggest referrers
    const analysis = await this.referenceCoach.analyzeProfile(
      resumeText,
      targetRole
    );

    // Generate interview questions
    const questions = await this.referenceCoach.generateQuestions(
      jobDescription,
      role,
      candidateContext
    );

    // Get coaching advice
    const coaching = await this.referenceCoach.coachInteraction({
      candidateBackground,
      referrerRelationship,
      challengingSituation
    });
  }
}
```

#### Verification Orchestrator Service

```typescript
import { VerificationOrchestratorService } from './ai/services/verification-orchestrator.service';

@Injectable()
export class VerificationService {
  constructor(private verificationOrchestrator: VerificationOrchestratorService) {}

  async verifyIdentity() {
    // Verify documents
    const docResult = await this.verificationOrchestrator.verifyDocument({
      documentType: 'passport',
      imageBase64: documentImage
    });

    // Verify biometrics
    const bioResult = await this.verificationOrchestrator.verifyBiometric({
      selfieBase64: selfieImage,
      voiceBase64: voiceSample
    });

    // Full verification workflow
    const fullResult = await this.verificationOrchestrator.orchestrateFullVerification({
      documents: [/* ... */],
      biometrics: [/* ... */],
      applicationData: {/* ... */}
    });
  }
}
```

#### Authenticity Analyzer Service

```typescript
import { AuthenticityAnalyzerService } from './ai/services/authenticity-analyzer.service';

@Injectable()
export class MediaService {
  constructor(private authenticityAnalyzer: AuthenticityAnalyzerService) {}

  async analyzeVideo() {
    // Analyze media for deepfakes
    const result = await this.authenticityAnalyzer.analyzeMediaAuthenticity({
      mediaType: 'video',
      contentBase64: videoData,
      transcript: videoTranscript
    });

    // Analyze content quality
    const quality = await this.authenticityAnalyzer.analyzeContentQuality({
      transcript: referenceTranscript,
      expectedTopics: ['leadership', 'teamwork']
    });

    // Cross-reference multiple references
    const crossRef = await this.authenticityAnalyzer.crossReferenceAnalysis(
      references
    );
  }
}
```

#### Reference Intelligence Service

```typescript
import { ReferenceIntelligenceService } from './ai/services/reference-intelligence.service';

@Injectable()
export class AnalysisService {
  constructor(private referenceIntelligence: ReferenceIntelligenceService) {}

  async analyzeReference() {
    // Transcribe audio
    const transcription = await this.referenceIntelligence.transcribeAudio({
      audioBase64: audioData
    });

    // NLP analysis
    const insights = await this.referenceIntelligence.analyzeReferenceNLP(
      transcription.fullText,
      { roleDescription, requiredSkills }
    );

    // Quality assessment
    const quality = await this.referenceIntelligence.assessReferenceQuality({
      text: transcription.fullText,
      referrerRole,
      candidateRole
    });

    // Full intelligence report
    const report = await this.referenceIntelligence.generateIntelligenceReport({
      audioBase64: audioData,
      roleContext: { title, description, requiredSkills }
    });
  }
}
```

## Fallback Strategy

The system automatically handles provider failures with intelligent fallback:

1. **Primary Attempt**: Anthropic (Claude)
2. **Secondary Fallback**: Google (Gemini)
3. **Tertiary Fallback**: OpenAI (GPT)

Features:
- Automatic retry with exponential backoff
- Circuit breaker pattern
- Cost optimization for simple tasks
- Detailed error tracking and metrics

## Task-to-Model Mapping

| Task Type | Primary Model | Use Case |
|-----------|--------------|----------|
| Reference Analysis | Sonnet 4.5 | Analyzing references, extracting insights |
| Deepfake Detection | Opus 4.1 | Complex media analysis, fraud detection |
| Question Generation | Sonnet 4.5 | Creating interview questions |
| Simple Classification | Haiku 4.5 | Quick categorization tasks |
| Document Analysis | Opus 4.1 | Complex document verification |
| Real-time Chat | Haiku 4.5 | Fast interactive responses |

## Testing

Run AI-specific tests:

```bash
# Test all AI providers
npm test apps/api/src/ai/providers/*.spec.ts

# Test fallback strategy
npm test apps/api/src/ai/strategies/fallback.strategy.spec.ts

# Test AI services
npm test apps/api/src/ai/services/*.spec.ts

# Verify AI configuration
npm run verify:ai-config

# Test provider connectivity
npm run test:ai-providers
```

## Monitoring

The AI module provides comprehensive monitoring:

```typescript
// Get provider statistics
const stats = fallbackStrategy.getStatistics();

// Reset metrics
fallbackStrategy.resetMetrics();

// Enable/disable specific provider
fallbackStrategy.setProviderEnabled('GoogleProvider', false);
```

Metrics tracked:
- Request counts (success/failure)
- Average latency
- Token usage
- Cost tracking
- Error rates
- Provider availability

## Cost Optimization

The system includes automatic cost optimization:

1. **Model Selection**: Automatically selects cheaper models for simple tasks
2. **Caching**: Caches common responses to reduce API calls
3. **Token Limits**: Enforces token limits per request
4. **Daily/Monthly Limits**: Automatic spending caps
5. **Cost Tracking**: Real-time cost monitoring and alerts

## Error Handling

All services include comprehensive error handling:

```typescript
try {
  const result = await aiService.analyze(data);
} catch (error) {
  if (error instanceof AllProvidersFailedException) {
    // All providers failed - check error.attempts for details
    console.error('All providers failed:', error.attempts);
  } else {
    // Other error
    console.error('AI error:', error.message);
  }
}
```

## Best Practices

1. **Always Use Fallback Strategy**: Don't call providers directly
2. **Specify Task Type**: Helps select optimal model
3. **Set Appropriate Timeouts**: Prevent hanging requests
4. **Monitor Costs**: Review usage regularly
5. **Cache When Possible**: Reduce repeated API calls
6. **Handle Errors Gracefully**: Always have fallback behavior
7. **Use Streaming for Long Responses**: Better UX for real-time features

## Security

1. **API Key Management**:
   - Never commit API keys
   - Use environment variables
   - Rotate keys regularly

2. **Rate Limiting**:
   - Implement per-user rate limits
   - Monitor for unusual patterns

3. **Input Validation**:
   - Sanitize user inputs before sending to AI
   - Limit input sizes

4. **Output Filtering**:
   - Review AI responses for sensitive data
   - Implement content filters

## Troubleshooting

### Provider Not Available
- Check API key configuration
- Verify network connectivity
- Check provider status page

### High Latency
- Consider using simpler models (Haiku/Flash)
- Enable caching
- Check network conditions

### Cost Overruns
- Enable cost optimization
- Set spending limits
- Review model selection logic
- Check for infinite loops

### Inconsistent Results
- Lower temperature for more consistent outputs
- Use same model for related tasks
- Implement result validation

## Support

For issues or questions:
1. Check provider documentation
2. Review error logs
3. Contact platform support
4. File GitHub issue

## Version History

- v2.0.0: Multi-provider support with latest models (Jan 2025)
- v1.0.0: Initial AI integration