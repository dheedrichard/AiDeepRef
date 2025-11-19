import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  BaseAIProvider,
  AIOptions,
  AIResponse,
  ModelCapability,
  TaskType,
  ProviderStatus,
} from './base.provider';

/**
 * OpenAI model definitions
 */
export const OPENAI_MODELS = {
  GPT_5_1_TURBO: 'gpt-5.1-turbo',  // Latest model for all tasks
} as const;

/**
 * Model pricing per million tokens (example rates)
 */
const MODEL_PRICING = {
  [OPENAI_MODELS.GPT_5_1_TURBO]: { input: 5, output: 15 },
};

/**
 * Task to model mapping for OpenAI (all use same model as tertiary fallback)
 */
const TASK_MODEL_MAP: Record<TaskType, string> = {
  [TaskType.REFERENCE_ANALYSIS]: OPENAI_MODELS.GPT_5_1_TURBO,
  [TaskType.DEEPFAKE_DETECTION]: OPENAI_MODELS.GPT_5_1_TURBO,
  [TaskType.QUESTION_GENERATION]: OPENAI_MODELS.GPT_5_1_TURBO,
  [TaskType.SIMPLE_CLASSIFICATION]: OPENAI_MODELS.GPT_5_1_TURBO,
  [TaskType.DOCUMENT_ANALYSIS]: OPENAI_MODELS.GPT_5_1_TURBO,
  [TaskType.REAL_TIME_CHAT]: OPENAI_MODELS.GPT_5_1_TURBO,
};

/**
 * Capability to model mapping for OpenAI
 */
const CAPABILITY_MODEL_MAP: Record<ModelCapability, string> = {
  [ModelCapability.SIMPLE]: OPENAI_MODELS.GPT_5_1_TURBO,
  [ModelCapability.STANDARD]: OPENAI_MODELS.GPT_5_1_TURBO,
  [ModelCapability.COMPLEX]: OPENAI_MODELS.GPT_5_1_TURBO,
};

@Injectable()
export class OpenAIProvider extends BaseAIProvider {
  private client: OpenAI;
  private apiKey: string;
  private defaultModel: string;
  private maxRetries: number;
  private organization?: string;

  constructor(private configService: ConfigService) {
    super('OpenAIProvider');

    this.apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.organization = this.configService.get<string>('OPENAI_ORGANIZATION');
    this.defaultModel = this.configService.get<string>(
      'OPENAI_MODEL',
      OPENAI_MODELS.GPT_5_1_TURBO,
    );
    this.maxRetries = this.configService.get<number>('AI_RETRY_ATTEMPTS', 3);

    if (this.validateConfiguration()) {
      this.client = new OpenAI({
        apiKey: this.apiKey,
        organization: this.organization,
        maxRetries: this.maxRetries,
      });
      this.logger.log('OpenAI provider initialized successfully');
    } else {
      this.logger.error('Failed to initialize OpenAI provider');
      this.metrics.status = ProviderStatus.DISABLED;
    }
  }

  /**
   * Generate AI response using OpenAI
   */
  async generate(
    prompt: string,
    options: AIOptions = {},
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // Check availability
      if (!(await this.isAvailable())) {
        throw new Error('OpenAI provider is not available');
      }

      // Select model
      const model = this.selectModel(options);

      // Build messages
      const messages = this.buildMessages(prompt, options.systemPrompt);

      // Create chat completion
      const completion = await this.client.chat.completions.create({
        model,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 4096,
        top_p: options.topP || 1,
        frequency_penalty: options.frequencyPenalty || 0,
        presence_penalty: options.presencePenalty || 0,
        stop: options.stopSequences,
        stream: false,
      });

      const latency = Date.now() - startTime;
      const choice = completion.choices[0];
      const content = choice.message?.content || '';

      // Extract token usage
      const inputTokens = completion.usage?.prompt_tokens || 0;
      const outputTokens = completion.usage?.completion_tokens || 0;
      const totalTokens = completion.usage?.total_tokens || 0;
      const cost = this.calculateCost(inputTokens, outputTokens, model);

      // Update success metrics
      this.updateSuccessMetrics(latency, totalTokens, cost);

      return {
        content,
        model,
        provider: this.name,
        tokenUsage: {
          input: inputTokens,
          output: outputTokens,
          total: totalTokens,
        },
        cost,
        latency,
        metadata: {
          id: completion.id,
          finishReason: choice.finish_reason,
          systemFingerprint: completion.system_fingerprint,
        },
      };
    } catch (error) {
      const errorMessage = error.message || 'Unknown error';
      this.updateFailureMetrics(errorMessage);
      this.logger.error(`Generation failed: ${errorMessage}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate streaming response
   */
  async *generateStream(
    prompt: string,
    options: AIOptions = {},
  ): AsyncGenerator<string> {
    try {
      const model = this.selectModel(options);
      const messages = this.buildMessages(prompt, options.systemPrompt);

      const stream = await this.client.chat.completions.create({
        model,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 4096,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      this.logger.error(`Stream generation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    if (this.metrics.status === ProviderStatus.DISABLED) {
      return false;
    }

    if (this.metrics.status === ProviderStatus.RATE_LIMITED) {
      const timeSinceError = Date.now() - (this.metrics.lastErrorTime?.getTime() || 0);
      if (timeSinceError < 60000) {
        return false;
      }
      this.metrics.status = ProviderStatus.AVAILABLE;
    }

    try {
      // Simple health check
      await this.client.models.list();
      return true;
    } catch (error) {
      this.logger.warn(`Availability check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get model for specific task type
   */
  getModelForTask(taskType: TaskType): string {
    return TASK_MODEL_MAP[taskType] || this.defaultModel;
  }

  /**
   * Get model for capability level
   */
  getModelForCapability(capability: ModelCapability): string {
    return CAPABILITY_MODEL_MAP[capability] || this.defaultModel;
  }

  /**
   * Validate API configuration
   */
  validateConfiguration(): boolean {
    if (!this.apiKey) {
      this.logger.error('OPENAI_API_KEY is not configured');
      return false;
    }

    if (!this.apiKey.startsWith('sk-')) {
      this.logger.error('Invalid OPENAI_API_KEY format');
      return false;
    }

    return true;
  }

  /**
   * Calculate cost based on token usage
   */
  protected calculateCost(
    inputTokens: number,
    outputTokens: number,
    model: string,
  ): number {
    const pricing = MODEL_PRICING[model];
    if (!pricing) {
      this.logger.warn(`No pricing information for model: ${model}`);
      return 0;
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }

  /**
   * Select appropriate model based on options
   */
  private selectModel(options: AIOptions): string {
    // For OpenAI as tertiary fallback, we primarily use GPT-5.1-turbo
    if (options.model) {
      return options.model;
    }

    // Since OpenAI is tertiary fallback, we use the same model for all tasks
    return this.defaultModel;
  }

  /**
   * Build messages array for OpenAI API
   */
  private buildMessages(
    prompt: string,
    systemPrompt?: string,
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    return messages;
  }

  /**
   * Get provider statistics
   */
  getStatistics() {
    return {
      provider: this.name,
      models: OPENAI_MODELS,
      metrics: this.getMetrics(),
      configuration: {
        defaultModel: this.defaultModel,
        maxRetries: this.maxRetries,
        apiKeyConfigured: !!this.apiKey,
        organizationConfigured: !!this.organization,
      },
      pricing: MODEL_PRICING,
      role: 'Tertiary Fallback Provider',
    };
  }
}