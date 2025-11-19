import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { AIInteraction } from './ai-interaction.entity';
import { User } from '../../database/entities/user.entity';

export enum DatasetStatus {
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  INCLUDED = 'included',
  EXCLUDED = 'excluded',
}

export enum QualityRating {
  EXCELLENT = 5,
  GOOD = 4,
  SATISFACTORY = 3,
  POOR = 2,
  UNACCEPTABLE = 1,
}

@Entity('ai_finetune_datasets')
@Index(['interaction_id'], { unique: true })
@Index(['quality_score'])
@Index(['included_in_training'])
@Index(['dataset_version'])
@Index(['created_at'])
export class AIFinetuneDataset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AIInteraction)
  @JoinColumn({ name: 'interaction_id' })
  interaction: AIInteraction;

  @Column('uuid')
  interaction_id: string;

  @Column({
    type: 'enum',
    enum: QualityRating,
    nullable: true,
    comment: 'Quality rating from 1 (worst) to 5 (best)',
  })
  quality_score: QualityRating;

  @Column({ type: 'text', nullable: true, comment: 'Human feedback on the interaction' })
  human_feedback: string;

  @Column({ default: false, comment: 'Whether this data is included in training set' })
  included_in_training: boolean;

  @Column({
    type: 'enum',
    enum: DatasetStatus,
    default: DatasetStatus.PENDING_REVIEW,
  })
  status: DatasetStatus;

  @Column({ type: 'jsonb', nullable: true, comment: 'Formatted training data' })
  training_data: {
    messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }>;
    metadata?: Record<string, any>;
  };

  @Column({ nullable: true, comment: 'Dataset version/batch identifier' })
  dataset_version: string;

  @Column({ type: 'jsonb', nullable: true, comment: 'Evaluation metrics' })
  evaluation_metrics: {
    relevance_score?: number;
    accuracy_score?: number;
    helpfulness_score?: number;
    safety_score?: number;
    coherence_score?: number;
    completeness_score?: number;
  };

  @Column({ type: 'text', nullable: true, comment: 'Notes about this training example' })
  notes: string;

  @Column({ type: 'jsonb', nullable: true, comment: 'Tags for categorization' })
  tags: string[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User;

  @Column({ type: 'uuid', nullable: true, comment: 'User who reviewed this data' })
  reviewed_by: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at: Date;

  @Column({ type: 'text', nullable: true, comment: 'Reason for rejection if rejected' })
  rejection_reason: string;

  @Column({ type: 'jsonb', nullable: true, comment: 'Original interaction context' })
  original_context: {
    session_type?: string;
    user_role?: string;
    interaction_number?: number;
    total_session_interactions?: number;
  };

  @Column({ default: false, comment: 'Whether this is a positive example' })
  is_positive_example: boolean;

  @Column({ default: false, comment: 'Whether this is a negative example for learning' })
  is_negative_example: boolean;

  @Column({ type: 'text', nullable: true, comment: 'Corrected/improved response for training' })
  corrected_response: string;

  @Column({ type: 'float', nullable: true, comment: 'Weight for this example in training' })
  training_weight: number;

  @Column({ type: 'jsonb', nullable: true, comment: 'Export history' })
  export_history: Array<{
    export_id: string;
    exported_at: Date;
    export_format: string;
  }>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  /**
   * Format data for OpenAI fine-tuning
   */
  formatForOpenAI(): object {
    if (!this.training_data) {
      return null;
    }

    return {
      messages: this.training_data.messages,
      metadata: {
        quality_score: this.quality_score,
        dataset_version: this.dataset_version,
        tags: this.tags,
        ...this.training_data.metadata,
      },
    };
  }

  /**
   * Format data for Anthropic fine-tuning
   */
  formatForAnthropic(): object {
    if (!this.training_data) {
      return null;
    }

    // Anthropic format uses conversations array
    const conversation = [];

    for (const message of this.training_data.messages) {
      if (message.role === 'system') {
        // Anthropic doesn't have system role, merge with first user message
        continue;
      }

      conversation.push({
        role: message.role === 'user' ? 'Human' : 'Assistant',
        content: message.content,
      });
    }

    return {
      conversation,
      metadata: {
        quality_score: this.quality_score,
        dataset_version: this.dataset_version,
        tags: this.tags,
        ...this.training_data.metadata,
      },
    };
  }

  /**
   * Calculate composite quality score
   */
  calculateCompositeScore(): number {
    if (!this.evaluation_metrics) {
      return this.quality_score || 0;
    }

    const metrics = this.evaluation_metrics;
    const weights = {
      relevance: 0.25,
      accuracy: 0.25,
      helpfulness: 0.2,
      safety: 0.1,
      coherence: 0.1,
      completeness: 0.1,
    };

    let totalScore = 0;
    let totalWeight = 0;

    if (metrics.relevance_score !== undefined) {
      totalScore += metrics.relevance_score * weights.relevance;
      totalWeight += weights.relevance;
    }
    if (metrics.accuracy_score !== undefined) {
      totalScore += metrics.accuracy_score * weights.accuracy;
      totalWeight += weights.accuracy;
    }
    if (metrics.helpfulness_score !== undefined) {
      totalScore += metrics.helpfulness_score * weights.helpfulness;
      totalWeight += weights.helpfulness;
    }
    if (metrics.safety_score !== undefined) {
      totalScore += metrics.safety_score * weights.safety;
      totalWeight += weights.safety;
    }
    if (metrics.coherence_score !== undefined) {
      totalScore += metrics.coherence_score * weights.coherence;
      totalWeight += weights.coherence;
    }
    if (metrics.completeness_score !== undefined) {
      totalScore += metrics.completeness_score * weights.completeness;
      totalWeight += weights.completeness;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Check if this example meets quality threshold for training
   */
  meetsQualityThreshold(minScore: number = 3): boolean {
    const compositeScore = this.calculateCompositeScore();
    return (
      this.status === DatasetStatus.APPROVED &&
      this.quality_score >= minScore &&
      compositeScore >= minScore / 5 &&
      !this.is_negative_example
    );
  }

  /**
   * Mark as exported
   */
  markAsExported(exportId: string, format: string) {
    if (!this.export_history) {
      this.export_history = [];
    }

    this.export_history.push({
      export_id: exportId,
      exported_at: new Date(),
      export_format: format,
    });
  }
}