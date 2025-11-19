import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FallbackStrategy } from '../strategies/fallback.strategy';
import { TaskType, ModelCapability, AIOptions } from '../providers/base.provider';
import { ANTHROPIC_MODELS } from '../providers/anthropic.provider';

/**
 * Media authenticity analysis result
 */
export interface MediaAuthenticityResult {
  authenticityScore: number; // 0-100
  deepfakeProbability: number; // 0-100
  analysisType: 'video' | 'audio' | 'image' | 'combined';
  detectedAnomalies: Array<{
    type: string;
    description: string;
    timestamp?: number;
    confidence: number;
    location?: { x: number; y: number; width: number; height: number };
  }>;
  technicalAnalysis: {
    compressionArtifacts: boolean;
    temporalInconsistencies: boolean;
    audioVideoSync: boolean;
    facialMicroExpressions: boolean;
    voicePattern: boolean;
  };
  confidenceFactors: {
    videoQuality: number;
    audioQuality: number;
    lightingConsistency: number;
    backgroundConsistency: number;
  };
  verdict: 'authentic' | 'likely_authentic' | 'suspicious' | 'likely_fake' | 'fake';
  metadata: {
    processingTime: number;
    model: string;
    provider: string;
    analysisVersion: string;
  };
}

/**
 * Content quality metrics
 */
export interface ContentQualityMetrics {
  overallQuality: number; // 0-100
  clarity: number;
  relevance: number;
  completeness: number;
  professionalism: number;
  specificExamples: number;
  emotionalTone: {
    sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
    confidence: number;
  };
  languageAnalysis: {
    complexity: 'simple' | 'moderate' | 'complex';
    consistency: number;
    authenticitMarkers: string[];
  };
  redFlags: string[];
  strengths: string[];
}

/**
 * Cross-reference analysis result
 */
export interface CrossReferenceResult {
  consistencyScore: number; // 0-100
  correlationMatrix: Array<{
    reference1: string;
    reference2: string;
    correlation: number;
    matchingPoints: string[];
    discrepancies: string[];
  }>;
  commonThemes: Array<{
    theme: string;
    frequency: number;
    references: string[];
  }>;
  outliers: Array<{
    reference: string;
    deviationScore: number;
    unusualElements: string[];
  }>;
  aggregateInsights: {
    strengths: string[];
    weaknesses: string[];
    consensus: string[];
    conflicts: string[];
  };
  recommendation: string;
}

/**
 * Authenticity Analyzer Service
 * Uses Claude Sonnet 4.5 for media analysis and authenticity verification
 */
@Injectable()
export class AuthenticityAnalyzerService {
  private readonly logger = new Logger(AuthenticityAnalyzerService.name);
  private readonly systemPrompt: string;
  private readonly defaultModel = ANTHROPIC_MODELS.SONNET_4_5;
  private readonly analysisVersion = '2.0';

  constructor(
    private configService: ConfigService,
    private fallbackStrategy: FallbackStrategy,
  ) {
    this.systemPrompt = this.configService.get<string>(
      'aiModels.systemPrompts.authenticityAnalyzer',
      'You are an expert in media analysis and deepfake detection. ' +
      'Analyze video and audio content to determine authenticity and identify potential manipulation. ' +
      'Focus on technical indicators, behavioral patterns, and content consistency.',
    );
  }

