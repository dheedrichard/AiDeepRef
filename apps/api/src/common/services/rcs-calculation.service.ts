import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reference } from '../../database/entities';

export interface RcsScore {
  overall: number;
  authenticity: number;
  relevance: number;
  clarity: number;
  sentiment: number;
  breakdown: {
    weights: {
      authenticity: number;
      relevance: number;
      clarity: number;
      sentiment: number;
    };
    rawScores: {
      authenticity: number;
      relevance: number;
      clarity: number;
      sentiment: number;
    };
  };
  percentile: number;
  grade: string;
  badge: string;
}

/**
 * RCS (Reference Credibility Score) Calculation Service
 *
 * Purpose: Move ALL RCS score calculation to server-side
 * Benefits:
 * - Consistent scoring algorithm
 * - Can leverage AI/ML models on server
 * - Easy to update algorithm without client changes
 * - Prevent client-side tampering
 * - Can access full database for percentile calculations
 */
@Injectable()
export class RcsCalculationService {
  private readonly logger = new Logger(RcsCalculationService.name);

  // Scoring weights (can be tuned based on ML models)
  private readonly WEIGHTS = {
    authenticity: 0.4, // 40% - Most important
    relevance: 0.3, // 30%
    clarity: 0.2, // 20%
    sentiment: 0.1, // 10%
  };

  constructor(
    @InjectRepository(Reference)
    private readonly referenceRepo: Repository<Reference>,
  ) {}

