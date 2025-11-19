import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BaseAIProvider,
  AIOptions,
  AIResponse,
  ProviderStatus,
} from '../providers/base.provider';
import { AnthropicProvider } from '../providers/anthropic.provider';
import { GoogleProvider } from '../providers/google.provider';
import { OpenAIProvider } from '../providers/openai.provider';

/**
 * Provider priority levels
 */
export enum ProviderPriority {
  PRIMARY = 1,
  SECONDARY = 2,
  TERTIARY = 3,
}

/**
 * Provider configuration
 */
interface ProviderConfig {
  provider: BaseAIProvider;
  priority: ProviderPriority;
  weight: number; // For load balancing (future enhancement)
  enabled: boolean;
}

/**
 * Fallback exception for all providers failure
 */
export class AllProvidersFailedException extends Error {
  constructor(public readonly attempts: FailedAttempt[]) {
    super('All AI providers failed to generate response');
    this.name = 'AllProvidersFailedException';
  }
}

/**
 * Failed attempt tracking
 */
export interface FailedAttempt {
  provider: string;
  error: string;
  timestamp: Date;
  latency: number;
}

/**
 * Fallback strategy for multi-provider AI service
 */
@Injectable()
export class FallbackStrategy {
  private readonly logger = new Logger(FallbackStrategy.name);
  private providers: ProviderConfig[] = [];
  private readonly fallbackEnabled: boolean;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;
  private readonly costOptimization: boolean;

  constructor(
    private configService: ConfigService,
    private anthropicProvider: AnthropicProvider,
    private googleProvider: GoogleProvider,
    private openAIProvider: OpenAIProvider,
  ) {
    this.fallbackEnabled = this.configService.get<boolean>(
      'AI_FALLBACK_ENABLED',
      true,
    );
    this.maxRetries = this.configService.get<number>('AI_RETRY_ATTEMPTS', 3);
    this.timeoutMs = this.configService.get<number>('AI_TIMEOUT_MS', 30000);
    this.costOptimization = this.configService.get<boolean>(
      'AI_COST_OPTIMIZATION',
      true,
    );

    this.initializeProviders();
  }

  /**
   * Initialize provider configuration
   */
  private initializeProviders(): void {
    // Primary: Anthropic
    this.providers.push({
      provider: this.anthropicProvider,
      priority: ProviderPriority.PRIMARY,
      weight: 0.7, // 70% of traffic when load balancing
      enabled: true,
    });

    // Secondary: Google
    this.providers.push({
      provider: this.googleProvider,
      priority: ProviderPriority.SECONDARY,
      weight: 0.2, // 20% of traffic when load balancing
      enabled: true,
    });

    // Tertiary: OpenAI
    this.providers.push({
      provider: this.openAIProvider,
      priority: ProviderPriority.TERTIARY,
      weight: 0.1, // 10% of traffic when load balancing
      enabled: true,
    });

    // Sort by priority
    this.providers.sort((a, b) => a.priority - b.priority);

    this.logger.log(
      `Fallback strategy initialized with ${this.providers.length} providers`,
    );
  }

  /**
   * Execute AI call with automatic fallback
   */
  async execute(
    prompt: string,
    options: AIOptions = {},
  ): Promise<AIResponse> {
    const failedAttempts: FailedAttempt[] = [];
    const startTime = Date.now();

    // Get ordered list of providers to try
    const providersToTry = this.getProvidersToTry(options);

    for (const config of providersToTry) {
      const attemptStartTime = Date.now();

      try {
        // Check if provider is available
        if (!(await this.isProviderAvailable(config.provider))) {
          throw new Error(`Provider ${config.provider.getName()} is not available`);
        }

        // Add timeout to options
        const optionsWithTimeout = {
          ...options,
          timeout: options.timeout || this.timeoutMs,
        };

        // Attempt to generate response
        const response = await this.executeWithTimeout(
          config.provider,
          prompt,
          optionsWithTimeout,
        );

        // Log successful execution
        this.logSuccess(config.provider.getName(), response, Date.now() - startTime);

        // Add provider information to response
        response.metadata = {
          ...response.metadata,
          fallbackAttempts: failedAttempts.length,
          totalLatency: Date.now() - startTime,
        };

        return response;
      } catch (error) {
        const latency = Date.now() - attemptStartTime;
        const errorMessage = error.message || 'Unknown error';

        // Track failed attempt
        failedAttempts.push({
          provider: config.provider.getName(),
          error: errorMessage,
          timestamp: new Date(),
          latency,
        });

        // Log failure
        this.logFailure(config.provider.getName(), errorMessage, latency);

        // If this was the last provider, throw comprehensive error
        if (config === providersToTry[providersToTry.length - 1]) {
          throw new AllProvidersFailedException(failedAttempts);
        }

        // Continue to next provider
        this.logger.warn(
          `Provider ${config.provider.getName()} failed, trying next provider...`,
        );
      }
    }

    // Should not reach here, but throw error if it does
    throw new AllProvidersFailedException(failedAttempts);
  }

