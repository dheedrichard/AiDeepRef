import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AIInteraction } from '../entities/ai-interaction.entity';
import { FineTuneExport } from '../entities/fine-tune-export.entity';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface LogInteractionDto {
  session_id: string;
  prompt_id: string;
  user_input: string;
  ai_response: string;
  model_used: string;
  tokens_used: number;
  latency_ms?: number;
  metadata?: Record<string, any>;
}

export interface FineTuneFilters {
  sessionType?: string;
  startDate?: Date;
  endDate?: Date;
  minTokens?: number;
  excludeFlagged?: boolean;
}

export interface FineTuneDataset {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  metadata?: Record<string, any>;
}

@Injectable()
export class InteractionLoggerService {
  private readonly logger = new Logger(InteractionLoggerService.name);

  constructor(
    @InjectRepository(AIInteraction)
    private interactionRepository: Repository<AIInteraction>,
    @InjectRepository(FineTuneExport)
    private exportRepository: Repository<FineTuneExport>,
  ) {}

  /**
   * Log every interaction for fine-tuning
   */
  async logInteraction(dto: LogInteractionDto): Promise<AIInteraction> {
    const interaction = this.interactionRepository.create({
      session_id: dto.session_id,
      prompt_id: dto.prompt_id,
      user_input: this.sanitizeInput(dto.user_input),
      ai_response: this.sanitizeResponse(dto.ai_response),
      model_used: dto.model_used,
      tokens_used: dto.tokens_used,
      latency_ms: dto.latency_ms,
      metadata: dto.metadata || {},
      flagged: false,
    });

    // Auto-flag suspicious interactions
    if (this.shouldFlag(dto.user_input, dto.ai_response)) {
      interaction.flagged = true;
      interaction.flag_reason = 'Auto-flagged for review';
    }

    await this.interactionRepository.save(interaction);

    this.logger.debug(
      `Logged interaction for session ${dto.session_id}: ${dto.tokens_used} tokens`,
    );

    return interaction;
  }

  /**
   * Get interaction history (sanitized - no system prompts)
   */
  async getHistory(
    sessionId: string,
    limit: number = 50,
  ): Promise<Array<{ role: string; content: string; timestamp: Date }>> {
    const interactions = await this.interactionRepository.find({
      where: { session_id: sessionId },
      order: { created_at: 'ASC' },
      take: limit,
    });

    // Return only user and assistant messages (NO SYSTEM PROMPTS)
    const history: Array<{ role: string; content: string; timestamp: Date }> = [];

    for (const interaction of interactions) {
      history.push({
        role: 'user',
        content: interaction.user_input,
        timestamp: interaction.created_at,
      });
      history.push({
        role: 'assistant',
        content: interaction.ai_response,
        timestamp: interaction.created_at,
      });
    }

    return history;
  }

  /**
   * Get interaction statistics
   */
  async getInteractionStats(sessionId: string): Promise<{
    total_interactions: number;
    total_tokens: number;
    average_latency: number;
    flagged_count: number;
  }> {
    const interactions = await this.interactionRepository.find({
      where: { session_id: sessionId },
    });

    const totalTokens = interactions.reduce(
      (sum, int) => sum + int.tokens_used,
      0,
    );
    const totalLatency = interactions.reduce(
      (sum, int) => sum + (int.latency_ms || 0),
      0,
    );
    const flaggedCount = interactions.filter((int) => int.flagged).length;

    return {
      total_interactions: interactions.length,
      total_tokens: totalTokens,
      average_latency: interactions.length > 0 ? totalLatency / interactions.length : 0,
      flagged_count: flaggedCount,
    };
  }

