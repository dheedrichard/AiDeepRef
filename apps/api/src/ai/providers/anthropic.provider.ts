import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  BaseAIProvider,
  AIOptions,
  AIResponse,
  ModelCapability,
  TaskType,
  ProviderStatus,
} from './base.provider';

/**
 * Anthropic model definitions with latest versions
 */
export const ANTHROPIC_MODELS = {
  OPUS_4_1: 'claude-opus-4-20250514',      // Complex reasoning, architecture
  SONNET_4_5: 'claude-sonnet-4-5-20250514', // Main logic, reference analysis
  HAIKU_4_5: 'claude-haiku-4-5-20250514',   // Fast responses, simple tasks
} as const;

/**
 * Model pricing per million tokens (example rates)
 */
const MODEL_PRICING = {
  [ANTHROPIC_MODELS.OPUS_4_1]: { input: 15, output: 75 },
  [ANTHROPIC_MODELS.SONNET_4_5]: { input: 3, output: 15 },
  [ANTHROPIC_MODELS.HAIKU_4_5]: { input: 0.25, output: 1.25 },
};

/**
 * Task to model mapping for Anthropic
 */
const TASK_MODEL_MAP: Record<TaskType, string> = {
  [TaskType.REFERENCE_ANALYSIS]: ANTHROPIC_MODELS.SONNET_4_5,
  [TaskType.DEEPFAKE_DETECTION]: ANTHROPIC_MODELS.OPUS_4_1,
  [TaskType.QUESTION_GENERATION]: ANTHROPIC_MODELS.SONNET_4_5,
  [TaskType.SIMPLE_CLASSIFICATION]: ANTHROPIC_MODELS.HAIKU_4_5,
  [TaskType.DOCUMENT_ANALYSIS]: ANTHROPIC_MODELS.OPUS_4_1,
  [TaskType.REAL_TIME_CHAT]: ANTHROPIC_MODELS.HAIKU_4_5,
};

/**
 * Capability to model mapping for Anthropic
 */
const CAPABILITY_MODEL_MAP: Record<ModelCapability, string> = {
  [ModelCapability.SIMPLE]: ANTHROPIC_MODELS.HAIKU_4_5,
  [ModelCapability.STANDARD]: ANTHROPIC_MODELS.SONNET_4_5,
  [ModelCapability.COMPLEX]: ANTHROPIC_MODELS.OPUS_4_1,
};

@Injectable()
export class AnthropicProvider extends BaseAIProvider {
  private client: Anthropic;
  private apiKey: string;
  private defaultModel: string;
  private maxRetries: number;

  constructor(private configService: ConfigService) {
    super('AnthropicProvider');

    this.apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.defaultModel = this.configService.get<string>(
      'ANTHROPIC_MODEL_SONNET',
      ANTHROPIC_MODELS.SONNET_4_5,
    );
    this.maxRetries = this.configService.get<number>('AI_RETRY_ATTEMPTS', 3);

    if (this.validateConfiguration()) {
      this.client = new Anthropic({
        apiKey: this.apiKey,
        maxRetries: this.maxRetries,
      });
      this.logger.log('Anthropic provider initialized successfully');
    } else {
      this.logger.error('Failed to initialize Anthropic provider');
      this.metrics.status = ProviderStatus.DISABLED;
    }
  }

  /**
   * Generate AI response using Anthropic
   */
  async generate(
    prompt: string,
    options: AIOptions = {},
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // Check availability
      if (!(await this.isAvailable())) {
        throw new Error('Anthropic provider is not available');
      }

      // Select model based on task or capability
      const model = this.selectModel(options);

      // Format messages
      const messages = this.formatMessages(prompt, options.systemPrompt);

      // Create completion
      const response = await this.client.messages.create({
        model,
        messages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 1,
        stop_sequences: options.stopSequences,
        stream: false,
      });

      const latency = Date.now() - startTime;
      const inputTokens = response.usage?.input_tokens || 0;
      const outputTokens = response.usage?.output_tokens || 0;
      const cost = this.calculateCost(inputTokens, outputTokens, model);

      // Update success metrics
      this.updateSuccessMetrics(latency, inputTokens + outputTokens, cost);

      // Extract content
      const content = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('\n');

      return {
        content,
        model,
        provider: this.name,
        tokenUsage: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens,
        },
        cost,
        latency,
        metadata: {
          messageId: response.id,
          stopReason: response.stop_reason,
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
      const messages = this.formatMessages(prompt, options.systemPrompt);

      const stream = await this.client.messages.create({
        model,
        messages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7,
        stream: true,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta') {
          yield event.delta.text;
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
      // Check if rate limit period has passed (1 minute cooldown)
      const timeSinceError = Date.now() - (this.metrics.lastErrorTime?.getTime() || 0);
      if (timeSinceError < 60000) {
        return false;
      }
      // Reset status after cooldown
      this.metrics.status = ProviderStatus.AVAILABLE;
    }

    try {
      // Simple health check - list models
      await this.client.messages.create({
        model: ANTHROPIC_MODELS.HAIKU_4_5,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      });
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
      this.logger.error('ANTHROPIC_API_KEY is not configured');
      return false;
    }

    if (!this.apiKey.startsWith('sk-ant-')) {
      this.logger.error('Invalid ANTHROPIC_API_KEY format');
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
    // Priority: explicit model > task type > capability > default
    if (options.model) {
      return options.model;
    }

    if (options.taskType) {
      return this.getModelForTask(options.taskType);
    }

    if (options.capability) {
      return this.getModelForCapability(options.capability);
    }

    return this.defaultModel;
  }

  /**
   * Format messages for Anthropic API
   */
  private formatMessages(
    prompt: string,
    systemPrompt?: string,
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // Add system prompt as first user message with clear separation
    if (systemPrompt) {
      messages.push({
        role: 'user',
        content: `System: ${systemPrompt}\n\nUser: ${prompt}`,
      });
    } else {
      messages.push({
        role: 'user',
        content: prompt,
      });
    }

    return messages;
  }

  /**
   * Get provider statistics
   */
  getStatistics() {
    return {
      provider: this.name,
      models: ANTHROPIC_MODELS,
      metrics: this.getMetrics(),
      configuration: {
        defaultModel: this.defaultModel,
        maxRetries: this.maxRetries,
        apiKeyConfigured: !!this.apiKey,
      },
      pricing: MODEL_PRICING,
    };
  }
}