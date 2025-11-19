import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FallbackStrategy } from '../strategies/fallback.strategy';
import { TaskType, ModelCapability, AIOptions } from '../providers/base.provider';
import { ANTHROPIC_MODELS } from '../providers/anthropic.provider';

/**
 * Reference analysis result
 */
export interface ReferenceAnalysis {
  suggestedReferrers: Array<{
    name: string;
    role: string;
    relationship: string;
    relevance: number; // 0-100
    reasoning: string;
  }>;
  keyStrengths: string[];
  potentialConcerns: string[];
  recommendations: string[];
}

/**
 * Question generation result
 */
export interface GeneratedQuestions {
  questions: Array<{
    question: string;
    category: string;
    purpose: string;
    expectedInsights: string[];
  }>;
  followUpSuggestions: string[];
  redFlags: string[];
}

/**
 * Coaching interaction result
 */
export interface CoachingResponse {
  advice: string;
  tips: string[];
  suggestedMessages: Array<{
    scenario: string;
    message: string;
  }>;
  warningFlags: string[];
}

/**
 * Reference Coach Service
 * Uses Claude Sonnet 4.5 for balanced performance and quality
 */
@Injectable()
export class ReferenceCoachService {
  private readonly logger = new Logger(ReferenceCoachService.name);
  private readonly systemPrompt: string;
  private readonly defaultModel = ANTHROPIC_MODELS.SONNET_4_5;

  constructor(
    private configService: ConfigService,
    private fallbackStrategy: FallbackStrategy,
  ) {
    this.systemPrompt = this.configService.get<string>(
      'aiModels.systemPrompts.referenceCoach',
      'You are an expert career coach specializing in professional references. ' +
      'Help candidates prepare for reference checks by providing guidance and generating relevant questions.',
    );
  }

  /**
   * Analyze candidate profile and suggest optimal referrers
   */
  async analyzeProfile(
    resume: string,
    targetRole?: string,
  ): Promise<ReferenceAnalysis> {
    const prompt = this.buildAnalysisPrompt(resume, targetRole);

    try {
      const response = await this.fallbackStrategy.execute(prompt, {
        taskType: TaskType.REFERENCE_ANALYSIS,
        capability: ModelCapability.STANDARD,
        model: this.defaultModel,
        systemPrompt: this.systemPrompt,
        temperature: 0.7,
        maxTokens: 3000,
      } as AIOptions);

      const analysis = this.parseAnalysisResponse(response.content);

      this.logger.debug('Profile analysis completed', {
        suggestedCount: analysis.suggestedReferrers.length,
        provider: response.provider,
        model: response.model,
      });

      return analysis;
    } catch (error) {
      this.logger.error('Failed to analyze profile', error);
      throw new Error('Profile analysis failed: ' + error.message);
    }
  }

  /**
   * Generate reference check questions based on job description
   */
  async generateQuestions(
    jobDescription: string,
    role: string,
    candidateContext?: string,
  ): Promise<GeneratedQuestions> {
    const prompt = this.buildQuestionsPrompt(jobDescription, role, candidateContext);

    try {
      const response = await this.fallbackStrategy.execute(prompt, {
        taskType: TaskType.QUESTION_GENERATION,
        capability: ModelCapability.STANDARD,
        model: this.defaultModel,
        systemPrompt: this.systemPrompt,
        temperature: 0.8,
        maxTokens: 2500,
      } as AIOptions);

      const questions = this.parseQuestionsResponse(response.content);

      this.logger.debug('Questions generated', {
        questionCount: questions.questions.length,
        provider: response.provider,
        model: response.model,
      });

      return questions;
    } catch (error) {
      this.logger.error('Failed to generate questions', error);
      throw new Error('Question generation failed: ' + error.message);
    }
  }

  /**
   * Provide coaching for reference interaction
   */
  async coachInteraction(
    context: {
      candidateBackground: string;
      referrerRelationship: string;
      challengingSituation?: string;
    },
  ): Promise<CoachingResponse> {
    const prompt = this.buildCoachingPrompt(context);

    try {
      const response = await this.fallbackStrategy.execute(prompt, {
        taskType: TaskType.REFERENCE_ANALYSIS,
        capability: ModelCapability.STANDARD,
        model: this.defaultModel,
        systemPrompt: this.systemPrompt,
        temperature: 0.7,
        maxTokens: 2000,
      } as AIOptions);

      const coaching = this.parseCoachingResponse(response.content);

      this.logger.debug('Coaching response generated', {
        tipsCount: coaching.tips.length,
        provider: response.provider,
        model: response.model,
      });

      return coaching;
    } catch (error) {
      this.logger.error('Failed to generate coaching response', error);
      throw new Error('Coaching generation failed: ' + error.message);
    }
  }