  /**
   * Calculate comprehensive RCS score for a reference
   * All computation happens on server
   */
  async calculateRcsScore(referenceId: string): Promise<RcsScore> {
    const startTime = Date.now();

    try {
      const reference = await this.referenceRepo.findOne({
        where: { id: referenceId },
      });

      if (!reference) {
        throw new Error('Reference not found');
      }

      // Calculate individual components (server-side)
      const authenticity = await this.calculateAuthenticity(reference);
      const relevance = await this.calculateRelevance(reference);
      const clarity = await this.calculateClarity(reference);
      const sentiment = await this.calculateSentiment(reference);

      // Calculate weighted overall score
      const overall =
        authenticity * this.WEIGHTS.authenticity +
        relevance * this.WEIGHTS.relevance +
        clarity * this.WEIGHTS.clarity +
        sentiment * this.WEIGHTS.sentiment;

      // Calculate percentile (compare against all references)
      const percentile = await this.calculatePercentile(overall);

      // Determine grade and badge
      const grade = this.getGrade(overall);
      const badge = this.getBadge(overall);

      // Update reference with calculated scores
      await this.referenceRepo.update(referenceId, {
        rcsScore: overall,
        aiAuthenticityScore: authenticity,
        // Store other components in JSONB field if needed
      });

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `RCS score calculated for reference ${referenceId} in ${executionTime}ms - Score: ${overall.toFixed(2)}`,
      );

      return {
        overall: Math.round(overall * 10) / 10,
        authenticity: Math.round(authenticity * 10) / 10,
        relevance: Math.round(relevance * 10) / 10,
        clarity: Math.round(clarity * 10) / 10,
        sentiment: Math.round(sentiment * 10) / 10,
        breakdown: {
          weights: this.WEIGHTS,
          rawScores: {
            authenticity,
            relevance,
            clarity,
            sentiment,
          },
        },
        percentile,
        grade,
        badge,
      };
    } catch (error) {
      this.logger.error(
        `Error calculating RCS score for reference ${referenceId}: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Recalculate scores for all references (batch operation)
   */
  async recalculateAllScores(userId?: string): Promise<{
    total: number;
    updated: number;
    failed: number;
  }> {
    const startTime = Date.now();
    let updated = 0;
    let failed = 0;

    try {
      const query = this.referenceRepo
        .createQueryBuilder('ref')
        .where('ref.status = :status', { status: 'completed' });

      if (userId) {
        query.andWhere('ref.seekerId = :userId', { userId });
      }

      const references = await query.getMany();
      const total = references.length;

      this.logger.log(
        `Starting batch RCS calculation for ${total} references`,
      );

      // Process in batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < references.length; i += batchSize) {
        const batch = references.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (ref) => {
            try {
              await this.calculateRcsScore(ref.id);
              updated++;
            } catch (error) {
              this.logger.error(
                `Failed to calculate RCS for reference ${ref.id}`,
                error,
              );
              failed++;
            }
          }),
        );
      }

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Batch RCS calculation completed in ${executionTime}ms - Updated: ${updated}, Failed: ${failed}`,
      );

      return { total, updated, failed };
    } catch (error) {
      this.logger.error(`Error in batch RCS calculation: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Calculate authenticity score (0-100)
   * Factors: AI detection, deepfake probability, response consistency
   */
  private async calculateAuthenticity(reference: Reference): Promise<number> {
    let score = 100;

    // Deduct points based on deepfake probability
    if (reference.deepfakeProbability) {
      score -= reference.deepfakeProbability * 100;
    }

    // Deduct points for missing metadata or suspicious patterns
    if (!reference.submittedAt) {
      score -= 10;
    }

    // Check response completeness
    if (reference.responses) {
      const responseCount = Object.keys(reference.responses).length;
      const questionCount = reference.questions?.length || 0;
      if (responseCount < questionCount) {
        score -= ((questionCount - responseCount) / questionCount) * 20;
      }
    }

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate relevance score (0-100)
   * Factors: Answer length, keyword matching, question alignment
   */
  private async calculateRelevance(reference: Reference): Promise<number> {
    let score = 80; // Base score

    if (!reference.responses || Object.keys(reference.responses).length === 0) {
      return 0;
    }

    // Analyze response completeness and depth
    const responses = Object.values(reference.responses);
    const avgLength =
      responses.reduce((sum, r) => sum + (r?.length || 0), 0) /
      responses.length;

    // Ideal response length is 100-500 characters
    if (avgLength < 50) {
      score -= 30; // Too short
    } else if (avgLength > 500) {
      score -= 10; // Could be verbose
    } else if (avgLength >= 100 && avgLength <= 300) {
      score += 10; // Ideal length
    }

    // Check for role-specific keywords
    const roleKeywords = this.extractKeywords(reference.role);
    const responseText = responses.join(' ').toLowerCase();
    const keywordMatches = roleKeywords.filter((keyword) =>
      responseText.includes(keyword.toLowerCase()),
    ).length;

    score += Math.min(10, keywordMatches * 2);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate clarity score (0-100)
   * Factors: Grammar, structure, readability
   */
  private async calculateClarity(reference: Reference): Promise<number> {
    let score = 85; // Base score

    if (!reference.responses || Object.keys(reference.responses).length === 0) {
      return 0;
    }

    const responses = Object.values(reference.responses);

    // Analyze each response
    for (const response of responses) {
      if (!response) continue;

      // Check for complete sentences (very basic check)
      const sentences = response.split(/[.!?]+/).filter((s) => s.trim().length > 0);
      if (sentences.length === 0) {
        score -= 10;
      }

      // Check for excessive punctuation or special characters
      const specialCharCount = (response.match(/[^a-zA-Z0-9\s.,!?-]/g) || [])
        .length;
      if (specialCharCount > response.length * 0.1) {
        score -= 5;
      }

      // Check for all caps (unprofessional)
      if (response === response.toUpperCase() && response.length > 20) {
        score -= 5;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate sentiment score (0-100)
   * Factors: Positive language, professional tone, recommendation strength
   */
  private async calculateSentiment(reference: Reference): Promise<number> {
    let score = 75; // Base score

    if (!reference.responses || Object.keys(reference.responses).length === 0) {
      return score;
    }

    const responseText = Object.values(reference.responses).join(' ').toLowerCase();

    // Positive keywords
    const positiveKeywords = [
      'excellent',
      'outstanding',
      'great',
      'amazing',
      'highly recommend',
      'exceptional',
      'skilled',
      'professional',
      'talented',
      'dedicated',
      'reliable',
      'trustworthy',
    ];

    // Negative keywords
    const negativeKeywords = [
      'poor',
      'weak',
      'lacking',
      'difficult',
      'problems',
      'issues',
      'concerns',
      'not recommend',
      'avoid',
    ];

    const positiveMatches = positiveKeywords.filter((keyword) =>
      responseText.includes(keyword),
    ).length;
    const negativeMatches = negativeKeywords.filter((keyword) =>
      responseText.includes(keyword),
    ).length;

    score += positiveMatches * 3;
    score -= negativeMatches * 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate percentile by comparing with all references in database
   */
  private async calculatePercentile(score: number): Promise<number> {
    try {
      // Get all completed references with scores
      const allScores = await this.referenceRepo
        .createQueryBuilder('ref')
        .select('ref.rcsScore', 'score')
        .where('ref.status = :status', { status: 'completed' })
        .andWhere('ref.rcsScore IS NOT NULL')
        .getRawMany();

      if (allScores.length === 0) {
        return 50; // Default to 50th percentile if no data
      }

      const scores = allScores.map((r) => parseFloat(r.score)).sort((a, b) => a - b);
      const lowerScores = scores.filter((s) => s < score).length;
      const percentile = (lowerScores / scores.length) * 100;

      return Math.round(percentile);
    } catch (error) {
      this.logger.error('Error calculating percentile', error);
      return 50; // Default
    }
  }

  /**
   * Get letter grade based on score
   */
  private getGrade(score: number): string {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'A-';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'B-';
    if (score >= 65) return 'C+';
    if (score >= 60) return 'C';
    if (score >= 55) return 'C-';
    if (score >= 50) return 'D';
    return 'F';
  }

  /**
   * Get badge based on score
   */
  private getBadge(score: number): string {
    if (score >= 95) return 'Outstanding';
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Average';
    if (score >= 50) return 'Fair';
    return 'Needs Improvement';
  }

  /**
   * Extract keywords from role for relevance matching
   */
  private extractKeywords(role: string): string[] {
    const keywords: string[] = [];
    const roleLower = role.toLowerCase();

    // Role-specific keyword mapping
    const roleKeywords: Record<string, string[]> = {
      developer: ['code', 'programming', 'software', 'technical', 'debug'],
      manager: ['team', 'leadership', 'project', 'coordination', 'planning'],
      designer: ['creative', 'design', 'visual', 'ui', 'ux', 'user'],
      engineer: ['technical', 'engineering', 'system', 'architecture', 'solution'],
      analyst: ['data', 'analysis', 'metrics', 'reporting', 'insights'],
    };

    // Match role to keywords
    for (const [key, words] of Object.entries(roleKeywords)) {
      if (roleLower.includes(key)) {
        keywords.push(...words);
      }
    }

    // Add role itself
    keywords.push(...role.split(' '));

    return keywords;
  }
}
