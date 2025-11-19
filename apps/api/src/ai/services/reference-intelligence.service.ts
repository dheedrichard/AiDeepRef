import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FallbackStrategy } from '../strategies/fallback.strategy';
import { TaskType, ModelCapability, AIOptions } from '../providers/base.provider';
import { ANTHROPIC_MODELS } from '../providers/anthropic.provider';

/**
 * Transcription result with timestamps
 */
export interface TranscriptionResult {
  fullText: string;
  segments: Array<{
    text: string;
    startTime: number;
    endTime: number;
    speaker?: string;
    confidence: number;
  }>;
  speakers: Array<{
    id: string;
    label: string;
    totalSpeakingTime: number;
  }>;
  metadata: {
    duration: number;
    wordCount: number;
    language: string;
    audioQuality: 'poor' | 'fair' | 'good' | 'excellent';
  };
}

/**
 * NLP analysis insights
 */
export interface NLPInsights {
  sentiment: {
    overall: 'positive' | 'neutral' | 'negative' | 'mixed';
    score: number; // -1 to 1
    progression: Array<{
      timestamp: number;
      sentiment: string;
      score: number;
    }>;
  };
  keyTopics: Array<{
    topic: string;
    relevance: number;
    mentions: number;
    context: string[];
  }>;
  entities: Array<{
    text: string;
    type: 'person' | 'organization' | 'location' | 'skill' | 'project';
    confidence: number;
    frequency: number;
  }>;
  competencies: Array<{
    competency: string;
    evidence: string[];
    strength: 'weak' | 'moderate' | 'strong';
    confidence: number;
  }>;
  behavioralIndicators: Array<{
    trait: string;
    indicators: string[];
    assessment: string;
  }>;
  language: {
    formality: 'informal' | 'semi-formal' | 'formal';
    clarity: number; // 0-100
    specificity: number; // 0-100
    consistency: number; // 0-100
  };
}

/**
 * Reference quality assessment
 */
export interface ReferenceQualityScore {
  overallScore: number; // 0-100
  dimensions: {
    depth: number;       // How detailed and thorough
    specificity: number; // Concrete examples vs generalities
    authenticity: number; // Natural vs scripted
    relevance: number;   // Alignment with role requirements
    balance: number;     // Fair assessment (not all positive/negative)
    credibility: number; // Referrer credibility indicators
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  flags: Array<{
    type: 'positive' | 'warning' | 'critical';
    description: string;
    impact: 'low' | 'medium' | 'high';
  }>;
  summary: string;
}

/**
 * Comprehensive reference report
 */
export interface ReferenceIntelligenceReport {
  transcription: TranscriptionResult;
  insights: NLPInsights;
  qualityScore: ReferenceQualityScore;
  keyFindings: Array<{
    finding: string;
    importance: 'low' | 'medium' | 'high' | 'critical';
    evidence: string[];
  }>;
  actionableInsights: Array<{
    insight: string;
    recommendation: string;
    priority: number;
  }>;
  comparativeAnalysis?: {
    comparedTo: string; // e.g., "industry standards", "role requirements"
    alignment: number; // 0-100
    gaps: string[];
    strengths: string[];
  };
}

/**
 * Reference Intelligence Engine Service
 * Uses Claude Sonnet 4.5 for comprehensive reference analysis
 */
@Injectable()
export class ReferenceIntelligenceService {
  private readonly logger = new Logger(ReferenceIntelligenceService.name);
  private readonly systemPrompt: string;
  private readonly defaultModel = ANTHROPIC_MODELS.SONNET_4_5;

  constructor(
    private configService: ConfigService,
    private fallbackStrategy: FallbackStrategy,
  ) {
    this.systemPrompt = this.configService.get<string>(
      'aiModels.systemPrompts.referenceIntelligence',
      'You are a reference analysis expert. Extract insights from reference interviews and assess quality. ' +
      'Focus on identifying specific examples, competencies, and potential concerns. ' +
      'Provide actionable intelligence for hiring decisions.',
    );
  }

  /**
   * Transcribe audio with timestamps and speaker diarization
   */
  async transcribeAudio(
    audioData: {
      audioBase64?: string;
      audioUrl?: string;
      format?: string;
      duration?: number;
    },
  ): Promise<TranscriptionResult> {
    const prompt = this.buildTranscriptionPrompt(audioData);

    try {
      const response = await this.fallbackStrategy.execute(prompt, {
        taskType: TaskType.DOCUMENT_ANALYSIS,
        capability: ModelCapability.STANDARD,
        model: this.defaultModel,
        systemPrompt: 'You are an expert transcriptionist. Provide accurate transcription with speaker identification and timestamps.',
        temperature: 0.3,
        maxTokens: 8000,
      } as AIOptions);

      const transcription = this.parseTranscriptionResponse(response.content);

      this.logger.debug('Audio transcription completed', {
        duration: transcription.metadata.duration,
        wordCount: transcription.metadata.wordCount,
        speakers: transcription.speakers.length,
        provider: response.provider,
        model: response.model,
      });

      return transcription;
    } catch (error) {
      this.logger.error('Failed to transcribe audio', error);
      throw new Error('Transcription failed: ' + error.message);
    }
  }

