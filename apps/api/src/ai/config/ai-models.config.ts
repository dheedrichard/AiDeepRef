import { registerAs } from '@nestjs/config';
import { TaskType, ModelCapability } from '../providers/base.provider';

/**
 * Model selection configuration for intelligent routing
 */
export interface ModelSelectionConfig {
  taskType: TaskType;
  preferredProvider: 'anthropic' | 'google' | 'openai';
  preferredModel: string;
  fallbackModels: Array<{
    provider: string;
    model: string;
  }>;
  maxTokens?: number;
  temperature?: number;
  costWeight: number; // 0-1, higher = more cost sensitive
  qualityWeight: number; // 0-1, higher = prefer better quality
}

/**
 * AI Models Configuration
 */
export default registerAs('aiModels', () => ({
  // Provider API Keys
  providers: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      models: {
        opus: process.env.ANTHROPIC_MODEL_OPUS || 'claude-opus-4-20250514',
        sonnet: process.env.ANTHROPIC_MODEL_SONNET || 'claude-sonnet-4-5-20250514',
        haiku: process.env.ANTHROPIC_MODEL_HAIKU || 'claude-haiku-4-5-20250514',
      },
      enabled: process.env.ANTHROPIC_ENABLED !== 'false',
      priority: 1,
    },
    google: {
      apiKey: process.env.GOOGLE_API_KEY,
      models: {
        pro: process.env.GOOGLE_MODEL_PRO || 'gemini-3-pro',
        flash: process.env.GOOGLE_MODEL_FLASH || 'gemini-3-flash',
      },
      enabled: process.env.GOOGLE_ENABLED !== 'false',
      priority: 2,
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORGANIZATION,
      models: {
        gpt5: process.env.OPENAI_MODEL || 'gpt-5.1-turbo',
      },
      enabled: process.env.OPENAI_ENABLED !== 'false',
      priority: 3,
    },
  },

  // Fallback Strategy Configuration
  fallback: {
    enabled: process.env.AI_FALLBACK_ENABLED !== 'false',
    retryAttempts: parseInt(process.env.AI_RETRY_ATTEMPTS || '3', 10),
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '30000', 10),
    costOptimization: process.env.AI_COST_OPTIMIZATION !== 'false',
    circuitBreaker: {
      enabled: process.env.AI_CIRCUIT_BREAKER_ENABLED !== 'false',
      failureThreshold: parseInt(process.env.AI_CIRCUIT_BREAKER_THRESHOLD || '5', 10),
      resetTimeMs: parseInt(process.env.AI_CIRCUIT_BREAKER_RESET_MS || '60000', 10),
    },
  },

  // Task-specific model selection
  taskMapping: [
    // Reference Analysis - High quality, balanced cost
    {
      taskType: TaskType.REFERENCE_ANALYSIS,
      preferredProvider: 'anthropic',
      preferredModel: 'claude-sonnet-4-5-20250514',
      fallbackModels: [
        { provider: 'google', model: 'gemini-3-pro' },
        { provider: 'openai', model: 'gpt-5.1-turbo' },
      ],
      maxTokens: 4096,
      temperature: 0.7,
      costWeight: 0.5,
      qualityWeight: 0.8,
    },

    // Deepfake Detection - Highest quality, complex reasoning
    {
      taskType: TaskType.DEEPFAKE_DETECTION,
      preferredProvider: 'anthropic',
      preferredModel: 'claude-opus-4-20250514',
      fallbackModels: [
        { provider: 'google', model: 'gemini-3-pro' },
        { provider: 'openai', model: 'gpt-5.1-turbo' },
      ],
      maxTokens: 8192,
      temperature: 0.3,
      costWeight: 0.3,
      qualityWeight: 1.0,
    },

    // Question Generation - Creative, balanced
    {
      taskType: TaskType.QUESTION_GENERATION,
      preferredProvider: 'anthropic',
      preferredModel: 'claude-sonnet-4-5-20250514',
      fallbackModels: [
        { provider: 'google', model: 'gemini-3-flash' },
        { provider: 'openai', model: 'gpt-5.1-turbo' },
      ],
      maxTokens: 2048,
      temperature: 0.8,
      costWeight: 0.6,
      qualityWeight: 0.7,
    },

    // Simple Classification - Fast, cheap
    {
      taskType: TaskType.SIMPLE_CLASSIFICATION,
      preferredProvider: 'anthropic',
      preferredModel: 'claude-haiku-4-5-20250514',
      fallbackModels: [
        { provider: 'google', model: 'gemini-3-flash' },
        { provider: 'openai', model: 'gpt-5.1-turbo' },
      ],
      maxTokens: 512,
      temperature: 0.3,
      costWeight: 0.9,
      qualityWeight: 0.5,
    },

    // Document Analysis - Complex, high quality
    {
      taskType: TaskType.DOCUMENT_ANALYSIS,
      preferredProvider: 'anthropic',
      preferredModel: 'claude-opus-4-20250514',
      fallbackModels: [
        { provider: 'google', model: 'gemini-3-pro' },
        { provider: 'openai', model: 'gpt-5.1-turbo' },
      ],
      maxTokens: 16384,
      temperature: 0.5,
      costWeight: 0.4,
      qualityWeight: 0.9,
    },

    // Real-time Chat - Fast response, low latency
    {
      taskType: TaskType.REAL_TIME_CHAT,
      preferredProvider: 'anthropic',
      preferredModel: 'claude-haiku-4-5-20250514',
      fallbackModels: [
        { provider: 'google', model: 'gemini-3-flash' },
        { provider: 'openai', model: 'gpt-5.1-turbo' },
      ],
      maxTokens: 1024,
      temperature: 0.7,
      costWeight: 0.8,
      qualityWeight: 0.6,
    },
  ] as ModelSelectionConfig[],

  // Rate limiting configuration
  rateLimiting: {
    enabled: process.env.AI_RATE_LIMITING_ENABLED !== 'false',
    anthropic: {
      requestsPerMinute: parseInt(process.env.ANTHROPIC_RATE_LIMIT_RPM || '50', 10),
      tokensPerMinute: parseInt(process.env.ANTHROPIC_RATE_LIMIT_TPM || '100000', 10),
    },
    google: {
      requestsPerMinute: parseInt(process.env.GOOGLE_RATE_LIMIT_RPM || '60', 10),
      tokensPerMinute: parseInt(process.env.GOOGLE_RATE_LIMIT_TPM || '100000', 10),
    },
    openai: {
      requestsPerMinute: parseInt(process.env.OPENAI_RATE_LIMIT_RPM || '60', 10),
      tokensPerMinute: parseInt(process.env.OPENAI_RATE_LIMIT_TPM || '150000', 10),
    },
  },

  // Monitoring and logging
  monitoring: {
    enabled: process.env.AI_MONITORING_ENABLED !== 'false',
    logLevel: process.env.AI_LOG_LEVEL || 'info',
    metricsInterval: parseInt(process.env.AI_METRICS_INTERVAL_MS || '60000', 10),
    costTracking: process.env.AI_COST_TRACKING_ENABLED !== 'false',
    alerting: {
      enabled: process.env.AI_ALERTING_ENABLED !== 'false',
      costThreshold: parseFloat(process.env.AI_COST_ALERT_THRESHOLD || '100'),
      errorThreshold: parseInt(process.env.AI_ERROR_ALERT_THRESHOLD || '10', 10),
    },
  },

  // Caching configuration
  caching: {
    enabled: process.env.AI_CACHING_ENABLED !== 'false',
    ttl: parseInt(process.env.AI_CACHE_TTL_SECONDS || '3600', 10),
    maxSize: parseInt(process.env.AI_CACHE_MAX_SIZE_MB || '100', 10),
    redis: {
      enabled: process.env.AI_REDIS_CACHE_ENABLED === 'true',
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
    },
  },

  // System prompts and templates
  systemPrompts: {
    referenceCoach: process.env.AI_PROMPT_REFERENCE_COACH ||
      'You are an expert career coach specializing in professional references. ' +
      'Help candidates prepare for reference checks by providing guidance and generating relevant questions.',

    verificationOrchestrator: process.env.AI_PROMPT_VERIFICATION ||
      'You are a verification specialist focused on document authenticity and identity verification. ' +
      'Analyze documents and biometric data to ensure authenticity and detect potential fraud.',

    authenticityAnalyzer: process.env.AI_PROMPT_AUTHENTICITY ||
      'You are an expert in media analysis and deepfake detection. ' +
      'Analyze video and audio content to determine authenticity and identify potential manipulation.',

    referenceIntelligence: process.env.AI_PROMPT_INTELLIGENCE ||
      'You are a reference analysis expert. Extract insights from reference interviews and assess quality. ' +
      'Focus on identifying specific examples, competencies, and potential concerns.',
  },

  // Feature flags
  features: {
    streaming: process.env.AI_STREAMING_ENABLED !== 'false',
    batchProcessing: process.env.AI_BATCH_PROCESSING_ENABLED === 'true',
    asyncProcessing: process.env.AI_ASYNC_PROCESSING_ENABLED !== 'false',
    multiModal: process.env.AI_MULTIMODAL_ENABLED === 'true',
  },
}));