  /**
   * Analyze media for authenticity and deepfake detection
   */
  async analyzeMediaAuthenticity(
    mediaData: {
      mediaType: 'video' | 'audio' | 'image';
      contentBase64?: string;
      metadata?: Record<string, any>;
      transcript?: string;
      duration?: number;
    },
  ): Promise<MediaAuthenticityResult> {
    const startTime = Date.now();
    const prompt = this.buildMediaAnalysisPrompt(mediaData);

    try {
      const response = await this.fallbackStrategy.execute(prompt, {
        taskType: TaskType.DEEPFAKE_DETECTION,
        capability: ModelCapability.STANDARD,
        model: this.defaultModel,
        systemPrompt: this.systemPrompt,
        temperature: 0.3, // Low temperature for accurate analysis
        maxTokens: 4000,
      } as AIOptions);

      const result = this.parseMediaAnalysisResponse(response.content);

      // Add metadata
      result.metadata = {
        processingTime: Date.now() - startTime,
        model: response.model,
        provider: response.provider,
        analysisVersion: this.analysisVersion,
      };

      this.logger.debug('Media authenticity analysis completed', {
        type: mediaData.mediaType,
        authenticityScore: result.authenticityScore,
        deepfakeProbability: result.deepfakeProbability,
        verdict: result.verdict,
        provider: response.provider,
        model: response.model,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to analyze media authenticity', error);
      throw new Error('Media analysis failed: ' + error.message);
    }
  }

  /**
   * Analyze content quality and extract metrics
   */
  async analyzeContentQuality(
    content: {
      transcript: string;
      context?: string;
      referenceType?: string;
      expectedTopics?: string[];
    },
  ): Promise<ContentQualityMetrics> {
    const prompt = this.buildContentAnalysisPrompt(content);

    try {
      const response = await this.fallbackStrategy.execute(prompt, {
        taskType: TaskType.REFERENCE_ANALYSIS,
        capability: ModelCapability.STANDARD,
        model: this.defaultModel,
        systemPrompt: this.systemPrompt,
        temperature: 0.5,
        maxTokens: 3000,
      } as AIOptions);

      const metrics = this.parseContentQualityResponse(response.content);

      this.logger.debug('Content quality analysis completed', {
        overallQuality: metrics.overallQuality,
        sentiment: metrics.emotionalTone.sentiment,
        redFlagsCount: metrics.redFlags.length,
        provider: response.provider,
        model: response.model,
      });

      return metrics;
    } catch (error) {
      this.logger.error('Failed to analyze content quality', error);
      throw new Error('Content analysis failed: ' + error.message);
    }
  }

  /**
   * Cross-reference multiple references for consistency
   */
  async crossReferenceAnalysis(
    references: Array<{
      id: string;
      content: string;
      metadata?: Record<string, any>;
    }>,
  ): Promise<CrossReferenceResult> {
    const prompt = this.buildCrossReferencePrompt(references);

    try {
      const response = await this.fallbackStrategy.execute(prompt, {
        taskType: TaskType.DOCUMENT_ANALYSIS,
        capability: ModelCapability.STANDARD,
        model: this.defaultModel,
        systemPrompt: this.systemPrompt +
          '\nFocus on identifying patterns, consistency, and correlations across references.',
        temperature: 0.4,
        maxTokens: 5000,
      } as AIOptions);

      const result = this.parseCrossReferenceResponse(response.content);

      this.logger.debug('Cross-reference analysis completed', {
        consistencyScore: result.consistencyScore,
        referencesCount: references.length,
        commonThemesCount: result.commonThemes.length,
        outliersCount: result.outliers.length,
        provider: response.provider,
        model: response.model,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to cross-reference analysis', error);
      throw new Error('Cross-reference analysis failed: ' + error.message);
    }
  }

  /**
   * Perform comprehensive authenticity assessment
   */
  async comprehensiveAuthenticityCheck(
    data: {
      media?: Array<{ type: string; content: any }>;
      transcripts?: string[];
      references?: Array<{ id: string; content: string }>;
      metadata?: Record<string, any>;
    },
  ): Promise<{
    overallAuthenticityScore: number;
    mediaResults?: MediaAuthenticityResult[];
    contentMetrics?: ContentQualityMetrics[];
    crossReferenceResult?: CrossReferenceResult;
    finalAssessment: {
      isAuthentic: boolean;
      confidence: number;
      keyFindings: string[];
      recommendations: string[];
      riskLevel: 'low' | 'medium' | 'high';
    };
  }> {
    this.logger.log('Starting comprehensive authenticity check');

    const results: any = {
      overallAuthenticityScore: 0,
    };

    let scores: number[] = [];

    // Analyze media if provided
    if (data.media?.length) {
      results.mediaResults = await Promise.all(
        data.media.map(m => this.analyzeMediaAuthenticity({
          mediaType: m.type as any,
          ...m.content,
        })),
      );
      scores.push(...results.mediaResults.map(r => r.authenticityScore));
    }

    // Analyze content quality if transcripts provided
    if (data.transcripts?.length) {
      results.contentMetrics = await Promise.all(
        data.transcripts.map(t => this.analyzeContentQuality({ transcript: t })),
      );
      scores.push(...results.contentMetrics.map(r => r.overallQuality));
    }

    // Cross-reference analysis if multiple references
    if (data.references && data.references.length > 1) {
      results.crossReferenceResult = await this.crossReferenceAnalysis(data.references);
      scores.push(results.crossReferenceResult.consistencyScore);
    }

    // Calculate overall score
    results.overallAuthenticityScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    // Generate final assessment
    results.finalAssessment = this.generateFinalAssessment(results);

    return results;
  }

  /**
   * Build media analysis prompt
   */
  private buildMediaAnalysisPrompt(mediaData: any): string {
    return `
Perform comprehensive authenticity analysis on the provided media content.

Media Type: ${mediaData.mediaType}
${mediaData.duration ? `Duration: ${mediaData.duration} seconds` : ''}
${mediaData.transcript ? `Transcript Available: Yes` : ''}
${mediaData.metadata ? `Metadata: ${JSON.stringify(mediaData.metadata)}` : ''}
${mediaData.contentBase64 ? '[Media content provided in base64]' : '[Analyzing based on metadata]'}

Analyze for:

1. Overall Authenticity Score (0-100)
2. Deepfake Probability (0-100)

3. Detected Anomalies:
   - Visual artifacts or inconsistencies
   - Audio manipulation indicators
   - Behavioral unnaturalness
   - Temporal inconsistencies
   - For each: type, description, timestamp, confidence

4. Technical Analysis:
   - Compression artifacts (true/false)
   - Temporal inconsistencies (true/false)
   - Audio-video synchronization (true/false)
   - Facial micro-expressions naturalness (true/false)
   - Voice pattern consistency (true/false)

5. Confidence Factors (0-100 each):
   - Video quality
   - Audio quality
   - Lighting consistency
   - Background consistency

6. Final Verdict: authentic/likely_authentic/suspicious/likely_fake/fake

Provide detailed technical justification for your assessment.
Format the response as a structured JSON object.
    `.trim();
  }

  /**
   * Build content analysis prompt
   */
  private buildContentAnalysisPrompt(content: any): string {
    return `
Analyze the quality and authenticity markers in the following reference content.

Transcript:
${content.transcript}

${content.context ? `Context: ${content.context}` : ''}
${content.referenceType ? `Reference Type: ${content.referenceType}` : ''}
${content.expectedTopics ? `Expected Topics: ${content.expectedTopics.join(', ')}` : ''}

Evaluate:

1. Overall Quality Score (0-100)

2. Specific Metrics (0-100 each):
   - Clarity of communication
   - Relevance to role/context
   - Completeness of information
   - Professionalism
   - Presence of specific examples

3. Emotional Tone:
   - Sentiment (positive/neutral/negative/mixed)
   - Confidence level

4. Language Analysis:
   - Complexity level (simple/moderate/complex)
   - Consistency score
   - Authenticity markers (genuine language patterns)

5. Red Flags:
   - List any concerning elements
   - Vague or evasive language
   - Contradictions
   - Unusual patterns

6. Strengths:
   - Positive indicators
   - Strong examples
   - Clear communication

Format the response as a structured JSON object.
    `.trim();
  }

  /**
   * Build cross-reference prompt
   */
  private buildCrossReferencePrompt(references: any[]): string {
    const refsDescription = references.map((r, i) =>
      `Reference ${i + 1} (ID: ${r.id}): ${r.content.substring(0, 200)}...`
    ).join('\n');

    return `
Perform cross-reference analysis across multiple references.

References Provided:
${refsDescription}

Total References: ${references.length}

Analyze:

1. Overall Consistency Score (0-100)

2. Correlation Matrix:
   - For each reference pair: correlation score, matching points, discrepancies

3. Common Themes:
   - Identify recurring themes across references
   - Frequency and which references mention each theme

4. Outliers:
   - Identify references that deviate significantly
   - Deviation score and unusual elements

5. Aggregate Insights:
   - Common strengths mentioned
   - Common weaknesses mentioned
   - Points of consensus
   - Points of conflict

6. Overall Recommendation:
   - Summary assessment of reference consistency

Format the response as a structured JSON object.
    `.trim();
  }

  /**
   * Parse media analysis response
   */
  private parseMediaAnalysisResponse(content: string): MediaAuthenticityResult {
    try {
      const parsed = JSON.parse(content);
      return {
        authenticityScore: parsed.authenticityScore || 0,
        deepfakeProbability: parsed.deepfakeProbability || 100,
        analysisType: parsed.analysisType || 'combined',
        detectedAnomalies: parsed.detectedAnomalies || [],
        technicalAnalysis: parsed.technicalAnalysis || {
          compressionArtifacts: false,
          temporalInconsistencies: false,
          audioVideoSync: false,
          facialMicroExpressions: false,
          voicePattern: false,
        },
        confidenceFactors: parsed.confidenceFactors || {
          videoQuality: 0,
          audioQuality: 0,
          lightingConsistency: 0,
          backgroundConsistency: 0,
        },
        verdict: parsed.verdict || 'suspicious',
        metadata: {
          processingTime: 0,
          model: '',
          provider: '',
          analysisVersion: this.analysisVersion,
        },
      };
    } catch {
      return {
        authenticityScore: 0,
        deepfakeProbability: 100,
        analysisType: 'combined',
        detectedAnomalies: [{ type: 'parse_error', description: 'Failed to parse', confidence: 0 }],
        technicalAnalysis: {
          compressionArtifacts: true,
          temporalInconsistencies: true,
          audioVideoSync: false,
          facialMicroExpressions: false,
          voicePattern: false,
        },
        confidenceFactors: { videoQuality: 0, audioQuality: 0, lightingConsistency: 0, backgroundConsistency: 0 },
        verdict: 'suspicious',
        metadata: { processingTime: 0, model: '', provider: '', analysisVersion: this.analysisVersion },
      };
    }
  }

  /**
   * Parse content quality response
   */
  private parseContentQualityResponse(content: string): ContentQualityMetrics {
    try {
      const parsed = JSON.parse(content);
      return {
        overallQuality: parsed.overallQuality || 0,
        clarity: parsed.clarity || 0,
        relevance: parsed.relevance || 0,
        completeness: parsed.completeness || 0,
        professionalism: parsed.professionalism || 0,
        specificExamples: parsed.specificExamples || 0,
        emotionalTone: parsed.emotionalTone || { sentiment: 'neutral', confidence: 0 },
        languageAnalysis: parsed.languageAnalysis || {
          complexity: 'moderate',
          consistency: 0,
          authenticitMarkers: [],
        },
        redFlags: parsed.redFlags || [],
        strengths: parsed.strengths || [],
      };
    } catch {
      return {
        overallQuality: 0,
        clarity: 0,
        relevance: 0,
        completeness: 0,
        professionalism: 0,
        specificExamples: 0,
        emotionalTone: { sentiment: 'neutral', confidence: 0 },
        languageAnalysis: { complexity: 'simple', consistency: 0, authenticitMarkers: [] },
        redFlags: ['parse_error'],
        strengths: [],
      };
    }
  }

  /**
   * Parse cross-reference response
   */
  private parseCrossReferenceResponse(content: string): CrossReferenceResult {
    try {
      const parsed = JSON.parse(content);
      return {
        consistencyScore: parsed.consistencyScore || 0,
        correlationMatrix: parsed.correlationMatrix || [],
        commonThemes: parsed.commonThemes || [],
        outliers: parsed.outliers || [],
        aggregateInsights: parsed.aggregateInsights || {
          strengths: [],
          weaknesses: [],
          consensus: [],
          conflicts: [],
        },
        recommendation: parsed.recommendation || 'Further review needed',
      };
    } catch {
      return {
        consistencyScore: 0,
        correlationMatrix: [],
        commonThemes: [],
        outliers: [],
        aggregateInsights: { strengths: [], weaknesses: [], consensus: [], conflicts: [] },
        recommendation: 'Parse error - manual review required',
      };
    }
  }

  /**
   * Generate final assessment
   */
  private generateFinalAssessment(results: any) {
    const score = results.overallAuthenticityScore;
    const isAuthentic = score >= 75;
    const confidence = Math.min(100, Math.abs(score - 50) * 2); // Higher confidence at extremes

    const keyFindings = [];
    const recommendations = [];

    // Analyze media results
    if (results.mediaResults) {
      const avgDeepfake = results.mediaResults.reduce((sum, r) =>
        sum + r.deepfakeProbability, 0) / results.mediaResults.length;
      if (avgDeepfake > 30) {
        keyFindings.push(`Elevated deepfake probability detected (${Math.round(avgDeepfake)}%)`);
        recommendations.push('Request alternative verification methods');
      }
    }

    // Analyze content metrics
    if (results.contentMetrics) {
      const lowQuality = results.contentMetrics.filter(m => m.overallQuality < 60);
      if (lowQuality.length > 0) {
        keyFindings.push(`${lowQuality.length} reference(s) show low quality indicators`);
        recommendations.push('Follow up with specific clarifying questions');
      }
    }

    // Analyze cross-reference
    if (results.crossReferenceResult) {
      if (results.crossReferenceResult.outliers.length > 0) {
        keyFindings.push(`${results.crossReferenceResult.outliers.length} reference(s) show significant deviation`);
        recommendations.push('Investigate outlier references individually');
      }
    }

    const riskLevel = score >= 75 ? 'low' : score >= 50 ? 'medium' : 'high';

    return {
      isAuthentic,
      confidence: Math.round(confidence),
      keyFindings: keyFindings.length > 0 ? keyFindings : ['All checks within normal parameters'],
      recommendations: recommendations.length > 0 ? recommendations : ['Proceed with standard process'],
      riskLevel,
    };
  }
}