  /**
   * Perform NLP analysis on reference text
   */
  async analyzeReferenceNLP(
    text: string,
    context?: {
      roleDescription?: string;
      requiredSkills?: string[];
      candidateName?: string;
    },
  ): Promise<NLPInsights> {
    const prompt = this.buildNLPAnalysisPrompt(text, context);

    try {
      const response = await this.fallbackStrategy.execute(prompt, {
        taskType: TaskType.REFERENCE_ANALYSIS,
        capability: ModelCapability.STANDARD,
        model: this.defaultModel,
        systemPrompt: this.systemPrompt,
        temperature: 0.5,
        maxTokens: 4000,
      } as AIOptions);

      const insights = this.parseNLPInsights(response.content);

      this.logger.debug('NLP analysis completed', {
        sentiment: insights.sentiment.overall,
        topicsCount: insights.keyTopics.length,
        competenciesCount: insights.competencies.length,
        provider: response.provider,
        model: response.model,
      });

      return insights;
    } catch (error) {
      this.logger.error('Failed to analyze reference NLP', error);
      throw new Error('NLP analysis failed: ' + error.message);
    }
  }

  /**
   * Assess reference quality
   */
  async assessReferenceQuality(
    referenceData: {
      text: string;
      duration?: number;
      referrerRole?: string;
      candidateRole?: string;
      referenceType?: 'professional' | 'personal' | 'academic';
    },
  ): Promise<ReferenceQualityScore> {
    const prompt = this.buildQualityAssessmentPrompt(referenceData);

    try {
      const response = await this.fallbackStrategy.execute(prompt, {
        taskType: TaskType.REFERENCE_ANALYSIS,
        capability: ModelCapability.STANDARD,
        model: this.defaultModel,
        systemPrompt: this.systemPrompt,
        temperature: 0.4,
        maxTokens: 3000,
      } as AIOptions);

      const qualityScore = this.parseQualityScore(response.content);

      this.logger.debug('Quality assessment completed', {
        overallScore: qualityScore.overallScore,
        flagsCount: qualityScore.flags.length,
        provider: response.provider,
        model: response.model,
      });

      return qualityScore;
    } catch (error) {
      this.logger.error('Failed to assess reference quality', error);
      throw new Error('Quality assessment failed: ' + error.message);
    }
  }

  /**
   * Generate comprehensive intelligence report
   */
  async generateIntelligenceReport(
    data: {
      audioBase64?: string;
      transcript?: string;
      roleContext?: {
        title: string;
        description: string;
        requiredSkills: string[];
      };
      referrerInfo?: {
        name: string;
        role: string;
        relationship: string;
      };
    },
  ): Promise<ReferenceIntelligenceReport> {
    this.logger.log('Generating comprehensive intelligence report');

    // Step 1: Get transcript (either provided or transcribe)
    let transcription: TranscriptionResult;
    if (data.transcript) {
      transcription = {
        fullText: data.transcript,
        segments: [{ text: data.transcript, startTime: 0, endTime: 0, confidence: 1 }],
        speakers: [],
        metadata: {
          duration: 0,
          wordCount: data.transcript.split(' ').length,
          language: 'en',
          audioQuality: 'good',
        },
      };
    } else if (data.audioBase64) {
      transcription = await this.transcribeAudio({ audioBase64: data.audioBase64 });
    } else {
      throw new Error('Either transcript or audio must be provided');
    }

    // Step 2: NLP Analysis
    const insights = await this.analyzeReferenceNLP(transcription.fullText, {
      roleDescription: data.roleContext?.description,
      requiredSkills: data.roleContext?.requiredSkills,
    });

    // Step 3: Quality Assessment
    const qualityScore = await this.assessReferenceQuality({
      text: transcription.fullText,
      duration: transcription.metadata.duration,
      referrerRole: data.referrerInfo?.role,
      candidateRole: data.roleContext?.title,
    });

    // Step 4: Extract key findings
    const keyFindings = this.extractKeyFindings(insights, qualityScore);

    // Step 5: Generate actionable insights
    const actionableInsights = this.generateActionableInsights(insights, qualityScore);

    // Step 6: Comparative analysis if context provided
    let comparativeAnalysis;
    if (data.roleContext) {
      comparativeAnalysis = this.performComparativeAnalysis(
        insights,
        data.roleContext.requiredSkills,
      );
    }

    return {
      transcription,
      insights,
      qualityScore,
      keyFindings,
      actionableInsights,
      comparativeAnalysis,
    };
  }

