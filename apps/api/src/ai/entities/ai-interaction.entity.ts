import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { AISession } from './ai-session.entity';
import { AIPrompt } from './ai-prompt.entity';
import * as crypto from 'crypto';

export enum InteractionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
}

@Entity('ai_interactions')
@Index(['session_id'])
@Index(['prompt_id'])
@Index(['created_at'])
@Index(['success'])
@Index(['model_used'])
export class AIInteraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  interaction_id: string;

  @ManyToOne(() => AISession, (session) => session.interactions)
  @JoinColumn({ name: 'session_id' })
  session: AISession;

  @Column('uuid', { comment: 'Session this interaction belongs to' })
  session_id: string;

  @ManyToOne(() => AIPrompt)
  @JoinColumn({ name: 'prompt_id' })
  prompt: AIPrompt;

  @Column('uuid', { comment: 'Prompt version used for this interaction' })
  prompt_id: string;

  @Column('text', { comment: 'User input message' })
  user_input: string;

  @Column('text', { nullable: true, comment: 'AI response (sanitized - no system prompts)' })
  ai_response: string;

  @Column({ nullable: true, comment: 'Model version used for this interaction' })
  model_used: string;

  @Column({ type: 'int', default: 0, comment: 'Total tokens used' })
  tokens_used: number;

  @Column({ type: 'int', default: 0, comment: 'Input tokens' })
  input_tokens: number;

  @Column({ type: 'int', default: 0, comment: 'Output tokens' })
  output_tokens: number;

  @Column({ type: 'float', default: 0, comment: 'Cost of this interaction' })
  cost: number;

  @Column({ type: 'int', default: 0, comment: 'Response time in milliseconds' })
  response_time_ms: number;

  @Column({ default: false })
  success: boolean;

  @Column({
    type: 'enum',
    enum: InteractionStatus,
    default: InteractionStatus.PENDING,
  })
  status: InteractionStatus;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ type: 'jsonb', nullable: true, comment: 'Additional interaction context' })
  context: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true, comment: 'Request metadata' })
  request_metadata: {
    ip_address?: string;
    user_agent?: string;
    referrer?: string;
    session_data?: Record<string, any>;
  };

  @Column({ type: 'jsonb', nullable: true, comment: 'Response metadata' })
  response_metadata: {
    model_temperature?: number;
    max_tokens?: number;
    stop_sequences?: string[];
    completion_reason?: string;
    cache_hit?: boolean;
  };

  @Column({ type: 'text', nullable: true, comment: 'System prompt hash for versioning' })
  prompt_hash: string;

  @Column({ type: 'text', nullable: true, comment: 'Combined prompt sent to LLM (encrypted)' })
  full_prompt_encrypted: string;

  @Column({ default: false, comment: 'Whether user input was sanitized' })
  input_sanitized: boolean;

  @Column({ type: 'jsonb', nullable: true, comment: 'Input validation results' })
  validation_results: {
    passed?: boolean;
    rules_applied?: string[];
    modifications?: string[];
    warnings?: string[];
  };

  @Column({ default: false, comment: 'Flagged for review' })
  flagged_for_review: boolean;

  @Column({ type: 'text', nullable: true, comment: 'Reason for flagging' })
  flag_reason: string;

  @Column({ type: 'float', nullable: true, comment: 'Quality score from 0 to 1' })
  quality_score: number;

  @Column({ default: false, comment: 'Whether this interaction was retried' })
  is_retry: boolean;

  @Column({ type: 'uuid', nullable: true, comment: 'Original interaction ID if this is a retry' })
  retry_of_interaction_id: string;

  @Column({ type: 'int', default: 0, comment: 'Number of retry attempts' })
  retry_count: number;

  @CreateDateColumn()
  created_at: Date;

  @BeforeInsert()
  generateInteractionId() {
    // Generate unique interaction ID with timestamp prefix for easy sorting
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(8).toString('hex');
    this.interaction_id = `int_${timestamp}_${random}`;
  }

  /**
   * Encrypt the full prompt for storage
   */
  encryptFullPrompt(prompt: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.AI_ENCRYPTION_KEY || '', 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(prompt, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      encrypted,
    });
  }

  /**
   * Decrypt the full prompt
   */
  decryptFullPrompt(): string | null {
    if (!this.full_prompt_encrypted) {
      return null;
    }

    try {
      const algorithm = 'aes-256-gcm';
      const key = Buffer.from(process.env.AI_ENCRYPTION_KEY || '', 'hex');
      const encrypted = JSON.parse(this.full_prompt_encrypted);

      const decipher = crypto.createDecipheriv(
        algorithm,
        key,
        Buffer.from(encrypted.iv, 'hex')
      );

      decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));

      let decrypted = decipher.update(encrypted.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt full prompt:', error);
      return null;
    }
  }

  /**
   * Calculate hash of the prompt for versioning
   */
  calculatePromptHash(systemPrompt: string): string {
    return crypto.createHash('sha256').update(systemPrompt).digest('hex');
  }

  /**
   * Calculate the cost based on token usage and model
   */
  calculateCost(): number {
    // Pricing per 1M tokens (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-opus-20240229': { input: 15, output: 75 },
      'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
      'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
      'gpt-4-turbo': { input: 10, output: 30 },
      'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    };

    const modelPricing = pricing[this.model_used] || { input: 3, output: 15 };

    const inputCost = (this.input_tokens / 1000000) * modelPricing.input;
    const outputCost = (this.output_tokens / 1000000) * modelPricing.output;

    this.cost = inputCost + outputCost;
    return this.cost;
  }

  /**
   * Mark interaction as successful
   */
  markAsSuccess(response: string, tokens: { input: number; output: number }) {
    this.status = InteractionStatus.SUCCESS;
    this.success = true;
    this.ai_response = response;
    this.input_tokens = tokens.input;
    this.output_tokens = tokens.output;
    this.tokens_used = tokens.input + tokens.output;
    this.calculateCost();
  }

  /**
   * Mark interaction as failed
   */
  markAsFailed(error: string) {
    this.status = InteractionStatus.FAILED;
    this.success = false;
    this.error_message = error;
  }

  /**
   * Check if interaction should be included in fine-tuning dataset
   */
  isEligibleForFineTuning(): boolean {
    return (
      this.success &&
      this.quality_score !== null &&
      this.quality_score >= 0.7 &&
      !this.flagged_for_review &&
      this.ai_response !== null &&
      this.ai_response.length > 0
    );
  }
}