  /**
   * Export for fine-tuning
   */
  async exportForFineTuning(
    filters: FineTuneFilters,
    userId: string,
  ): Promise<FineTuneExport> {
    // Create export record
    const exportRecord = this.exportRepository.create({
      session_type: filters.sessionType || 'all',
      filters,
      status: 'processing',
      created_by: userId,
      interaction_count: 0,
    });

    await this.exportRepository.save(exportRecord);

    try {
      // Build query
      const queryBuilder = this.interactionRepository
        .createQueryBuilder('interaction')
        .leftJoinAndSelect('interaction.session', 'session')
        .leftJoinAndSelect('interaction.prompt', 'prompt');

      if (filters.sessionType) {
        queryBuilder.andWhere('session.session_type = :sessionType', {
          sessionType: filters.sessionType,
        });
      }

      if (filters.startDate && filters.endDate) {
        queryBuilder.andWhere('interaction.created_at BETWEEN :startDate AND :endDate', {
          startDate: filters.startDate,
          endDate: filters.endDate,
        });
      }

      if (filters.minTokens) {
        queryBuilder.andWhere('interaction.tokens_used >= :minTokens', {
          minTokens: filters.minTokens,
        });
      }

      if (filters.excludeFlagged) {
        queryBuilder.andWhere('interaction.flagged = false');
      }

      const interactions = await queryBuilder.getMany();

      // Build dataset (without system prompts in the export)
      const dataset: FineTuneDataset[] = interactions.map((interaction) => ({
        messages: [
          {
            role: 'user' as const,
            content: interaction.user_input,
          },
          {
            role: 'assistant' as const,
            content: interaction.ai_response,
          },
        ],
        metadata: {
          session_type: filters.sessionType,
          model_used: interaction.model_used,
          tokens_used: interaction.tokens_used,
          timestamp: interaction.created_at,
        },
      }));

      // Save to file
      const filename = `finetune-${exportRecord.id}.jsonl`;
      const filepath = path.join(process.cwd(), 'exports', filename);

      // Ensure exports directory exists
      await fs.mkdir(path.dirname(filepath), { recursive: true });

      // Write JSONL format (one JSON object per line)
      const jsonlContent = dataset
        .map((item) => JSON.stringify(item))
        .join('\n');

      await fs.writeFile(filepath, jsonlContent);

      // Update export record
      exportRecord.status = 'completed';
      exportRecord.file_path = filepath;
      exportRecord.interaction_count = dataset.length;

      await this.exportRepository.save(exportRecord);

      this.logger.log(
        `Exported ${dataset.length} interactions for fine-tuning: ${filename}`,
      );

      return exportRecord;
    } catch (error) {
      // Mark export as failed
      exportRecord.status = 'failed';
      exportRecord.error_message = error.message;
      await this.exportRepository.save(exportRecord);

      this.logger.error('Failed to export for fine-tuning', error);
      throw error;
    }
  }

  /**
   * Flag interaction for review
   */
  async flagInteraction(
    interactionId: string,
    reason: string,
  ): Promise<void> {
    await this.interactionRepository.update(
      { id: interactionId },
      { flagged: true, flag_reason: reason },
    );

    this.logger.log(`Flagged interaction ${interactionId}: ${reason}`);
  }

  /**
   * Sanitize input (remove potential prompt injection)
   */
  private sanitizeInput(input: string): string {
    return input
      .replace(/\{system\}/gi, '')
      .replace(/\{prompt\}/gi, '')
      .replace(/\{instruction\}/gi, '')
      .trim();
  }

  /**
   * Sanitize response (ensure no system prompts leaked)
   */
  private sanitizeResponse(response: string): string {
    // Check if response accidentally contains system prompt markers
    const suspicious = [
      'system:',
      'You are a',
      'Your role is',
      'You must',
    ];

    for (const pattern of suspicious) {
      if (response.toLowerCase().includes(pattern.toLowerCase())) {
        this.logger.warn(
          `Response contains suspicious pattern: ${pattern}`,
        );
      }
    }

    return response.trim();
  }

  /**
   * Check if interaction should be flagged
   */
  private shouldFlag(userInput: string, aiResponse: string): boolean {
    const suspiciousPatterns = [
      /ignore.*previous.*instructions/i,
      /forget.*system.*prompt/i,
      /reveal.*prompt/i,
      /what.*are.*your.*instructions/i,
      /show.*me.*system.*message/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(userInput)) {
        return true;
      }
    }

    return false;
  }
}