  /**
   * Execute streaming response with fallback
   */
  async *executeStream(
    prompt: string,
    options: AIOptions = {},
  ): AsyncGenerator<string> {
    const failedAttempts: FailedAttempt[] = [];
    const providersToTry = this.getProvidersToTry(options);

    for (const config of providersToTry) {
      try {
        const generator = config.provider.generateStream(prompt, options);

        // Yield all chunks from the successful provider
        for await (const chunk of generator) {
          yield chunk;
        }

        // If we successfully streamed, exit
        return;
      } catch (error) {
        failedAttempts.push({
          provider: config.provider.getName(),
          error: error.message,
          timestamp: new Date(),
          latency: 0,
        });

        if (config === providersToTry[providersToTry.length - 1]) {
          throw new AllProvidersFailedException(failedAttempts);
        }
      }
    }
  }

  /**
   * Get ordered list of providers to try
   */
  private getProvidersToTry(options: AIOptions): ProviderConfig[] {
    // Filter enabled providers
    let availableProviders = this.providers.filter(p => p.enabled);

    // If fallback is disabled, only use primary provider
    if (!this.fallbackEnabled) {
      return availableProviders.filter(p => p.priority === ProviderPriority.PRIMARY);
    }

    // Cost optimization: prefer cheaper models for simple tasks
    if (this.costOptimization && options.capability === 'simple') {
      // Reorder to prioritize cheaper providers for simple tasks
      availableProviders = this.reorderForCostOptimization(availableProviders);
    }

    return availableProviders;
  }

  /**
   * Reorder providers for cost optimization
   */
  private reorderForCostOptimization(
    providers: ProviderConfig[],
  ): ProviderConfig[] {
    // For simple tasks, we might prefer Google Flash or Anthropic Haiku
    // This is a simplified implementation
    return providers.sort((a, b) => {
      // Keep the general priority order but adjust weights
      const costWeight = a.weight * 1.5; // Adjust based on cost considerations
      return a.priority - b.priority;
    });
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout(
    provider: BaseAIProvider,
    prompt: string,
    options: AIOptions,
  ): Promise<AIResponse> {
    return Promise.race([
      provider.generate(prompt, options),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timeout after ${options.timeout}ms`)),
          options.timeout || this.timeoutMs,
        ),
      ),
    ]);
  }

  /**
   * Check if provider is available
   */
  private async isProviderAvailable(provider: BaseAIProvider): Promise<boolean> {
    try {
      const metrics = provider.getMetrics();

      // Check provider status
      if (metrics.status === ProviderStatus.DISABLED) {
        return false;
      }

      // Check for recent failures
      if (metrics.status === ProviderStatus.ERROR) {
        const timeSinceError = Date.now() - (metrics.lastErrorTime?.getTime() || 0);
        // Allow retry after 5 minutes
        if (timeSinceError < 300000) {
          return false;
        }
      }

      // Perform actual availability check
      return await provider.isAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Log successful execution
   */
  private logSuccess(
    providerName: string,
    response: AIResponse,
    totalLatency: number,
  ): void {
    this.logger.debug({
      event: 'AI_EXECUTION_SUCCESS',
      provider: providerName,
      model: response.model,
      tokenUsage: response.tokenUsage,
      cost: response.cost,
      latency: response.latency,
      totalLatency,
    });
  }

  /**
   * Log failed execution
   */
  private logFailure(
    providerName: string,
    error: string,
    latency: number,
  ): void {
    this.logger.warn({
      event: 'AI_EXECUTION_FAILURE',
      provider: providerName,
      error,
      latency,
    });
  }

  /**
   * Get statistics for all providers
   */
  getStatistics() {
    return {
      fallbackEnabled: this.fallbackEnabled,
      costOptimization: this.costOptimization,
      providers: this.providers.map(config => ({
        name: config.provider.getName(),
        priority: ProviderPriority[config.priority],
        weight: config.weight,
        enabled: config.enabled,
        metrics: config.provider.getMetrics(),
      })),
    };
  }

  /**
   * Reset all provider metrics
   */
  resetMetrics(): void {
    this.providers.forEach(config => {
      config.provider.resetMetrics();
    });
    this.logger.log('All provider metrics reset');
  }

  /**
   * Enable/disable specific provider
   */
  setProviderEnabled(providerName: string, enabled: boolean): void {
    const config = this.providers.find(
      p => p.provider.getName() === providerName,
    );
    if (config) {
      config.enabled = enabled;
      this.logger.log(`Provider ${providerName} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Get provider by name
   */
  getProvider(name: string): BaseAIProvider | undefined {
    const config = this.providers.find(p => p.provider.getName() === name);
    return config?.provider;
  }
}