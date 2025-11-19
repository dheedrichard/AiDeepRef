import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { AIInteraction } from '../entities/ai-interaction.entity';
import { AIFinetuneDataset, DatasetStatus, QualityRating } from '../entities/ai-finetune-dataset.entity';
import { AISession } from '../entities/ai-session.entity';
import { PromptManagerService } from './prompt-manager.service';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface FineTuneExportOptions {
  format: 'openai' | 'anthropic' | 'jsonl';
  sessionTypes?: string[];
  startDate?: Date;
  endDate?: Date;
  minQualityScore?: number;
  maxExamples?: number;
  includeNegativeExamples?: boolean;
  datasetVersion?: string;
}

export interface ExportResult {
  exportId: string;
  filePath: string;
  recordCount: number;
  format: string;
  metadata: Record<string, any>;
}

@Injectable()
export class FineTuneExporterService {
  private readonly logger = new Logger(FineTuneExporterService.name);
  private readonly exportDir = path.join(process.cwd(), 'exports', 'finetune');

  constructor(
    @InjectRepository(AIInteraction)
    private interactionRepository: Repository<AIInteraction>,
    @InjectRepository(AIFinetuneDataset)
    private datasetRepository: Repository<AIFinetuneDataset>,
    @InjectRepository(AISession)
    private sessionRepository: Repository<AISession>,
    private promptManager: PromptManagerService,
  ) {}

