# AI Service API Usage Guide

## Overview

This guide provides examples and best practices for using the AI services in your application.

## Available AI Features

### 1. Media Authenticity Verification

Analyzes video/audio content for deepfake detection and authenticity scoring.

#### Endpoint
```typescript
POST /ai/verify-authenticity
```

#### Request Body
```typescript
{
  "mediaUrl": "https://storage.example.com/reference-video.mp4",
  "mediaType": "video" | "audio"
}
```

#### Response
```typescript
{
  "authenticityScore": 85.5,        // 0-100, higher is more authentic
  "deepfakeProbability": 14.5,      // 0-100, higher means likely deepfake
  "confidence": "high",              // "low" | "medium" | "high"
  "indicators": {
    "visualConsistency": 90,
    "audioConsistency": 85,
    "temporalCoherence": 88,
    "metadataAnalysis": 80
  },
  "findings": [
    "Natural facial movements detected",
    "Consistent lighting throughout",
    "No audio-visual desync detected"
  ],
  "recommendedActions": [
    "No further verification needed"
  ],
  "metadata": {
    "provider": "AnthropicProvider",
    "model": "claude-opus-4",
    "cost": 0.015,
    "tokenUsage": 300,
    "processingTime": 2340
  }
}
```

#### Usage Example

```typescript
// In your service
import { AiService } from '../ai/ai.service';

@Injectable()
export class MediaVerificationService {
  constructor(private aiService: AiService) {}

  async verifyVideoReference(videoUrl: string) {
    try {
      const result = await this.aiService.verifyAuthenticity({
        mediaUrl: videoUrl,
        mediaType: 'video',
      });

      if (result.authenticityScore < 50) {
        // Flag for manual review
        await this.flagForReview(videoUrl, result);
      }

      if (result.deepfakeProbability > 70) {
        // Reject automatically
        throw new Error('Potential deepfake detected');
      }

      return result;
    } catch (error) {
      // Handle errors gracefully
      this.logger.error('Verification failed', error);
      throw error;
    }
  }
}
```

### 2. Question Generation

Generates context-aware reference check questions based on job description and role.

#### Endpoint
```typescript
POST /ai/generate-questions
```

#### Request Body
```typescript
{
  "role": "Senior Software Engineer",
  "jobDescription": "Full-stack developer with 5+ years experience in React, Node.js, and AWS. Must have leadership experience and excellent communication skills."
}
```

#### Response
```typescript
{
  "questions": [
    "How would you describe the candidate's technical skills in their role as Senior Software Engineer?",
    "Can you provide specific examples of projects where they demonstrated full-stack capabilities?",
    "How did they exhibit leadership qualities in team settings?",
    "What was their approach to problem-solving and technical decision-making?",
    "Can you describe their communication style with both technical and non-technical stakeholders?"
  ],
  "detailedQuestions": [
    {
      "id": 1,
      "category": "technical",
      "question": "How would you rate their proficiency with React and Node.js?",
      "rationale": "Directly assesses core technical requirements"
    },
    {
      "id": 2,
      "category": "leadership",
      "question": "Can you describe a situation where they led a technical initiative?",
      "rationale": "Evaluates leadership capabilities through concrete examples"
    }
  ],
  "metadata": {
    "provider": "AnthropicProvider",
    "model": "claude-sonnet-4.5",
    "cost": 0.008,
    "tokenUsage": 200,
    "processingTime": 1250,
    "recommendedQuestionCount": 7,
    "estimatedResponseTime": 15
  }
}
```

#### Usage Example

```typescript
import { AiService } from '../ai/ai.service';

@Injectable()
export class ReferenceRequestService {
  constructor(private aiService: AiService) {}

  async createReferenceRequest(candidateId: string, jobId: string) {
    // Fetch job details
    const job = await this.jobsService.findOne(jobId);

    // Generate tailored questions
    const questionResult = await this.aiService.generateQuestions({
      role: job.title,
      jobDescription: job.description,
    });

    // Create reference request with generated questions
    const reference = await this.referenceRepository.create({
      candidateId,
      jobId,
      questions: questionResult.questions,
      // Store detailed questions for later analysis
      questionMetadata: questionResult.detailedQuestions,
    });

    return reference;
  }
}
```

