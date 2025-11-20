import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reference } from '../database/entities';
import { SubmitReferenceDto } from './dto/submit-reference.dto';
import { ReferenceStatus } from '../database/entities';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ReferencesService {
  private readonly logger = new Logger(ReferencesService.name);

  constructor(
    @InjectRepository(Reference)
    private referenceRepository: Repository<Reference>,
    private aiService: AiService,
  ) {}

  async getReference(id: string) {
    const reference = await this.referenceRepository.findOne({
      where: { id },
      relations: ['seeker', 'referrer'],
    });

    if (!reference) {
      throw new NotFoundException('Reference not found');
    }

    return {
      id: reference.id,
      seekerId: reference.seekerId,
      referrerId: reference.referrerId,
      status: reference.status,
      rcsScore: reference.rcsScore,
      format: reference.format,
    };
  }

  async submitReference(id: string, dto: SubmitReferenceDto) {
    const startTime = Date.now();
    this.logger.log(`Processing reference submission: ${id}`);

    const reference = await this.referenceRepository.findOne({ where: { id } });
    if (!reference) {
      throw new NotFoundException('Reference not found');
    }

    try {
      // Step 1: Upload media content to storage (if applicable)
      // For now, we're using the content URL directly
      const contentUrl = dto.content;

      // Step 2: Trigger AI verification for video/audio formats
      let authenticityScore: number | null = null;
      let deepfakeProbability: number | null = null;

      if (dto.format === 'video' || dto.format === 'audio') {
        try {
          this.logger.log(`Triggering AI authenticity verification for ${dto.format}`);
          const verification = await this.aiService.verifyAuthenticity({
            mediaUrl: contentUrl,
            mediaType: dto.format,
          });

          authenticityScore = verification.authenticityScore;
          deepfakeProbability = verification.deepfakeProbability;

          this.logger.log({
            event: 'AUTHENTICITY_VERIFICATION',
            referenceId: id,
            authenticityScore,
            deepfakeProbability,
            confidence: verification.confidence,
          });

          // Check if authenticity is too low
          if (authenticityScore < 50 || deepfakeProbability > 70) {
            this.logger.warn(
              `Low authenticity detected for reference ${id}: Score=${authenticityScore}, DeepfakeProb=${deepfakeProbability}`,
            );
            // You might want to flag this for manual review
          }
        } catch (error) {
          this.logger.error(
            `Authenticity verification failed for reference ${id}: ${error.message}`,
          );
          // Continue with submission even if verification fails
          // But you might want to flag it for manual review
        }
      }

      // Step 3: Calculate RCS score using AI
      let rcsScore = 50; // Default fallback score
      let rcsAnalysis: any = null;

      try {
        // Extract content for RCS calculation
        const referenceContent = await this.extractReferenceContent(
          dto.content,
          dto.format,
        );

        // Get questions that were asked
        const questions = reference.questions || [];

        // Calculate response time if available
        const responseTime = reference.createdAt
          ? (Date.now() - reference.createdAt.getTime()) / 60000 // minutes
          : undefined;

        // Calculate completeness
        const completeness = questions.length > 0
          ? (referenceContent.split(/\s+/).length / (questions.length * 50)) * 100
          : 100;

        this.logger.log(`Calculating RCS score for reference ${id}`);
        rcsAnalysis = await this.aiService.calculateRCS(
          referenceContent,
          questions,
          {
            format: dto.format,
            responseTime,
            completeness: Math.min(completeness, 100),
          },
        );

        rcsScore = rcsAnalysis.rcsScore;

        this.logger.log({
          event: 'RCS_CALCULATION',
          referenceId: id,
          rcsScore,
          confidence: rcsAnalysis.confidence,
          breakdown: rcsAnalysis.breakdown,
        });

        // Log red flags if any
        if (rcsAnalysis.redFlags && rcsAnalysis.redFlags.length > 0) {
          this.logger.warn({
            event: 'RCS_RED_FLAGS',
            referenceId: id,
            redFlags: rcsAnalysis.redFlags,
          });
        }
      } catch (error) {
        this.logger.error(
          `RCS calculation failed for reference ${id}: ${error.message}`,
        );
        // Use fallback scoring
        rcsScore = 50;
      }

      // Step 4: Update reference in database
      reference.format = dto.format;
      reference.contentUrl = contentUrl;
      reference.attachments = dto.attachments || null;
      reference.status = ReferenceStatus.COMPLETED;
      reference.rcsScore = rcsScore;
      reference.aiAuthenticityScore = authenticityScore;
      reference.deepfakeProbability = deepfakeProbability;
      reference.submittedAt = new Date();

      await this.referenceRepository.save(reference);

      const duration = Date.now() - startTime;
      this.logger.log({
        event: 'REFERENCE_SUBMISSION_COMPLETE',
        referenceId: id,
        duration,
        rcsScore,
        authenticityScore,
      });

      return {
        referenceId: reference.id,
        rcsScore,
        authenticityScore,
        deepfakeProbability,
        analysis: rcsAnalysis
          ? {
              confidence: rcsAnalysis.confidence,
              strengths: rcsAnalysis.strengths,
              weaknesses: rcsAnalysis.weaknesses,
              recommendations: rcsAnalysis.recommendations,
            }
          : null,
        processingTime: duration,
      };
    } catch (error) {
      this.logger.error(
        `Reference submission failed for ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Extract reference content from different formats
   * This is a helper method to prepare content for RCS analysis
   */
  private async extractReferenceContent(
    content: string,
    format: string,
  ): Promise<string> {
    // For text format, content is directly usable
    if (format === 'text') {
      return content;
    }

    // For video/audio, we would need to extract transcript
    // This is a placeholder - in production, you'd use a transcription service
    // For now, we'll return a note indicating this needs to be implemented
    if (format === 'video' || format === 'audio') {
      // TODO: Integrate with transcription service (e.g., AWS Transcribe, Google Speech-to-Text)
      // For now, return a placeholder or fetch from contentUrl if it's already transcribed
      this.logger.warn(
        `Transcription needed for ${format} content. Using placeholder.`,
      );
      return `[${format.toUpperCase()} CONTENT] - Transcription service integration needed`;
    }

    return content;
  }
}