  /**
   * Stream real-time analysis
   */
  async *streamAnalysis(
    text: string,
    analysisType: 'sentiment' | 'competencies' | 'summary',
  ): AsyncGenerator<string> {
    const prompt = `Analyze the following reference text for ${analysisType}:\n\n${text}`;

    try {
      const generator = this.fallbackStrategy.executeStream(prompt, {
        taskType: TaskType.REFERENCE_ANALYSIS,
        capability: ModelCapability.SIMPLE,
        systemPrompt: this.systemPrompt,
        temperature: 0.5,
        maxTokens: 1500,
      } as AIOptions);

      for await (const chunk of generator) {
        yield chunk;
      }
    } catch (error) {
      this.logger.error('Failed to stream analysis', error);
      throw new Error('Streaming analysis failed: ' + error.message);
    }
  }

  /**
   * Build transcription prompt
   */
  private buildTranscriptionPrompt(audioData: any): string {
    return `
Transcribe the following audio content with detailed analysis.

${audioData.audioBase64 ? '[Audio provided in base64 format]' : ''}
${audioData.audioUrl ? `Audio URL: ${audioData.audioUrl}` : ''}
${audioData.duration ? `Duration: ${audioData.duration} seconds` : ''}

Provide:

1. Full transcription text

2. Segmented transcription with:
   - Text segments
   - Start and end timestamps
   - Speaker identification (if multiple speakers)
   - Confidence scores

3. Speaker analysis:
   - Identified speakers
   - Speaking time for each

4. Metadata:
   - Total duration
   - Word count
   - Language detected
   - Audio quality assessment

Format the response as a structured JSON object.
    `.trim();
  }

  /**
   * Build NLP analysis prompt
   */
  private buildNLPAnalysisPrompt(text: string, context?: any): string {
    return `
Perform comprehensive NLP analysis on this reference interview.

Reference Text:
${text}

${context?.roleDescription ? `Role Description: ${context.roleDescription}` : ''}
${context?.requiredSkills ? `Required Skills: ${context.requiredSkills.join(', ')}` : ''}

Analyze:

1. Sentiment Analysis:
   - Overall sentiment (positive/neutral/negative/mixed)
   - Sentiment score (-1 to 1)
   - Sentiment progression over time

2. Key Topics:
   - Main topics discussed
   - Relevance to role (0-100)
   - Frequency of mentions
   - Context snippets

3. Entity Recognition:
   - People, organizations, locations mentioned
   - Skills and technologies
   - Projects and achievements

4. Competency Extraction:
   - Identified competencies
   - Supporting evidence
   - Strength assessment (weak/moderate/strong)

5. Behavioral Indicators:
   - Leadership traits
   - Team collaboration
   - Problem-solving approach
   - Work ethic indicators

6. Language Analysis:
   - Formality level
   - Clarity (0-100)
   - Specificity (0-100)
   - Consistency (0-100)

Format the response as a structured JSON object.
    `.trim();
  }

  /**
   * Build quality assessment prompt
   */
  private buildQualityAssessmentPrompt(referenceData: any): string {
    return `
Assess the quality of this professional reference.

Reference Content:
${referenceData.text}

${referenceData.referrerRole ? `Referrer Role: ${referenceData.referrerRole}` : ''}
${referenceData.candidateRole ? `Candidate Role: ${referenceData.candidateRole}` : ''}
${referenceData.referenceType ? `Reference Type: ${referenceData.referenceType}` : ''}

Evaluate:

1. Overall Quality Score (0-100)

2. Dimensional Scores (0-100 each):
   - Depth: How detailed and thorough
   - Specificity: Concrete examples vs generalities
   - Authenticity: Natural vs scripted
   - Relevance: Alignment with role requirements
   - Balance: Fair assessment (not all positive/negative)
   - Credibility: Referrer credibility indicators

3. Strengths:
   - List positive aspects of the reference

4. Weaknesses:
   - List areas needing improvement

5. Flags:
   - Positive indicators
   - Warning signs
   - Critical concerns
   - For each: type, description, impact level

6. Summary:
   - Brief overall assessment

Format the response as a structured JSON object.
    `.trim();
  }

  /**
   * Parse transcription response
   */
  private parseTranscriptionResponse(content: string): TranscriptionResult {
    try {
      const parsed = JSON.parse(content);
      return {
        fullText: parsed.fullText || '',
        segments: parsed.segments || [],
        speakers: parsed.speakers || [],
        metadata: parsed.metadata || {
          duration: 0,
          wordCount: 0,
          language: 'en',
          audioQuality: 'fair',
        },
      };
    } catch {
      return {
        fullText: content,
        segments: [{ text: content, startTime: 0, endTime: 0, confidence: 0.5 }],
        speakers: [],
        metadata: { duration: 0, wordCount: content.split(' ').length, language: 'en', audioQuality: 'poor' },
      };
    }
  }