### 3. Reference Credibility Score (RCS)

Calculates a comprehensive quality score for reference content.

#### Direct Usage

```typescript
import { AiService } from '../ai/ai.service';

@Injectable()
export class ReferenceAnalysisService {
  constructor(private aiService: AiService) {}

  async analyzeReference(referenceId: string) {
    const reference = await this.referenceRepository.findOne(referenceId);

    const result = await this.aiService.calculateRCS(
      reference.content,
      reference.questions,
      {
        format: reference.format,
        responseTime: this.calculateResponseTime(reference),
        completeness: this.calculateCompleteness(reference),
      }
    );

    return result;
  }
}
```

#### Response Structure

```typescript
{
  "rcsScore": 87.5,
  "confidence": "high",
  "breakdown": {
    "contentQuality": 28.5,      // out of 30
    "authenticity": 23.0,        // out of 25
    "completeness": 18.0,        // out of 20
    "verifiability": 12.0,       // out of 15
    "presentation": 9.0          // out of 10
  },
  "strengths": [
    "Provides specific dates and project names",
    "Includes measurable outcomes and metrics",
    "Balanced feedback with both strengths and areas for growth",
    "Professional and well-structured responses"
  ],
  "weaknesses": [
    "Could provide more context on team dynamics",
    "Limited discussion of technical skills depth"
  ],
  "recommendations": [
    "Consider follow-up questions about specific technical competencies",
    "Request additional details about collaboration experiences"
  ],
  "redFlags": [],
  "metadata": {
    "provider": "AnthropicProvider",
    "model": "claude-sonnet-4.5",
    "cost": 0.012,
    "tokenUsage": 350,
    "processingTime": 1800
  }
}
```

## Integration Patterns

### Pattern 1: Reference Submission Flow

```typescript
@Injectable()
export class ReferencesService {
  constructor(
    private aiService: AiService,
    private storageService: StorageService,
  ) {}

  async submitReference(referenceId: string, dto: SubmitReferenceDto) {
    // Step 1: Upload media to storage
    const mediaUrl = await this.storageService.upload(dto.file);

    // Step 2: Verify authenticity (for video/audio)
    let verification = null;
    if (dto.format === 'video' || dto.format === 'audio') {
      verification = await this.aiService.verifyAuthenticity({
        mediaUrl,
        mediaType: dto.format,
      });

      // Check threshold
      if (verification.authenticityScore < 60) {
        await this.flagForManualReview(referenceId, verification);
      }
    }

    // Step 3: Calculate RCS
    const rcsResult = await this.aiService.calculateRCS(
      dto.content,
      dto.questions,
      { format: dto.format }
    );

    // Step 4: Save results
    await this.referenceRepository.update(referenceId, {
      contentUrl: mediaUrl,
      authenticityScore: verification?.authenticityScore,
      deepfakeProbability: verification?.deepfakeProbability,
      rcsScore: rcsResult.rcsScore,
      status: 'completed',
    });

    return {
      referenceId,
      verification,
      rcsResult,
    };
  }
}
```

### Pattern 2: Batch Processing

```typescript
@Injectable()
export class BatchAnalysisService {
  constructor(private aiService: AiService) {}

  async analyzeBatch(referenceIds: string[]) {
    const results = await Promise.all(
      referenceIds.map(async (id) => {
        try {
          const reference = await this.referenceRepository.findOne(id);

          const rcs = await this.aiService.calculateRCS(
            reference.content,
            reference.questions,
            { format: reference.format }
          );

          return { id, success: true, rcs };
        } catch (error) {
          return { id, success: false, error: error.message };
        }
      })
    );

    return {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }
}
```

### Pattern 3: Real-time Scoring with Caching

