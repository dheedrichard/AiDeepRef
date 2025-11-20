import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { VerifyAuthenticityDto } from './dto/verify-authenticity.dto';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';
import { FallbackStrategy } from './strategies/fallback.strategy';
import { AICacheService } from './services/ai-cache.service';
import { TaskType } from './providers/base.provider';
import {
  SYSTEM_PROMPTS,
  USER_PROMPTS,
  TASK_COST_SETTINGS,
  PromptSanitizer,
} from './config/prompts.config';
import { OutputValidator } from './utils/output-validator';

/**
 * AI Service
 *
 * Production-ready AI service that integrates with multiple providers
 * using automatic fallback, caching, and comprehensive error handling.
 *
 * Features:
 * - Multi-provider support with automatic fallback (Anthropic -> Google -> OpenAI)
 * - Response caching for cost optimization
 * - Input sanitization and output validation
 * - Comprehensive error handling and logging
 * - Cost and token tracking
 * - Rate limiting protection
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private fallbackStrategy: FallbackStrategy,
    private cacheService: AICacheService,
  ) {
    this.logger.log('AI Service initialized with multi-provider support');
  }

  /**
   * Verify media authenticity and detect potential deepfakes
   *
   * @param dto - Media URL and type for verification
   * @returns Authenticity analysis with scores and recommendations
   */
  async verifyAuthenticity(dto: VerifyAuthenticityDto) {
    const taskType = 'AUTHENTICITY_VERIFICATION';
    const startTime = Date.now();

    try {
      this.logger.log(`Starting authenticity verification for ${dto.mediaType}: ${dto.mediaUrl}`);

      // Validate and sanitize input
      const sanitizedUrl = PromptSanitizer.sanitizeUrl(dto.mediaUrl);

      // Check cache first
      const cached = this.cacheService.get<any>(
        taskType,
        dto.mediaUrl,
        { mediaType: dto.mediaType },
      );

      if (cached) {
        this.logger.log('Authenticity verification result retrieved from cache');
        return cached;
      }

      // Build prompt
      const systemPrompt = SYSTEM_PROMPTS.AUTHENTICITY_VERIFICATION;
      const userPrompt = USER_PROMPTS.verifyAuthenticity(
        sanitizedUrl,
        dto.mediaType,
      );

      // Execute AI call with fallback
      const options = {
        taskType: TaskType.DEEPFAKE_DETECTION,
        ...TASK_COST_SETTINGS.AUTHENTICITY_VERIFICATION,
        systemPrompt,
      };

      const response = await this.fallbackStrategy.execute(userPrompt, options);

      // Parse and validate response
      const parseResult = OutputValidator.parseJSON(
        response.content,
        OutputValidator.validateAuthenticityResponse,
      );

      if (!parseResult.valid) {
        throw new BadRequestException(
          `Invalid AI response format: ${parseResult.errors?.join(', ')}`,
        );
      }

      // Check for security issues
      if (OutputValidator.detectExfiltration(response.content)) {
        this.logger.error('Potential data exfiltration detected in AI response');
        throw new BadRequestException('AI response failed security validation');
      }

      // Log metrics
      const duration = Date.now() - startTime;
      this.logger.log({
        event: 'AUTHENTICITY_VERIFICATION_COMPLETE',
        provider: response.provider,
        model: response.model,
        duration,
        cost: response.cost,
        tokenUsage: response.tokenUsage,
        authenticityScore: parseResult.data.authenticityScore,
        deepfakeProbability: parseResult.data.deepfakeProbability,
      });

      // Prepare result
      const result = {
        authenticityScore: parseResult.data.authenticityScore,
        deepfakeProbability: parseResult.data.deepfakeProbability,
        confidence: parseResult.data.confidence,
        indicators: parseResult.data.indicators,
        findings: parseResult.data.findings,
        recommendedActions: parseResult.data.recommendedActions,
        metadata: {
          provider: response.provider,
          model: response.model,
          cost: response.cost,
          tokenUsage: response.tokenUsage?.total,
          processingTime: duration,
        },
      };

      // Cache the result
      this.cacheService.set(
        taskType,
        dto.mediaUrl,
        result,
        {
          cost: response.cost || 0,
          tokenUsage: response.tokenUsage?.total || 0,
          options: { mediaType: dto.mediaType },
        },
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Authenticity verification failed: ${error.message}`,
        error.stack,
      );

      // Return graceful degradation
      if (error.name === 'AllProvidersFailedException') {
        throw new BadRequestException(
          'AI service temporarily unavailable. Please try again later.',
        );
      }

      throw error;
    }
  }

  /**
   * Generate context-aware reference check questions
   *
   * @param dto - Job description and role information
   * @returns Tailored questions for reference checking
   */
  async generateQuestions(dto: GenerateQuestionsDto) {
    const taskType = 'QUESTION_GENERATION';
    const startTime = Date.now();

    try {
      this.logger.log(`Generating questions for role: ${dto.role}`);

      // Validate and sanitize input
      const validation = PromptSanitizer.validateInput(dto.jobDescription);
      if (!validation.valid) {
        throw new BadRequestException(validation.reason);
      }

      const sanitizedJobDesc = PromptSanitizer.sanitizeInput(dto.jobDescription);
      const sanitizedRole = PromptSanitizer.sanitizeInput(dto.role);

      // Check cache
      const cacheKey = `${sanitizedRole}|${sanitizedJobDesc}`;
      const cached = this.cacheService.get<any>(taskType, cacheKey);

      if (cached) {
        this.logger.log('Questions retrieved from cache');
        return cached;
      }

      // Build prompt
      const systemPrompt = SYSTEM_PROMPTS.QUESTION_GENERATION;
      const userPrompt = USER_PROMPTS.generateQuestions(
        sanitizedJobDesc,
        sanitizedRole,
      );

      // Execute AI call
      const options = {
        taskType: TaskType.QUESTION_GENERATION,
        ...TASK_COST_SETTINGS.QUESTION_GENERATION,
        systemPrompt,
      };

      const response = await this.fallbackStrategy.execute(userPrompt, options);

      // Parse and validate response
      const parseResult = OutputValidator.parseJSON(
        response.content,
        OutputValidator.validateQuestionsResponse,
      );

      if (!parseResult.valid) {
        throw new BadRequestException(
          `Invalid AI response format: ${parseResult.errors?.join(', ')}`,
        );
      }

      // Check for PII leakage
      const piiCheck = OutputValidator.detectPII(response.content);
      if (piiCheck.detected) {
        this.logger.warn('PII detected in generated questions, sanitizing...');
      }

      // Log metrics
      const duration = Date.now() - startTime;
      this.logger.log({
        event: 'QUESTION_GENERATION_COMPLETE',
        provider: response.provider,
        model: response.model,
        duration,
        cost: response.cost,
        tokenUsage: response.tokenUsage,
        questionCount: parseResult.data.questions.length,
      });

      // Prepare result
      const result = {
        questions: parseResult.data.questions.map(q => q.question),
        detailedQuestions: parseResult.data.questions,
        metadata: {
          provider: response.provider,
          model: response.model,
          cost: response.cost,
          tokenUsage: response.tokenUsage?.total,
          processingTime: duration,
          recommendedQuestionCount: parseResult.data.recommendedQuestionCount,
          estimatedResponseTime: parseResult.data.estimatedResponseTime,
        },
      };

      // Cache the result
      this.cacheService.set(
        taskType,
        cacheKey,
        result,
        {
          cost: response.cost || 0,
          tokenUsage: response.tokenUsage?.total || 0,
        },
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Question generation failed: ${error.message}`,
        error.stack,
      );

      // Fallback to basic questions if AI fails
      if (error.name === 'AllProvidersFailedException') {
        this.logger.warn('Falling back to default questions');
        return this.getDefaultQuestions(dto.role);
      }

      throw error;
    }
  }

  /**
   * Calculate Reference Credibility Score (RCS) for a reference
   *
   * This method is exported for use by the references service
   *
   * @param referenceContent - The reference content to analyze
   * @param questions - Questions that were asked
   * @param metadata - Additional metadata about the reference
   * @returns RCS score and detailed analysis
   */
  async calculateRCS(
    referenceContent: string,
    questions: string[],
    metadata: {
      format: string;
      responseTime?: number;
      completeness?: number;
    },
  ) {
    const taskType = 'REFERENCE_QUALITY_SCORING';
    const startTime = Date.now();

    try {
      this.logger.log(`Calculating RCS for ${metadata.format} reference`);

      // Validate input
      const validation = PromptSanitizer.validateInput(referenceContent);
      if (!validation.valid) {
        throw new BadRequestException(validation.reason);
      }

      const sanitizedContent = PromptSanitizer.sanitizeInput(referenceContent);

      // Check cache
      const cacheKey = `${sanitizedContent}|${questions.join('|')}`;
      const cached = this.cacheService.get<any>(taskType, cacheKey);

      if (cached) {
        this.logger.log('RCS result retrieved from cache');
        return cached;
      }

      // Build prompt
      const systemPrompt = SYSTEM_PROMPTS.REFERENCE_QUALITY_SCORING;
      const userPrompt = USER_PROMPTS.scoreReferenceQuality(
        sanitizedContent,
        questions,
        metadata,
      );

      // Execute AI call
      const options = {
        taskType: TaskType.REFERENCE_ANALYSIS,
        ...TASK_COST_SETTINGS.REFERENCE_QUALITY_SCORING,
        systemPrompt,
      };

      const response = await this.fallbackStrategy.execute(userPrompt, options);

      // Parse and validate response
      const parseResult = OutputValidator.parseJSON(
        response.content,
        OutputValidator.validateRCSResponse,
      );

      if (!parseResult.valid) {
        throw new BadRequestException(
          `Invalid AI response format: ${parseResult.errors?.join(', ')}`,
        );
      }

      // Log metrics
      const duration = Date.now() - startTime;
      this.logger.log({
        event: 'RCS_CALCULATION_COMPLETE',
        provider: response.provider,
        model: response.model,
        duration,
        cost: response.cost,
        tokenUsage: response.tokenUsage,
        rcsScore: parseResult.data.rcsScore,
      });

      // Prepare result
      const result = {
        rcsScore: parseResult.data.rcsScore,
        confidence: parseResult.data.confidence,
        breakdown: parseResult.data.breakdown,
        strengths: parseResult.data.strengths,
        weaknesses: parseResult.data.weaknesses,
        recommendations: parseResult.data.recommendations,
        redFlags: parseResult.data.redFlags,
        metadata: {
          provider: response.provider,
          model: response.model,
          cost: response.cost,
          tokenUsage: response.tokenUsage?.total,
          processingTime: duration,
        },
      };

      // Cache the result
      this.cacheService.set(
        taskType,
        cacheKey,
        result,
        {
          cost: response.cost || 0,
          tokenUsage: response.tokenUsage?.total || 0,
        },
      );

      return result;
    } catch (error) {
      this.logger.error(`RCS calculation failed: ${error.message}`, error.stack);

      // Fallback to basic scoring
      if (error.name === 'AllProvidersFailedException') {
        this.logger.warn('Falling back to basic RCS calculation');
        return this.calculateBasicRCS(referenceContent);
      }

      throw error;
    }
  }

  /**
   * Get AI service statistics
   */
  getStatistics() {
    return {
      fallback: this.fallbackStrategy.getStatistics(),
      cache: this.cacheService.getStatistics(),
    };
  }

  /**
   * Reset service statistics
   */
  resetStatistics() {
    this.fallbackStrategy.resetMetrics();
    this.cacheService.resetStatistics();
    this.logger.log('AI Service statistics reset');
  }

  /**
   * Default questions fallback when AI is unavailable
   */
  private getDefaultQuestions(role: string) {
    const sanitizedRole = PromptSanitizer.sanitizeInput(role);

    return {
      questions: [
        `How would you describe the candidate's technical skills in their role as ${sanitizedRole}?`,
        'Can you provide specific examples of projects or tasks they completed successfully?',
        'How did they collaborate with team members and stakeholders?',
        'What were their main strengths in this position?',
        'What areas would you suggest for their professional development?',
        'Would you work with them again? Why or why not?',
        'Can you describe their work ethic and reliability?',
      ],
      detailedQuestions: [],
      metadata: {
        provider: 'default',
        model: 'fallback',
        cost: 0,
        tokenUsage: 0,
        processingTime: 0,
        isFallback: true,
      },
    };
  }

  /**
   * Basic RCS calculation fallback when AI is unavailable
   */
  private calculateBasicRCS(content: string) {
    // Simple heuristic-based scoring
    const wordCount = content.split(/\s+/).length;
    const hasSpecificDetails = /\d{4}|\d+%|project|achievement|result/i.test(content);
    const sentimentBalance = content.includes('strength') && content.includes('improve');

    let score = 50; // Base score

    // Content length
    if (wordCount > 500) score += 15;
    else if (wordCount > 200) score += 10;
    else if (wordCount > 100) score += 5;

    // Specific details
    if (hasSpecificDetails) score += 15;

    // Balanced feedback
    if (sentimentBalance) score += 10;

    return {
      rcsScore: Math.min(score, 100),
      confidence: 'low' as const,
      breakdown: {
        contentQuality: Math.min(score * 0.3, 30),
        authenticity: Math.min(score * 0.25, 25),
        completeness: Math.min(score * 0.2, 20),
        verifiability: Math.min(score * 0.15, 15),
        presentation: Math.min(score * 0.1, 10),
      },
      strengths: ['Content provided'],
      weaknesses: ['AI analysis unavailable'],
      recommendations: ['Manual review recommended'],
      redFlags: [],
      metadata: {
        provider: 'basic',
        model: 'heuristic',
        cost: 0,
        tokenUsage: 0,
        processingTime: 0,
        isFallback: true,
      },
    };
  }
}
