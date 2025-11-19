import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import * as crypto from 'crypto';

export enum ModelPreference {
  OPUS = 'claude-3-opus-20240229',
  SONNET = 'claude-3-5-sonnet-20241022',
  HAIKU = 'claude-3-haiku-20240307',
}

export enum PromptType {
  REFERENCE_COACH = 'reference_coach',
  VERIFICATION = 'verification',
  AUTHENTICITY = 'authenticity',
  QUALITY_ANALYSIS = 'quality_analysis',
  BULK_PROCESSING = 'bulk_processing',
}

@Entity('ai_prompts')
@Index(['prompt_id', 'version'], { unique: true })
@Index(['is_active'])
@Index(['prompt_type'])
export class AIPrompt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  prompt_id: string;

  @Column()
  name: string;

  @Column('text')
  system_prompt_encrypted: string;

  @Column('text')
  user_prompt_template: string;

  @Column()
  version: string;

  @Column({
    type: 'enum',
    enum: ModelPreference,
    default: ModelPreference.SONNET,
  })
  model_preference: ModelPreference;

  @Column({
    type: 'enum',
    enum: PromptType,
  })
  prompt_type: PromptType;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  usage_count: number;

  @Column({ type: 'float', default: 0 })
  average_response_time_ms: number;

  @Column({ type: 'float', default: 0 })
  success_rate: number;

  @Column({ type: 'int', default: 4096 })
  max_tokens: number;

  @Column({ type: 'float', default: 0.7 })
  temperature: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  validation_rules: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Virtual field for decrypted prompt (not stored in DB)
  system_prompt?: string;

  /**
   * Encrypts the system prompt before saving
   */
  encryptPrompt(prompt: string): string {
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
   * Decrypts the system prompt
   */
  decryptPrompt(): string {
    try {
      const algorithm = 'aes-256-gcm';
      const key = Buffer.from(process.env.AI_ENCRYPTION_KEY || '', 'hex');
      const encrypted = JSON.parse(this.system_prompt_encrypted);

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
      throw new Error('Failed to decrypt prompt');
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  updateMetrics() {
    // Ensure version format is semver
    if (!this.version.match(/^\d+\.\d+\.\d+$/)) {
      throw new Error('Version must be in semver format (e.g., 1.0.0)');
    }

    // Validate temperature range
    if (this.temperature < 0 || this.temperature > 1) {
      throw new Error('Temperature must be between 0 and 1');
    }

    // Validate max_tokens
    if (this.max_tokens < 1 || this.max_tokens > 200000) {
      throw new Error('Max tokens must be between 1 and 200000');
    }
  }
}