  /**
   * Export fine-tuning dataset with quality filtering
   */
  async exportDataset(
    options: FineTuneExportOptions,
    exportedBy: string
  ): Promise<ExportResult> {
    this.logger.log(`Starting fine-tune export with options:`, options);

    // Ensure export directory exists
    await fs.mkdir(this.exportDir, { recursive: true });

    // Generate export ID
    const exportId = `ft_export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Query dataset entries
    const dataset = await this.queryDataset(options);

    if (dataset.length === 0) {
      throw new NotFoundException('No qualifying data found for export');
    }

    // Format data based on target platform
    let formattedData: any[];
    switch (options.format) {
      case 'openai':
        formattedData = await this.formatForOpenAI(dataset);
        break;
      case 'anthropic':
        formattedData = await this.formatForAnthropic(dataset);
        break;
      default:
        formattedData = await this.formatAsJSONL(dataset);
    }

    // Apply max examples limit
    if (options.maxExamples && formattedData.length > options.maxExamples) {
      formattedData = formattedData.slice(0, options.maxExamples);
    }

    // Write to file
    const filename = `${exportId}_${options.format}.jsonl`;
    const filePath = path.join(this.exportDir, filename);

    const content = formattedData
      .map(item => JSON.stringify(item))
      .join('\n');

    await fs.writeFile(filePath, content);

    // Update dataset entries with export info
    await this.markAsExported(dataset, exportId, options.format);

    // Generate metadata
    const metadata = {
      exportedAt: new Date(),
      exportedBy,
      options,
      statistics: await this.calculateStatistics(dataset),
    };

    // Write metadata file
    const metadataPath = path.join(this.exportDir, `${exportId}_metadata.json`);
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    this.logger.log(`Export completed: ${filename} with ${formattedData.length} examples`);

    return {
      exportId,
      filePath,
      recordCount: formattedData.length,
      format: options.format,
      metadata,
    };
  }

  /**
   * Prepare interactions for fine-tuning dataset
   */
  async prepareInteractionsForDataset(
    criteria: {
      sessionType?: string;
      startDate?: Date;
      endDate?: Date;
      minTokens?: number;
    }
  ): Promise<number> {
    const queryBuilder = this.interactionRepository
      .createQueryBuilder('interaction')
      .leftJoinAndSelect('interaction.session', 'session')
      .leftJoinAndSelect('interaction.prompt', 'prompt')
      .where('interaction.success = :success', { success: true })
      .andWhere('interaction.flagged_for_review = :flagged', { flagged: false });

    if (criteria.sessionType) {
      queryBuilder.andWhere('session.session_type = :sessionType', {
        sessionType: criteria.sessionType,
      });
    }

    if (criteria.startDate && criteria.endDate) {
      queryBuilder.andWhere('interaction.created_at BETWEEN :startDate AND :endDate', {
        startDate: criteria.startDate,
        endDate: criteria.endDate,
      });
    }

    if (criteria.minTokens) {
      queryBuilder.andWhere('interaction.tokens_used >= :minTokens', {
        minTokens: criteria.minTokens,
      });
    }

    const interactions = await queryBuilder.getMany();

    let createdCount = 0;

    for (const interaction of interactions) {
      // Check if already in dataset
      const existing = await this.datasetRepository.findOne({
        where: { interaction_id: interaction.id },
      });

      if (existing) {
        continue;
      }

      // Get decrypted system prompt (for training data only, never exposed)
      const systemPrompt = await this.promptManager.getDecryptedSystemPrompt(
        interaction.prompt_id
      );

      // Create dataset entry
      const datasetEntry = this.datasetRepository.create({
        interaction_id: interaction.id,
        status: DatasetStatus.PENDING_REVIEW,
        training_data: {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: interaction.user_input },
            { role: 'assistant', content: interaction.ai_response },
          ],
        },
        original_context: {
          session_type: interaction.session.session_type,
          interaction_number: interaction.session.interaction_count,
        },
        dataset_version: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      });

      await this.datasetRepository.save(datasetEntry);
      createdCount++;
    }

    this.logger.log(`Prepared ${createdCount} new interactions for dataset`);
    return createdCount;
  }

  /**
   * Review and rate dataset entry
   */
  async reviewDatasetEntry(
    entryId: string,
    review: {
      quality_score: QualityRating;
      human_feedback?: string;
      include_in_training: boolean;
      corrected_response?: string;
      tags?: string[];
      reviewer_id: string;
    }
  ): Promise<AIFinetuneDataset> {
    const entry = await this.datasetRepository.findOne({
      where: { id: entryId },
    });

    if (!entry) {
      throw new NotFoundException(`Dataset entry not found: ${entryId}`);
    }

    // Update review data
    entry.quality_score = review.quality_score;
    entry.human_feedback = review.human_feedback;
    entry.included_in_training = review.include_in_training;
    entry.status = review.include_in_training
      ? DatasetStatus.APPROVED
      : DatasetStatus.REJECTED;
    entry.reviewed_by = review.reviewer_id;
    entry.reviewed_at = new Date();

    if (review.corrected_response) {
      entry.corrected_response = review.corrected_response;
      // Update training data with corrected response
      if (entry.training_data) {
        const assistantMessage = entry.training_data.messages.find(
          m => m.role === 'assistant'
        );
        if (assistantMessage) {
          assistantMessage.content = review.corrected_response;
        }
      }
    }

    if (review.tags) {
      entry.tags = review.tags;
    }

    // Calculate evaluation metrics
    entry.evaluation_metrics = {
      relevance_score: review.quality_score / 5,
      accuracy_score: review.quality_score / 5,
      helpfulness_score: review.quality_score / 5,
      safety_score: 1.0, // Assume safe unless flagged
      coherence_score: review.quality_score / 5,
      completeness_score: review.quality_score / 5,
    };

    await this.datasetRepository.save(entry);

    this.logger.log(`Reviewed dataset entry ${entryId}: score=${review.quality_score}`);

    return entry;
  }

  /**
   * Query dataset based on options
   */
  private async queryDataset(
    options: FineTuneExportOptions
  ): Promise<AIFinetuneDataset[]> {
    const queryBuilder = this.datasetRepository
      .createQueryBuilder('dataset')
      .leftJoinAndSelect('dataset.interaction', 'interaction')
      .where('dataset.included_in_training = :included', { included: true })
      .andWhere('dataset.status = :status', { status: DatasetStatus.APPROVED });

    if (options.minQualityScore) {
      queryBuilder.andWhere('dataset.quality_score >= :minScore', {
        minScore: options.minQualityScore,
      });
    }

    if (!options.includeNegativeExamples) {
      queryBuilder.andWhere('dataset.is_negative_example = :negative', {
        negative: false,
      });
    }

    if (options.datasetVersion) {
      queryBuilder.andWhere('dataset.dataset_version = :version', {
        version: options.datasetVersion,
      });
    }

    if (options.startDate && options.endDate) {
      queryBuilder.andWhere('dataset.created_at BETWEEN :startDate AND :endDate', {
        startDate: options.startDate,
        endDate: options.endDate,
      });
    }

    return await queryBuilder.getMany();
  }

  /**
   * Format dataset for OpenAI fine-tuning
   */
  private async formatForOpenAI(
    dataset: AIFinetuneDataset[]
  ): Promise<any[]> {
    return dataset
      .filter(entry => entry.training_data)
      .map(entry => entry.formatForOpenAI())
      .filter(data => data !== null);
  }

  /**
   * Format dataset for Anthropic fine-tuning
   */
  private async formatForAnthropic(
    dataset: AIFinetuneDataset[]
  ): Promise<any[]> {
    return dataset
      .filter(entry => entry.training_data)
      .map(entry => entry.formatForAnthropic())
      .filter(data => data !== null);
  }

  /**
   * Format dataset as generic JSONL
   */
  private async formatAsJSONL(
    dataset: AIFinetuneDataset[]
  ): Promise<any[]> {
    return dataset
      .filter(entry => entry.training_data)
      .map(entry => ({
        id: entry.id,
        interaction_id: entry.interaction_id,
        messages: entry.training_data.messages,
        quality_score: entry.quality_score,
        tags: entry.tags,
        dataset_version: entry.dataset_version,
        metadata: {
          ...entry.training_data.metadata,
          reviewed_at: entry.reviewed_at,
          is_corrected: !!entry.corrected_response,
        },
      }));
  }

  /**
   * Mark dataset entries as exported
   */
  private async markAsExported(
    dataset: AIFinetuneDataset[],
    exportId: string,
    format: string
  ): Promise<void> {
    for (const entry of dataset) {
      entry.markAsExported(exportId, format);
      await this.datasetRepository.save(entry);
    }
  }

  /**
   * Calculate export statistics
   */
  private async calculateStatistics(
    dataset: AIFinetuneDataset[]
  ): Promise<Record<string, any>> {
    const qualityScores = dataset
      .map(d => d.quality_score)
      .filter(score => score !== null);

    const avgQuality = qualityScores.length > 0
      ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
      : 0;

    const tagFrequency: Record<string, number> = {};
    dataset.forEach(entry => {
      if (entry.tags) {
        entry.tags.forEach(tag => {
          tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
        });
      }
    });

    return {
      total_examples: dataset.length,
      average_quality_score: avgQuality,
      quality_distribution: {
        excellent: dataset.filter(d => d.quality_score === 5).length,
        good: dataset.filter(d => d.quality_score === 4).length,
        satisfactory: dataset.filter(d => d.quality_score === 3).length,
        poor: dataset.filter(d => d.quality_score === 2).length,
        unacceptable: dataset.filter(d => d.quality_score === 1).length,
      },
      corrected_responses: dataset.filter(d => d.corrected_response).length,
      positive_examples: dataset.filter(d => d.is_positive_example).length,
      negative_examples: dataset.filter(d => d.is_negative_example).length,
      tag_frequency: tagFrequency,
    };
  }

  /**
   * Get export history
   */
  async getExportHistory(limit: number = 10): Promise<any[]> {
    const files = await fs.readdir(this.exportDir);
    const metadataFiles = files.filter(f => f.endsWith('_metadata.json'));

    const exports = [];
    for (const file of metadataFiles.slice(0, limit)) {
      const content = await fs.readFile(path.join(this.exportDir, file), 'utf-8');
      exports.push(JSON.parse(content));
    }

    return exports.sort((a, b) =>
      new Date(b.exportedAt).getTime() - new Date(a.exportedAt).getTime()
    );
  }
}