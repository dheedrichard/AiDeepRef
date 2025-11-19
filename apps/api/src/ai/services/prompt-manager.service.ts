import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIPrompt } from '../entities/ai-prompt.entity';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

export interface CreatePromptDto {
  session_type: string;
  system_prompt: string;
  model_preference?: string;
  model_config?: Record<string, any>;
  notes?: string;
}

export interface UpdatePromptDto {
  system_prompt?: string;
  model_preference?: string;
  model_config?: Record<string, any>;
  is_active?: boolean;
  notes?: string;
}

@Injectable()
export class PromptManagerService {
  private readonly logger = new Logger(PromptManagerService.name);
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(
    @InjectRepository(AIPrompt)
    private promptRepository: Repository<AIPrompt>,
    private configService: ConfigService,
  ) {
    // Get encryption key from environment or generate one
    const keyString = this.configService.get<string>('PROMPT_ENCRYPTION_KEY') ||
                      crypto.randomBytes(32).toString('hex');
    this.encryptionKey = Buffer.from(keyString.substring(0, 64), 'hex');
  }

  /**
   * Get active prompt by session type
   * CRITICAL: This should NEVER be exposed to the client
   */
  async getPromptForSessionType(sessionType: string): Promise<AIPrompt> {
    const prompt = await this.promptRepository.findOne({
      where: {
        session_type: sessionType,
        is_active: true,
      },
      order: {
        version: 'DESC',
      },
    });

    if (!prompt) {
      throw new NotFoundException(
        `No active prompt found for session type: ${sessionType}`,
      );
    }

    return prompt;
  }

  /**
   * Get decrypted system prompt (server-side only)
   * CRITICAL: Never send this to client
   */
  async getDecryptedPrompt(promptId: string): Promise<string> {
    const prompt = await this.promptRepository.findOne({
      where: { id: promptId },
    });

    if (!prompt) {
      throw new NotFoundException(`Prompt not found: ${promptId}`);
    }

    return this.decryptSystemPrompt(prompt.system_prompt_encrypted);
  }

  /**
   * Create new prompt (Admin only)
   */
  async createPrompt(dto: CreatePromptDto): Promise<AIPrompt> {
    // Get current version for this session type
    const existingPrompts = await this.promptRepository.find({
      where: { session_type: dto.session_type },
      order: { version: 'DESC' },
    });

    const nextVersion = existingPrompts.length > 0
      ? existingPrompts[0].version + 1
      : 1;

    // Encrypt the system prompt
    const encryptedPrompt = this.encryptSystemPrompt(dto.system_prompt);

    const prompt = this.promptRepository.create({
      session_type: dto.session_type,
      system_prompt_encrypted: encryptedPrompt,
      model_preference: dto.model_preference || 'claude-3-5-sonnet-20241022',
      model_config: dto.model_config || {},
      notes: dto.notes,
      version: nextVersion,
      is_active: true,
    });

    // Deactivate all other prompts for this session type
    if (existingPrompts.length > 0) {
      await this.promptRepository.update(
        { session_type: dto.session_type },
        { is_active: false },
      );
    }

    await this.promptRepository.save(prompt);

    this.logger.log(
      `Created new prompt for ${dto.session_type}, version ${nextVersion}`,
    );

    return prompt;
  }

  /**
   * Update existing prompt (Admin only)
   */
  async updatePrompt(id: string, dto: UpdatePromptDto): Promise<AIPrompt> {
    const prompt = await this.promptRepository.findOne({ where: { id } });

    if (!prompt) {
      throw new NotFoundException(`Prompt not found: ${id}`);
    }

    if (dto.system_prompt) {
      prompt.system_prompt_encrypted = this.encryptSystemPrompt(dto.system_prompt);
    }

    if (dto.model_preference) {
      prompt.model_preference = dto.model_preference;
    }

    if (dto.model_config) {
      prompt.model_config = dto.model_config;
    }

    if (dto.is_active !== undefined) {
      // If activating this prompt, deactivate others
      if (dto.is_active) {
        await this.promptRepository.update(
          { session_type: prompt.session_type },
          { is_active: false },
        );
      }
      prompt.is_active = dto.is_active;
    }

    if (dto.notes) {
      prompt.notes = dto.notes;
    }

    await this.promptRepository.save(prompt);

    this.logger.log(`Updated prompt ${id}`);

    return prompt;
  }

  /**
   * List all prompts (Admin only)
   */
  async listPrompts(sessionType?: string): Promise<AIPrompt[]> {
    const where = sessionType ? { session_type: sessionType } : {};
    return this.promptRepository.find({
      where,
      order: {
        session_type: 'ASC',
        version: 'DESC',
      },
    });
  }

  /**
   * Encrypt system prompt
   * PRIVATE: Never expose encrypted or decrypted prompts to client
   */
  private encryptSystemPrompt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt system prompt
   * PRIVATE: Never expose this to client
   */
  private decryptSystemPrompt(encrypted: string): string {
    try {
      const parts = encrypted.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encryptedText = parts[2];

      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Failed to decrypt system prompt', error);
      throw new Error('Failed to decrypt system prompt');
    }
  }
}