  /**
   * Stream coaching advice in real-time
   */
  async *streamCoachingAdvice(
    question: string,
    context?: string,
  ): AsyncGenerator<string> {
    const prompt = `User Question: ${question}\n\nContext: ${context || 'General reference preparation'}`;

    try {
      const generator = this.fallbackStrategy.executeStream(prompt, {
        taskType: TaskType.REAL_TIME_CHAT,
        capability: ModelCapability.SIMPLE,
        systemPrompt: this.systemPrompt,
        temperature: 0.7,
        maxTokens: 1000,
      } as AIOptions);

      for await (const chunk of generator) {
        yield chunk;
      }
    } catch (error) {
      this.logger.error('Failed to stream coaching advice', error);
      throw new Error('Streaming failed: ' + error.message);
    }
  }

  /**
   * Build prompt for profile analysis
   */
  private buildAnalysisPrompt(resume: string, targetRole?: string): string {
    return `
Analyze the following resume and suggest the most appropriate professional references.

Resume:
${resume}

${targetRole ? `Target Role: ${targetRole}` : ''}

Please provide:
1. A list of 3-5 suggested referrers based on the work history, including:
   - Name/Title (if mentioned) or suggested role type
   - Their relationship to the candidate
   - Why they would be a strong reference
   - Relevance score (0-100)

2. Key strengths evident from the resume

3. Potential concerns or gaps that references should address

4. Specific recommendations for the candidate

Format the response as a structured JSON object.
    `.trim();
  }

  /**
   * Build prompt for question generation
   */
  private buildQuestionsPrompt(
    jobDescription: string,
    role: string,
    candidateContext?: string,
  ): string {
    return `
Generate insightful reference check questions for the following position:

Role: ${role}

Job Description:
${jobDescription}

${candidateContext ? `Candidate Context: ${candidateContext}` : ''}

Please provide:
1. 8-10 targeted questions that will reveal:
   - Technical competencies
   - Soft skills and collaboration
   - Work ethic and reliability
   - Leadership/growth potential
   - Cultural fit

2. For each question, specify:
   - The question text
   - Category (Technical, Behavioral, Situational, etc.)
   - Purpose of the question
   - Expected insights

3. Follow-up question suggestions

4. Red flags to watch for in responses

Format the response as a structured JSON object.
    `.trim();
  }

  /**
   * Build prompt for coaching interaction
   */
  private buildCoachingPrompt(context: any): string {
    return `
Provide coaching advice for a candidate preparing their referrer for a reference check.

Candidate Background: ${context.candidateBackground}
Referrer Relationship: ${context.referrerRelationship}
${context.challengingSituation ? `Challenging Situation to Address: ${context.challengingSituation}` : ''}

Please provide:
1. Strategic advice for the candidate

2. Specific tips for preparing the referrer (5-7 actionable tips)

3. Suggested message templates for different scenarios:
   - Initial request
   - Providing context about the role
   - Addressing potential concerns
   - Thank you message

4. Warning flags to avoid when coaching referrers

Format the response as a structured JSON object.
    `.trim();
  }

  /**
   * Parse analysis response
   */
  private parseAnalysisResponse(content: string): ReferenceAnalysis {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(content);
      return {
        suggestedReferrers: parsed.suggestedReferrers || [],
        keyStrengths: parsed.keyStrengths || [],
        potentialConcerns: parsed.potentialConcerns || [],
        recommendations: parsed.recommendations || [],
      };
    } catch {
      // Fallback to text parsing
      return {
        suggestedReferrers: [],
        keyStrengths: [content.substring(0, 100)],
        potentialConcerns: [],
        recommendations: ['Please review the full analysis above'],
      };
    }
  }

  /**
   * Parse questions response
   */
  private parseQuestionsResponse(content: string): GeneratedQuestions {
    try {
      const parsed = JSON.parse(content);
      return {
        questions: parsed.questions || [],
        followUpSuggestions: parsed.followUpSuggestions || [],
        redFlags: parsed.redFlags || [],
      };
    } catch {
      // Fallback parsing
      return {
        questions: [
          {
            question: 'How would you describe their work performance?',
            category: 'General',
            purpose: 'Overall assessment',
            expectedInsights: ['Performance level'],
          },
        ],
        followUpSuggestions: [],
        redFlags: [],
      };
    }
  }

  /**
   * Parse coaching response
   */
  private parseCoachingResponse(content: string): CoachingResponse {
    try {
      const parsed = JSON.parse(content);
      return {
        advice: parsed.advice || '',
        tips: parsed.tips || [],
        suggestedMessages: parsed.suggestedMessages || [],
        warningFlags: parsed.warningFlags || [],
      };
    } catch {
      // Fallback parsing
      return {
        advice: content.substring(0, 200),
        tips: ['Review the full coaching advice above'],
        suggestedMessages: [],
        warningFlags: [],
      };
    }
  }
}