```typescript
@Injectable()
export class LiveScoringService {
  constructor(private aiService: AiService) {}

  async getQuickScore(content: string, questions: string[]) {
    // This will use cache if available
    const result = await this.aiService.calculateRCS(
      content,
      questions,
      { format: 'text' }
    );

    // Return simplified score for quick display
    return {
      score: result.rcsScore,
      confidence: result.confidence,
      cached: result.metadata.isFallback !== true,
    };
  }
}
```

## Best Practices

### 1. Error Handling

Always implement proper error handling:

```typescript
async function analyzeWithErrorHandling(content: string) {
  try {
    const result = await aiService.calculateRCS(
      content,
      questions,
      metadata
    );

    return result;
  } catch (error) {
    if (error.name === 'AllProvidersFailedException') {
      // All providers failed - use fallback logic
      logger.warn('AI providers unavailable, using fallback');
      return getBasicScore(content);
    }

    if (error instanceof BadRequestException) {
      // Invalid input or output
      logger.error('Invalid data for AI processing', error);
      throw error;
    }

    // Unexpected error
    logger.error('Unexpected AI service error', error);
    throw error;
  }
}
```

### 2. Input Validation

Always validate inputs before sending to AI:

```typescript
function validateBeforeAI(content: string) {
  if (!content || content.trim().length === 0) {
    throw new BadRequestException('Content cannot be empty');
  }

  if (content.length > 50000) {
    throw new BadRequestException('Content too long');
  }

  // Check for malicious patterns
  if (/ignore.*instructions/i.test(content)) {
    logger.warn('Potential prompt injection detected');
    // Either reject or sanitize
  }
}
```

### 3. Response Validation

Validate AI responses:

```typescript
function validateAIResponse(response: any) {
  // Check required fields
  if (typeof response.rcsScore !== 'number') {
    throw new Error('Invalid response: missing rcsScore');
  }

  // Check value ranges
  if (response.rcsScore < 0 || response.rcsScore > 100) {
    throw new Error('Invalid response: rcsScore out of range');
  }

  // Check for suspicious content
  if (OutputValidator.detectExfiltration(JSON.stringify(response))) {
    throw new Error('Security: Potential data exfiltration detected');
  }

  return response;
}
```

### 4. Performance Optimization

```typescript
// Use caching for repeated queries
async function optimizedQuestionGeneration(role: string, description: string) {
  // Cache key based on normalized inputs
  const cacheKey = `${role.toLowerCase()}|${description.toLowerCase()}`;

  // aiService automatically checks cache
  const result = await aiService.generateQuestions({
    role,
    jobDescription: description,
  });

  return result;
}

// Batch operations
async function batchVerification(mediaUrls: string[]) {
  // Process in parallel with concurrency limit
  const concurrency = 5;
  const chunks = chunk(mediaUrls, concurrency);

  const results = [];
  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(url =>
        aiService.verifyAuthenticity({ mediaUrl: url, mediaType: 'video' })
      )
    );
    results.push(...chunkResults);
  }

  return results;
}
```

### 5. Cost Management

```typescript
// Monitor and control costs
@Injectable()
export class CostAwareAIService {
  private monthlyCost = 0;
  private readonly maxMonthlyCost = 1000; // $1000 limit

  async executeWithCostControl(operation: () => Promise<any>) {
    // Check cost limit
    if (this.monthlyCost >= this.maxMonthlyCost) {
      throw new Error('Monthly AI cost limit reached');
    }

    const result = await operation();

    // Track cost
    if (result.metadata?.cost) {
      this.monthlyCost += result.metadata.cost;
    }

    return result;
  }

  // Reset monthly (call from cron job)
  resetMonthlyCost() {
    this.monthlyCost = 0;
  }
}
```

## Advanced Usage

### Custom Prompts

For specialized use cases, you can create custom prompts:

```typescript
import { FallbackStrategy } from '../ai/strategies/fallback.strategy';
import { TaskType } from '../ai/providers/base.provider';

@Injectable()
export class CustomAIService {
  constructor(private fallbackStrategy: FallbackStrategy) {}

  async customAnalysis(data: any) {
    const systemPrompt = `You are an expert in analyzing professional references...`;
    const userPrompt = `Analyze this: ${JSON.stringify(data)}`;

    const response = await this.fallbackStrategy.execute(userPrompt, {
      systemPrompt,
      taskType: TaskType.DOCUMENT_ANALYSIS,
      temperature: 0.5,
      maxTokens: 2000,
    });

    return JSON.parse(response.content);
  }
}
```

### Streaming Responses

For long-running operations:

```typescript
async *streamAnalysis(content: string) {
  const generator = this.fallbackStrategy.executeStream(
    `Analyze: ${content}`,
    {
      taskType: TaskType.DOCUMENT_ANALYSIS,
      temperature: 0.7,
    }
  );

  for await (const chunk of generator) {
    yield chunk;
  }
}

// Usage in controller
@Get('stream-analysis')
async streamAnalysis(@Query('id') id: string, @Res() res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const generator = this.aiService.streamAnalysis(content);

  for await (const chunk of generator) {
    res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
  }

  res.end();
}
```

## Monitoring and Debugging

### Get Service Statistics

```typescript
@Get('ai/statistics')
async getStatistics() {
  return this.aiService.getStatistics();
}
```

### Health Check

```typescript
@Get('ai/health')
async healthCheck() {
  const stats = this.aiService.getStatistics();

  const healthy = stats.fallback.providers.every(
    p => p.metrics.status === 'available' || p.metrics.status === 'rate_limited'
  );

  return {
    status: healthy ? 'healthy' : 'degraded',
    details: stats,
  };
}
```

### Debug Logging

Enable detailed logging for troubleshooting:

```typescript
// In your .env
AI_DETAILED_LOGGING=true
LOG_LEVEL=debug

// View logs
docker logs -f api-container | grep "AI"
```

## Common Scenarios

### Scenario 1: New Reference Request

```typescript
1. User requests reference from candidate
2. Generate questions using AI
   → aiService.generateQuestions({ role, jobDescription })
3. Send questions to referrer
4. Referrer submits response
5. Verify media authenticity (if video/audio)
   → aiService.verifyAuthenticity({ mediaUrl, mediaType })
6. Calculate RCS
   → aiService.calculateRCS(content, questions, metadata)
7. Store results and notify candidate
```

### Scenario 2: Bulk Reference Analysis

```typescript
1. Admin selects multiple references
2. Queue batch analysis job
3. Process each reference:
   - Calculate RCS
   - Check for red flags
   - Generate summary
4. Create aggregate report
5. Export results
```

### Scenario 3: Real-time Quality Feedback

```typescript
1. Referrer starts typing response
2. On pause/blur, analyze content
   → aiService.calculateRCS(partialContent, ...)
3. Show live score and suggestions
4. Referrer improves response based on feedback
5. Final submission with high RCS
```

## Support and Resources

- **Implementation Guide**: `/apps/api/src/ai/docs/IMPLEMENTATION_GUIDE.md`
- **Configuration Guide**: `/apps/api/src/ai/docs/CONFIGURATION.md`
- **API Documentation**: This file
- **Provider Docs**:
  - Anthropic: https://docs.anthropic.com
  - Google AI: https://ai.google.dev/docs
  - OpenAI: https://platform.openai.com/docs

## Migration Guide

If you're migrating from placeholder implementations:

### Before (Placeholder)
```typescript
async submitReference(id: string, dto: SubmitReferenceDto) {
  const rcsScore = Math.floor(Math.random() * 100);
  // ... save
}
```

### After (AI-Powered)
```typescript
async submitReference(id: string, dto: SubmitReferenceDto) {
  // Real AI analysis
  const rcsResult = await this.aiService.calculateRCS(
    dto.content,
    reference.questions,
    { format: dto.format }
  );

  const rcsScore = rcsResult.rcsScore;
  // ... save with confidence, breakdown, etc.
}
```

Simply inject `AiService` and replace placeholder logic with AI service calls!
