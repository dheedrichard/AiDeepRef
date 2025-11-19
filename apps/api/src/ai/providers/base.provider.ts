import { Logger } from '@nestjs/common';

/**
 * Model capability levels for intelligent task routing
 */
export enum ModelCapability {
  SIMPLE = 'simple',        // Fast, simple tasks (Haiku, Flash)
  STANDARD = 'standard',    // Standard complexity (Sonnet)
  COMPLEX = 'complex',      // Complex reasoning (Opus)
}

/**
 * Task types for model selection
 */
export enum TaskType {
  REFERENCE_ANALYSIS = 'reference_analysis',
  DEEPFAKE_DETECTION = 'deepfake_detection',
  QUESTION_GENERATION = 'question_generation',
  SIMPLE_CLASSIFICATION = 'simple_classification',
  DOCUMENT_ANALYSIS = 'document_analysis',
  REAL_TIME_CHAT = 'real_time_chat',
}

/**
 * Provider status for monitoring
 */
export enum ProviderStatus {
  AVAILABLE = 'available',
  RATE_LIMITED = 'rate_limited',
  ERROR = 'error',
  DISABLED = 'disabled',
}

/**
 * AI request options
 */
export interface AIOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  systemPrompt?: string;
  timeout?: number;
  retryAttempts?: number;
  taskType?: TaskType;
  capability?: ModelCapability;
  stream?: boolean;
}

/**
 * AI response structure
 */
export interface AIResponse {
  content: string;
  model: string;
  provider: string;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
  cost?: number;
  latency?: number;
  metadata?: Record<string, any>;
}

/**
 * Provider metrics for monitoring
 */
export interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  totalTokens: number;
  totalCost: number;
  lastError?: string;
  lastErrorTime?: Date;
  status: ProviderStatus;
}

/**
 * Abstract base class for AI providers
 */
export abstract class BaseAIProvider {
  protected readonly logger: Logger;
  protected metrics: ProviderMetrics;

  constructor(protected readonly name: string) {
    this.logger = new Logger(name);
    this.metrics = this.initializeMetrics();
  }

  /**
   * Generate AI response
   */
  abstract generate(
    prompt: string,
    options?: AIOptions,
  ): Promise<AIResponse>;

  /**
   * Generate streaming response
   */
  abstract generateStream(
    prompt: string,
    options?: AIOptions,
  ): AsyncGenerator<string>;

  /**
   * Check if provider is available
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Get provider-specific model for task type
   */
  abstract getModelForTask(taskType: TaskType): string;

  /**
   * Get provider-specific model for capability level
   */
  abstract getModelForCapability(capability: ModelCapability): string;

  /**
   * Validate API configuration
   */
  abstract validateConfiguration(): boolean;

  /**
   * Get provider name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get provider metrics
   */
  getMetrics(): ProviderMetrics {
    return { ...this.metrics };
  }

  /**
   * Update metrics after successful request
   */
  protected updateSuccessMetrics(
    latency: number,
    tokens: number,
    cost: number,
  ): void {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    this.metrics.totalTokens += tokens;
    this.metrics.totalCost += cost;
    this.metrics.averageLatency =
      (this.metrics.averageLatency * (this.metrics.successfulRequests - 1) +
        latency) /
      this.metrics.successfulRequests;
    this.metrics.status = ProviderStatus.AVAILABLE;
  }

  /**
   * Update metrics after failed request
   */
  protected updateFailureMetrics(error: string): void {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
    this.metrics.lastError = error;
    this.metrics.lastErrorTime = new Date();

    // Update status based on error type
    if (error.includes('rate limit')) {
      this.metrics.status = ProviderStatus.RATE_LIMITED;
    } else if (this.metrics.failedRequests > 5) {
      this.metrics.status = ProviderStatus.ERROR;
    }
  }

  /**
   * Reset provider metrics
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): ProviderMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      totalTokens: 0,
      totalCost: 0,
      status: ProviderStatus.AVAILABLE,
    };
  }

  /**
   * Calculate cost based on token usage
   */
  protected abstract calculateCost(
    inputTokens: number,
    outputTokens: number,
    model: string,
  ): number;

  /**
   * Format prompt with system message
   */
  protected formatPrompt(
    prompt: string,
    systemPrompt?: string,
  ): string | Array<{ role: string; content: string }> {
    if (systemPrompt) {
      return [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ];
    }
    return prompt;
  }

  /**
   * Handle rate limiting with exponential backoff
   */
  protected async handleRateLimit(attempt: number): Promise<void> {
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
    this.logger.warn(`Rate limited. Waiting ${delay}ms before retry...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Log provider activity
   */
  protected logActivity(
    action: string,
    details: Record<string, any>,
  ): void {
    this.logger.debug(`[${action}] ${JSON.stringify(details)}`);
  }
}