  /**
   * Parse NLP insights
   */
  private parseNLPInsights(content: string): NLPInsights {
    try {
      const parsed = JSON.parse(content);
      return {
        sentiment: parsed.sentiment || { overall: 'neutral', score: 0, progression: [] },
        keyTopics: parsed.keyTopics || [],
        entities: parsed.entities || [],
        competencies: parsed.competencies || [],
        behavioralIndicators: parsed.behavioralIndicators || [],
        language: parsed.language || {
          formality: 'semi-formal',
          clarity: 50,
          specificity: 50,
          consistency: 50,
        },
      };
    } catch {
      return {
        sentiment: { overall: 'neutral', score: 0, progression: [] },
        keyTopics: [],
        entities: [],
        competencies: [],
        behavioralIndicators: [],
        language: { formality: 'semi-formal', clarity: 0, specificity: 0, consistency: 0 },
      };
    }
  }

  /**
   * Parse quality score
   */
  private parseQualityScore(content: string): ReferenceQualityScore {
    try {
      const parsed = JSON.parse(content);
      return {
        overallScore: parsed.overallScore || 0,
        dimensions: parsed.dimensions || {
          depth: 0,
          specificity: 0,
          authenticity: 0,
          relevance: 0,
          balance: 0,
          credibility: 0,
        },
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        recommendations: parsed.recommendations || [],
        flags: parsed.flags || [],
        summary: parsed.summary || 'Unable to assess',
      };
    } catch {
      return {
        overallScore: 0,
        dimensions: { depth: 0, specificity: 0, authenticity: 0, relevance: 0, balance: 0, credibility: 0 },
        strengths: [],
        weaknesses: ['Parse error'],
        recommendations: ['Manual review required'],
        flags: [{ type: 'critical', description: 'Parse error', impact: 'high' }],
        summary: 'Parse error - manual review required',
      };
    }
  }

  /**
   * Extract key findings
   */
  private extractKeyFindings(insights: NLPInsights, qualityScore: ReferenceQualityScore) {
    const findings = [];

    // Strong competencies
    const strongCompetencies = insights.competencies.filter(c => c.strength === 'strong');
    if (strongCompetencies.length > 0) {
      findings.push({
        finding: `Strong competencies identified: ${strongCompetencies.map(c => c.competency).join(', ')}`,
        importance: 'high' as const,
        evidence: strongCompetencies.flatMap(c => c.evidence),
      });
    }

    // Quality concerns
    if (qualityScore.overallScore < 60) {
      findings.push({
        finding: `Reference quality below threshold (${qualityScore.overallScore}/100)`,
        importance: 'high' as const,
        evidence: qualityScore.weaknesses,
      });
    }

    // Sentiment issues
    if (insights.sentiment.overall === 'negative' || insights.sentiment.score < -0.3) {
      findings.push({
        finding: 'Negative sentiment detected in reference',
        importance: 'critical' as const,
        evidence: [`Sentiment score: ${insights.sentiment.score}`],
      });
    }

    return findings;
  }

  /**
   * Generate actionable insights
   */
  private generateActionableInsights(insights: NLPInsights, qualityScore: ReferenceQualityScore) {
    const actionableInsights = [];

    // Based on competencies
    const weakCompetencies = insights.competencies.filter(c => c.strength === 'weak');
    if (weakCompetencies.length > 0) {
      actionableInsights.push({
        insight: `Weak areas identified: ${weakCompetencies.map(c => c.competency).join(', ')}`,
        recommendation: 'Probe these areas in follow-up interviews or with additional references',
        priority: 1,
      });
    }

    // Based on quality
    if (qualityScore.dimensions.specificity < 50) {
      actionableInsights.push({
        insight: 'Reference lacks specific examples',
        recommendation: 'Request concrete examples from referrer or seek additional references',
        priority: 2,
      });
    }

    return actionableInsights;
  }

  /**
   * Perform comparative analysis
   */
  private performComparativeAnalysis(insights: NLPInsights, requiredSkills: string[]) {
    const mentionedSkills = insights.entities
      .filter(e => e.type === 'skill')
      .map(e => e.text.toLowerCase());

    const matchedSkills = requiredSkills.filter(skill =>
      mentionedSkills.some(ms => ms.includes(skill.toLowerCase())),
    );

    const alignment = (matchedSkills.length / requiredSkills.length) * 100;

    return {
      comparedTo: 'role requirements',
      alignment: Math.round(alignment),
      gaps: requiredSkills.filter(skill =>
        !mentionedSkills.some(ms => ms.includes(skill.toLowerCase())),
      ),
      strengths: matchedSkills,
    };
  }
}