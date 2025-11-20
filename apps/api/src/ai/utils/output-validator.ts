import { Logger } from '@nestjs/common';

/**
 * Validation result
 */
export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors?: string[];
  sanitized?: boolean;
}

/**
 * Output Validator and Sanitizer
 *
 * Validates and sanitizes AI-generated responses to ensure:
 * - Output matches expected schema
 * - No malicious content injected
 * - Data types are correct
 * - Values are within acceptable ranges
 */
export class OutputValidator {
  private static readonly logger = new Logger(OutputValidator.name);

  /**
   * Parse and validate JSON response
   */
  static parseJSON<T>(
    content: string,
    validator?: (data: any) => ValidationResult<T>,
  ): ValidationResult<T> {
    try {
      // Remove markdown code blocks if present
      let cleaned = content.trim();

      // Remove markdown json blocks
      cleaned = cleaned.replace(/^```json\s*/i, '');
      cleaned = cleaned.replace(/^```\s*/i, '');
      cleaned = cleaned.replace(/\s*```$/i, '');

      // Try to extract JSON if there's extra text
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      const parsed = JSON.parse(cleaned);

      // Apply custom validator if provided
      if (validator) {
        return validator(parsed);
      }

      return {
        valid: true,
        data: parsed as T,
      };
    } catch (error) {
      this.logger.error(`JSON parsing failed: ${error.message}`);
      return {
        valid: false,
        errors: [`Failed to parse JSON: ${error.message}`],
      };
    }
  }

  /**
   * Validate authenticity verification response
   */
  static validateAuthenticityResponse(data: any): ValidationResult<{
    authenticityScore: number;
    deepfakeProbability: number;
    confidence: string;
    indicators: Record<string, number>;
    findings: string[];
    recommendedActions: string[];
  }> {
    const errors: string[] = [];

    // Check required fields
    if (typeof data.authenticityScore !== 'number') {
      errors.push('authenticityScore must be a number');
    } else if (data.authenticityScore < 0 || data.authenticityScore > 100) {
      errors.push('authenticityScore must be between 0 and 100');
    }

    if (typeof data.deepfakeProbability !== 'number') {
      errors.push('deepfakeProbability must be a number');
    } else if (data.deepfakeProbability < 0 || data.deepfakeProbability > 100) {
      errors.push('deepfakeProbability must be between 0 and 100');
    }

    if (!['low', 'medium', 'high'].includes(data.confidence)) {
      errors.push('confidence must be "low", "medium", or "high"');
    }

    if (!data.indicators || typeof data.indicators !== 'object') {
      errors.push('indicators must be an object');
    } else {
      // Validate indicator scores
      for (const [key, value] of Object.entries(data.indicators)) {
        if (typeof value !== 'number' || value < 0 || value > 100) {
          errors.push(`indicators.${key} must be a number between 0 and 100`);
        }
      }
    }

    if (!Array.isArray(data.findings)) {
      errors.push('findings must be an array');
    }

    if (!Array.isArray(data.recommendedActions)) {
      errors.push('recommendedActions must be an array');
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // Sanitize arrays
    const sanitized = {
      authenticityScore: Math.round(data.authenticityScore * 100) / 100,
      deepfakeProbability: Math.round(data.deepfakeProbability * 100) / 100,
      confidence: data.confidence,
      indicators: data.indicators,
      findings: this.sanitizeArray(data.findings),
      recommendedActions: this.sanitizeArray(data.recommendedActions),
    };

    return {
      valid: true,
      data: sanitized,
      sanitized: true,
    };
  }

  /**
   * Validate question generation response
   */
  static validateQuestionsResponse(data: any): ValidationResult<{
    questions: Array<{
      id: number;
      category: string;
      question: string;
      rationale: string;
    }>;
    recommendedQuestionCount: number;
    estimatedResponseTime: number;
  }> {
    const errors: string[] = [];

    if (!Array.isArray(data.questions)) {
      errors.push('questions must be an array');
    } else {
      if (data.questions.length < 3 || data.questions.length > 15) {
        errors.push('questions array must contain between 3 and 15 items');
      }

      data.questions.forEach((q: any, index: number) => {
        if (typeof q.id !== 'number') {
          errors.push(`questions[${index}].id must be a number`);
        }

        const validCategories = [
          'technical',
          'behavioral',
          'collaboration',
          'leadership',
          'problem-solving',
        ];
        if (!validCategories.includes(q.category)) {
          errors.push(
            `questions[${index}].category must be one of: ${validCategories.join(', ')}`,
          );
        }

        if (typeof q.question !== 'string' || q.question.length < 10) {
          errors.push(`questions[${index}].question must be a string with at least 10 characters`);
        }

        if (typeof q.rationale !== 'string' || q.rationale.length < 10) {
          errors.push(`questions[${index}].rationale must be a string with at least 10 characters`);
        }
      });
    }

    if (typeof data.recommendedQuestionCount !== 'number') {
      errors.push('recommendedQuestionCount must be a number');
    }

    if (typeof data.estimatedResponseTime !== 'number') {
      errors.push('estimatedResponseTime must be a number');
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // Sanitize questions
    const sanitized = {
      questions: data.questions.map((q: any) => ({
        id: q.id,
        category: q.category,
        question: this.sanitizeText(q.question),
        rationale: this.sanitizeText(q.rationale),
      })),
      recommendedQuestionCount: data.recommendedQuestionCount,
      estimatedResponseTime: data.estimatedResponseTime,
    };

    return {
      valid: true,
      data: sanitized,
      sanitized: true,
    };
  }

  /**
   * Validate reference quality scoring response
   */
  static validateRCSResponse(data: any): ValidationResult<{
    rcsScore: number;
    confidence: string;
    breakdown: {
      contentQuality: number;
      authenticity: number;
      completeness: number;
      verifiability: number;
      presentation: number;
    };
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    redFlags: string[];
  }> {
    const errors: string[] = [];

    // Validate rcsScore
    if (typeof data.rcsScore !== 'number') {
      errors.push('rcsScore must be a number');
    } else if (data.rcsScore < 0 || data.rcsScore > 100) {
      errors.push('rcsScore must be between 0 and 100');
    }

    // Validate confidence
    if (!['low', 'medium', 'high'].includes(data.confidence)) {
      errors.push('confidence must be "low", "medium", or "high"');
    }

    // Validate breakdown
    if (!data.breakdown || typeof data.breakdown !== 'object') {
      errors.push('breakdown must be an object');
    } else {
      const requiredFields = {
        contentQuality: 30,
        authenticity: 25,
        completeness: 20,
        verifiability: 15,
        presentation: 10,
      };

      for (const [field, maxScore] of Object.entries(requiredFields)) {
        const value = data.breakdown[field];
        if (typeof value !== 'number') {
          errors.push(`breakdown.${field} must be a number`);
        } else if (value < 0 || value > maxScore) {
          errors.push(`breakdown.${field} must be between 0 and ${maxScore}`);
        }
      }

      // Verify total matches rcsScore (with some tolerance)
      if (errors.length === 0) {
        const total = Object.values(data.breakdown).reduce((sum: number, val: any) => sum + val, 0);
        if (Math.abs(total - data.rcsScore) > 1) {
          errors.push('breakdown scores must sum to approximately rcsScore');
        }
      }
    }

    // Validate arrays
    const arrayFields = ['strengths', 'weaknesses', 'recommendations', 'redFlags'];
    for (const field of arrayFields) {
      if (!Array.isArray(data[field])) {
        errors.push(`${field} must be an array`);
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // Sanitize response
    const sanitized = {
      rcsScore: Math.round(data.rcsScore * 100) / 100,
      confidence: data.confidence,
      breakdown: {
        contentQuality: Math.round(data.breakdown.contentQuality * 100) / 100,
        authenticity: Math.round(data.breakdown.authenticity * 100) / 100,
        completeness: Math.round(data.breakdown.completeness * 100) / 100,
        verifiability: Math.round(data.breakdown.verifiability * 100) / 100,
        presentation: Math.round(data.breakdown.presentation * 100) / 100,
      },
      strengths: this.sanitizeArray(data.strengths),
      weaknesses: this.sanitizeArray(data.weaknesses),
      recommendations: this.sanitizeArray(data.recommendations),
      redFlags: this.sanitizeArray(data.redFlags),
    };

    return {
      valid: true,
      data: sanitized,
      sanitized: true,
    };
  }

  /**
   * Sanitize text content
   */
  private static sanitizeText(text: string): string {
    if (typeof text !== 'string') {
      return '';
    }

    return text
      // Remove potential XSS
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      // Remove control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Limit length
      .substring(0, 5000)
      .trim();
  }

  /**
   * Sanitize array of strings
   */
  private static sanitizeArray(arr: any[]): string[] {
    if (!Array.isArray(arr)) {
      return [];
    }

    return arr
      .filter(item => typeof item === 'string')
      .map(item => this.sanitizeText(item))
      .filter(item => item.length > 0)
      .slice(0, 50); // Limit array size
  }

  /**
   * Detect potential data exfiltration attempts in output
   */
  static detectExfiltration(content: string): boolean {
    const suspiciousPatterns = [
      // URLs to external domains (potential data exfiltration)
      /https?:\/\/(?!storage\.example\.com|yourdomain\.com)[a-z0-9.-]+/gi,
      // Base64 encoded data (large chunks)
      /[A-Za-z0-9+\/]{200,}={0,2}/g,
      // Hex encoded data (large chunks)
      /[0-9a-f]{200,}/gi,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        this.logger.warn('Potential data exfiltration detected in AI output');
        return true;
      }
    }

    return false;
  }

  /**
   * Validate that output doesn't contain PII
   */
  static detectPII(content: string): {
    detected: boolean;
    types: string[];
  } {
    const piiPatterns = {
      ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
      creditCard: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      phone: /\b\d{3}[-.]\d{3}[-.]\d{4}\b/g,
    };

    const detected: string[] = [];

    for (const [type, pattern] of Object.entries(piiPatterns)) {
      if (pattern.test(content)) {
        detected.push(type);
      }
    }

    if (detected.length > 0) {
      this.logger.warn(`PII detected in AI output: ${detected.join(', ')}`);
    }

    return {
      detected: detected.length > 0,
      types: detected,
    };
  }
}
