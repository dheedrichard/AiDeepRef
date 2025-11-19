import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FallbackStrategy } from '../strategies/fallback.strategy';
import { TaskType, ModelCapability, AIOptions } from '../providers/base.provider';
import { ANTHROPIC_MODELS } from '../providers/anthropic.provider';

/**
 * Document verification result
 */
export interface DocumentVerificationResult {
  documentType: string;
  isAuthentic: boolean;
  confidenceScore: number; // 0-100
  extractedData: Record<string, any>;
  securityFeatures: Array<{
    feature: string;
    detected: boolean;
    confidence: number;
  }>;
  anomalies: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  metadata: {
    processingTime: number;
    model: string;
    provider: string;
  };
}

/**
 * Biometric verification result
 */
export interface BiometricVerificationResult {
  biometricScore: number; // 0-100
  livenessCheck: {
    passed: boolean;
    confidence: number;
    challenges: string[];
  };
  facialAnalysis?: {
    matchScore: number;
    landmarks: Record<string, any>;
    quality: number;
  };
  voiceAnalysis?: {
    matchScore: number;
    characteristics: Record<string, any>;
    quality: number;
  };
  riskFactors: string[];
  recommendation: 'accept' | 'review' | 'reject';
}

/**
 * Consistency check result
 */
export interface ConsistencyCheckResult {
  overallScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  consistencyChecks: Array<{
    checkType: string;
    passed: boolean;
    details: string;
    confidence: number;
  }>;
  discrepancies: Array<{
    field: string;
    expected: string;
    found: string;
    severity: number;
  }>;
  recommendations: string[];
  requiresManualReview: boolean;
}

/**
 * Verification Orchestrator Service
 * Uses Claude Opus 4.1 for complex verification and reasoning tasks
 */
@Injectable()
export class VerificationOrchestratorService {
  private readonly logger = new Logger(VerificationOrchestratorService.name);
  private readonly systemPrompt: string;
  private readonly defaultModel = ANTHROPIC_MODELS.OPUS_4_1;

  constructor(
    private configService: ConfigService,
    private fallbackStrategy: FallbackStrategy,
  ) {
    this.systemPrompt = this.configService.get<string>(
      'aiModels.systemPrompts.verificationOrchestrator',
      'You are a verification specialist focused on document authenticity and identity verification. ' +
      'Analyze documents and biometric data to ensure authenticity and detect potential fraud. ' +
      'Provide detailed analysis with confidence scores and specific observations.',
    );
  }

