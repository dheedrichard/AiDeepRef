import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import {
  BaseAIProvider,
  AIOptions,
  AIResponse,
  ModelCapability,
  TaskType,
  ProviderStatus,
} from './base.provider';

/**
 * Google Gemini model definitions
 */
export const GOOGLE_MODELS = {
  GEMINI_3_PRO: 'gemini-3-pro',      // Complex tasks fallback
  GEMINI_3_FLASH: 'gemini-3-flash',  // Fast responses fallback
} as const;

/**
 * Model pricing per million tokens (example rates)
 */
const MODEL_PRICING = {
  [GOOGLE_MODELS.GEMINI_3_PRO]: { input: 2, output: 10 },
  [GOOGLE_MODELS.GEMINI_3_FLASH]: { input: 0.15, output: 0.75 },
};

/**
 * Task to model mapping for Google
 */
const TASK_MODEL_MAP: Record<TaskType, string> = {
  [TaskType.REFERENCE_ANALYSIS]: GOOGLE_MODELS.GEMINI_3_PRO,
  [TaskType.DEEPFAKE_DETECTION]: GOOGLE_MODELS.GEMINI_3_PRO,
  [TaskType.QUESTION_GENERATION]: GOOGLE_MODELS.GEMINI_3_PRO,
  [TaskType.SIMPLE_CLASSIFICATION]: GOOGLE_MODELS.GEMINI_3_FLASH,
  [TaskType.DOCUMENT_ANALYSIS]: GOOGLE_MODELS.GEMINI_3_PRO,
  [TaskType.REAL_TIME_CHAT]: GOOGLE_MODELS.GEMINI_3_FLASH,
};

/**
 * Capability to model mapping for Google
 */
const CAPABILITY_MODEL_MAP: Record<ModelCapability, string> = {
  [ModelCapability.SIMPLE]: GOOGLE_MODELS.GEMINI_3_FLASH,
  [ModelCapability.STANDARD]: GOOGLE_MODELS.GEMINI_3_PRO,
  [ModelCapability.COMPLEX]: GOOGLE_MODELS.GEMINI_3_PRO,
};

@Injectable()
export class GoogleProvider extends BaseAIProvider {
  private client: GoogleGenerativeAI;
  private models: Map<string, GenerativeModel> = new Map();
  private apiKey: string;
  private defaultModel: string;
  private maxRetries: number;

  constructor(private configService: ConfigService) {
    super('GoogleProvider');

    this.apiKey = this.configService.get<string>('GOOGLE_API_KEY');
    this.defaultModel = this.configService.get<string>(
      'GOOGLE_MODEL_PRO',
      GOOGLE_MODELS.GEMINI_3_PRO,
    );
    this.maxRetries = this.configService.get<number>('AI_RETRY_ATTEMPTS', 3);

    if (this.validateConfiguration()) {
      this.client = new GoogleGenerativeAI(this.apiKey);
      this.initializeModels();
      this.logger.log('Google provider initialized successfully');
    } else {
      this.logger.error('Failed to initialize Google provider');
      this.metrics.status = ProviderStatus.DISABLED;
    }
  }

  /**
   * Initialize generative models
   */
  private initializeModels(): void {
    try {
      // Initialize all available models
      Object.values(GOOGLE_MODELS).forEach(modelName => {
        const model = this.client.getGenerativeModel({
          model: modelName,
        });
        this.models.set(modelName, model);
      });
    } catch (error) {
      this.logger.error(`Failed to initialize models: ${error.message}`);
    }
  }

  /**
   * Generate AI response using Google Gemini
   */
  async generate(
    prompt: string,
    options: AIOptions = {},
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // Check availability
      if (!(await this.isAvailable())) {
        throw new Error('Google provider is not available');
      }

      // Select model based on task or capability
      const modelName = this.selectModel(options);
      const model = this.models.get(modelName);

      if (!model) {
        throw new Error(`Model ${modelName} not initialized`);
      }

      // Configure generation settings
      const generationConfig = {
        temperature: options.temperature || 0.7,
        topP: options.topP || 1,
        maxOutputTokens: options.maxTokens || 4096,
        stopSequences: options.stopSequences,
      };

      // Format prompt with system message if provided
      const fullPrompt = this.formatPromptString(prompt, options.systemPrompt);

      // Generate content
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig,
      });

      const response = await result.response;
      const content = response.text();
      const latency = Date.now() - startTime;

      // Extract token usage (approximate)
      const usage = response.usageMetadata;
      const inputTokens = usage?.promptTokenCount || 0;
      const outputTokens = usage?.candidatesTokenCount || 0;
      const cost = this.calculateCost(inputTokens, outputTokens, modelName);

      // Update success metrics
      this.updateSuccessMetrics(latency, inputTokens + outputTokens, cost);

      return {
        content,
        model: modelName,
        provider: this.name,
        tokenUsage: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens,
        },
        cost,
        latency,
        metadata: {
          finishReason: response.candidates?.[0]?.finishReason,
          safetyRatings: response.candidates?.[0]?.safetyRatings,
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
      const modelName = this.selectModel(options);
      const model = this.models.get(modelName);

      if (!model) {
        throw new Error(`Model ${modelName} not initialized`);
      }

      const generationConfig = {
        temperature: options.temperature || 0.7,
        topP: options.topP || 1,
        maxOutputTokens: options.maxTokens || 4096,
      };

      const fullPrompt = this.formatPromptString(prompt, options.systemPrompt);

      const result = await model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig,
      });

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
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
      const model = this.models.get(GOOGLE_MODELS.GEMINI_3_FLASH);
      if (!model) return false;

      await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
        generationConfig: { maxOutputTokens: 5 },
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
      this.logger.error('GOOGLE_API_KEY is not configured');
      return false;
    }

    if (!this.apiKey.startsWith('AIza')) {
      this.logger.error('Invalid GOOGLE_API_KEY format');
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
   * Format prompt with system message
   */
  private formatPromptString(
    prompt: string,
    systemPrompt?: string,
  ): string {
    if (systemPrompt) {
      return `System Instructions: ${systemPrompt}\n\nUser Request: ${prompt}`;
    }
    return prompt;
  }

  /**
   * Get provider statistics
   */
  getStatistics() {
    return {
      provider: this.name,
      models: GOOGLE_MODELS,
      metrics: this.getMetrics(),
      configuration: {
        defaultModel: this.defaultModel,
        maxRetries: this.maxRetries,
        apiKeyConfigured: !!this.apiKey,
        availableModels: Array.from(this.models.keys()),
      },
      pricing: MODEL_PRICING,
    };
  }
}