  /**
   * Verify document authenticity (ID, passport, etc.)
   */
  async verifyDocument(
    documentData: {
      imageBase64?: string;
      documentType: string;
      metadata?: Record<string, any>;
    },
  ): Promise<DocumentVerificationResult> {
    const startTime = Date.now();
    const prompt = this.buildDocumentVerificationPrompt(documentData);

    try {
      const response = await this.fallbackStrategy.execute(prompt, {
        taskType: TaskType.DOCUMENT_ANALYSIS,
        capability: ModelCapability.COMPLEX,
        model: this.defaultModel,
        systemPrompt: this.systemPrompt,
        temperature: 0.3, // Lower temperature for accuracy
        maxTokens: 5000,
      } as AIOptions);

      const result = this.parseDocumentVerificationResponse(response.content);

      // Add metadata
      result.metadata = {
        processingTime: Date.now() - startTime,
        model: response.model,
        provider: response.provider,
      };

      this.logger.debug('Document verification completed', {
        documentType: result.documentType,
        isAuthentic: result.isAuthentic,
        confidence: result.confidenceScore,
        provider: response.provider,
        model: response.model,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to verify document', error);
      throw new Error('Document verification failed: ' + error.message);
    }
  }

  /**
   * Perform biometric verification (selfie, voice)
   */
  async verifyBiometric(
    biometricData: {
      selfieBase64?: string;
      voiceBase64?: string;
      referenceData?: Record<string, any>;
      challengeType?: 'passive' | 'active';
    },
  ): Promise<BiometricVerificationResult> {
    const prompt = this.buildBiometricVerificationPrompt(biometricData);

    try {
      const response = await this.fallbackStrategy.execute(prompt, {
        taskType: TaskType.DEEPFAKE_DETECTION,
        capability: ModelCapability.COMPLEX,
        model: this.defaultModel,
        systemPrompt: this.systemPrompt,
        temperature: 0.2, // Very low for precise analysis
        maxTokens: 4000,
      } as AIOptions);

      const result = this.parseBiometricVerificationResponse(response.content);

      this.logger.debug('Biometric verification completed', {
        score: result.biometricScore,
        livenessCheck: result.livenessCheck.passed,
        recommendation: result.recommendation,
        provider: response.provider,
        model: response.model,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to verify biometric', error);
      throw new Error('Biometric verification failed: ' + error.message);
    }
  }

  /**
   * Check consistency across multiple data points
   */
  async checkConsistency(
    data: {
      documents: Array<{ type: string; content: any }>;
      biometrics?: Array<{ type: string; content: any }>;
      applicationData?: Record<string, any>;
      historicalData?: Array<Record<string, any>>;
    },
  ): Promise<ConsistencyCheckResult> {
    const prompt = this.buildConsistencyCheckPrompt(data);

    try {
      const response = await this.fallbackStrategy.execute(prompt, {
        taskType: TaskType.DOCUMENT_ANALYSIS,
        capability: ModelCapability.COMPLEX,
        model: this.defaultModel,
        systemPrompt: this.systemPrompt +
          '\nFocus on identifying inconsistencies, anomalies, and potential fraud indicators.',
        temperature: 0.3,
        maxTokens: 6000,
      } as AIOptions);

      const result = this.parseConsistencyCheckResponse(response.content);

      this.logger.debug('Consistency check completed', {
        overallScore: result.overallScore,
        riskLevel: result.riskLevel,
        discrepanciesCount: result.discrepancies.length,
        requiresReview: result.requiresManualReview,
        provider: response.provider,
        model: response.model,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to check consistency', error);
      throw new Error('Consistency check failed: ' + error.message);
    }
  }

  /**
   * Orchestrate full verification workflow
   */
  async orchestrateFullVerification(
    verificationRequest: {
      documents: Array<{ type: string; data: any }>;
      biometrics?: Array<{ type: string; data: any }>;
      applicationData?: Record<string, any>;
    },
  ): Promise<{
    documentResults: DocumentVerificationResult[];
    biometricResult?: BiometricVerificationResult;
    consistencyResult: ConsistencyCheckResult;
    finalDecision: {
      approved: boolean;
      confidence: number;
      reasons: string[];
      nextSteps: string[];
    };
  }> {
    this.logger.log('Starting full verification orchestration');

    // Verify all documents
    const documentResults = await Promise.all(
      verificationRequest.documents.map(doc =>
        this.verifyDocument({
          documentType: doc.type,
          ...doc.data,
        }),
      ),
    );

    // Verify biometrics if provided
    let biometricResult: BiometricVerificationResult | undefined;
    if (verificationRequest.biometrics?.length) {
      biometricResult = await this.verifyBiometric(
        verificationRequest.biometrics[0].data,
      );
    }

    // Check consistency across all data
    const consistencyResult = await this.checkConsistency({
      documents: verificationRequest.documents,
      biometrics: verificationRequest.biometrics,
      applicationData: verificationRequest.applicationData,
    });

    // Make final decision
    const finalDecision = this.makeFinalDecision(
      documentResults,
      biometricResult,
      consistencyResult,
    );

    return {
      documentResults,
      biometricResult,
      consistencyResult,
      finalDecision,
    };
  }

  /**
   * Build document verification prompt
   */
  private buildDocumentVerificationPrompt(documentData: any): string {
    return `
Analyze the following document for authenticity and extract relevant information.

Document Type: ${documentData.documentType}
${documentData.metadata ? `Metadata: ${JSON.stringify(documentData.metadata)}` : ''}
${documentData.imageBase64 ? '[Document image provided in base64 format]' : '[No image provided - analyze based on metadata]'}

Please provide a comprehensive verification analysis including:

1. Document Authentication:
   - Is the document authentic? (true/false)
   - Confidence score (0-100)
   - Document type confirmation

2. Security Features Analysis:
   - List all security features that should be present
   - For each feature, indicate if it was detected and confidence level

3. Data Extraction:
   - Extract all relevant data fields from the document
   - Validate format and consistency of extracted data

4. Anomaly Detection:
   - Identify any anomalies or suspicious elements
   - Classify severity (low/medium/high)
   - Provide specific descriptions

Format the response as a structured JSON object.
    `.trim();
  }

  /**
   * Build biometric verification prompt
   */
  private buildBiometricVerificationPrompt(biometricData: any): string {
    return `
Perform comprehensive biometric verification analysis.

Biometric Data Provided:
${biometricData.selfieBase64 ? '- Selfie image for facial recognition' : ''}
${biometricData.voiceBase64 ? '- Voice sample for voice recognition' : ''}
${biometricData.challengeType ? `Challenge Type: ${biometricData.challengeType}` : ''}

Please provide:

1. Overall Biometric Score (0-100)

2. Liveness Detection:
   - Did the subject pass liveness check?
   - Confidence level
   - Challenges detected or recommended

3. Facial Analysis (if selfie provided):
   - Match score against reference
   - Key facial landmarks detected
   - Image quality assessment

4. Voice Analysis (if voice provided):
   - Match score against reference
   - Voice characteristics
   - Audio quality assessment

5. Risk Assessment:
   - List any risk factors identified
   - Overall recommendation (accept/review/reject)

Format the response as a structured JSON object with detailed analysis.
    `.trim();
  }

  /**
   * Build consistency check prompt
   */
  private buildConsistencyCheckPrompt(data: any): string {
    return `
Perform a comprehensive consistency check across all provided data sources.

Data Sources:
- Documents: ${data.documents?.length || 0} documents provided
- Biometric Data: ${data.biometrics ? 'Yes' : 'No'}
- Application Data: ${data.applicationData ? 'Yes' : 'No'}
- Historical Data: ${data.historicalData?.length || 0} records

Analyze for:

1. Overall Consistency Score (0-100)

2. Risk Level Assessment (low/medium/high/critical)

3. Detailed Consistency Checks:
   - Cross-reference all data points
   - Verify information matches across sources
   - Check temporal consistency
   - Validate logical relationships

4. Discrepancy Identification:
   - List all discrepancies found
   - For each: field, expected value, found value, severity

5. Recommendations:
   - Specific actions to resolve issues
   - Whether manual review is required

Format the response as a structured JSON object with comprehensive analysis.
    `.trim();
  }

  /**
   * Parse document verification response
   */
  private parseDocumentVerificationResponse(content: string): DocumentVerificationResult {
    try {
      const parsed = JSON.parse(content);
      return {
        documentType: parsed.documentType || 'unknown',
        isAuthentic: parsed.isAuthentic ?? false,
        confidenceScore: parsed.confidenceScore || 0,
        extractedData: parsed.extractedData || {},
        securityFeatures: parsed.securityFeatures || [],
        anomalies: parsed.anomalies || [],
        metadata: { processingTime: 0, model: '', provider: '' },
      };
    } catch {
      // Fallback parsing
      return {
        documentType: 'unknown',
        isAuthentic: false,
        confidenceScore: 0,
        extractedData: {},
        securityFeatures: [],
        anomalies: [{ type: 'parse_error', description: 'Failed to parse response', severity: 'high' }],
        metadata: { processingTime: 0, model: '', provider: '' },
      };
    }
  }

  /**
   * Parse biometric verification response
   */
  private parseBiometricVerificationResponse(content: string): BiometricVerificationResult {
    try {
      const parsed = JSON.parse(content);
      return {
        biometricScore: parsed.biometricScore || 0,
        livenessCheck: parsed.livenessCheck || { passed: false, confidence: 0, challenges: [] },
        facialAnalysis: parsed.facialAnalysis,
        voiceAnalysis: parsed.voiceAnalysis,
        riskFactors: parsed.riskFactors || [],
        recommendation: parsed.recommendation || 'reject',
      };
    } catch {
      return {
        biometricScore: 0,
        livenessCheck: { passed: false, confidence: 0, challenges: [] },
        riskFactors: ['parse_error'],
        recommendation: 'reject',
      };
    }
  }

  /**
   * Parse consistency check response
   */
  private parseConsistencyCheckResponse(content: string): ConsistencyCheckResult {
    try {
      const parsed = JSON.parse(content);
      return {
        overallScore: parsed.overallScore || 0,
        riskLevel: parsed.riskLevel || 'high',
        consistencyChecks: parsed.consistencyChecks || [],
        discrepancies: parsed.discrepancies || [],
        recommendations: parsed.recommendations || [],
        requiresManualReview: parsed.requiresManualReview ?? true,
      };
    } catch {
      return {
        overallScore: 0,
        riskLevel: 'critical',
        consistencyChecks: [],
        discrepancies: [],
        recommendations: ['Manual review required'],
        requiresManualReview: true,
      };
    }
  }

  /**
   * Make final verification decision
   */
  private makeFinalDecision(
    documentResults: DocumentVerificationResult[],
    biometricResult: BiometricVerificationResult | undefined,
    consistencyResult: ConsistencyCheckResult,
  ) {
    const avgDocumentScore = documentResults.reduce((sum, r) => sum + r.confidenceScore, 0) / documentResults.length;
    const allDocumentsAuthentic = documentResults.every(r => r.isAuthentic);
    const biometricPassed = !biometricResult || biometricResult.recommendation !== 'reject';
    const consistencyPassed = consistencyResult.riskLevel !== 'critical' && consistencyResult.overallScore >= 70;

    const overallConfidence = (
      avgDocumentScore * 0.4 +
      (biometricResult?.biometricScore || 100) * 0.3 +
      consistencyResult.overallScore * 0.3
    );

    const approved = allDocumentsAuthentic && biometricPassed && consistencyPassed && overallConfidence >= 75;

    const reasons = [];
    const nextSteps = [];

    if (!allDocumentsAuthentic) {
      reasons.push('One or more documents failed authentication');
      nextSteps.push('Request new document images');
    }
    if (!biometricPassed) {
      reasons.push('Biometric verification failed');
      nextSteps.push('Schedule video verification call');
    }
    if (!consistencyPassed) {
      reasons.push('Data consistency issues detected');
      nextSteps.push('Manual review required');
    }

    if (approved) {
      reasons.push('All verification checks passed');
      nextSteps.push('Proceed with onboarding');
    }

    return {
      approved,
      confidence: Math.round(overallConfidence),
      reasons,
      nextSteps,
    };
  }
}