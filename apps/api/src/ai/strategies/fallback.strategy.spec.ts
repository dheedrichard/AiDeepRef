import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FallbackStrategy, AllProvidersFailedException } from './fallback.strategy';
import { AnthropicProvider } from '../providers/anthropic.provider';
import { GoogleProvider } from '../providers/google.provider';
import { OpenAIProvider } from '../providers/openai.provider';
import { AIOptions, AIResponse, TaskType, ModelCapability } from '../providers/base.provider';

describe('FallbackStrategy', () => {
  let fallbackStrategy: FallbackStrategy;
  let anthropicProvider: AnthropicProvider;
  let googleProvider: GoogleProvider;
  let openAIProvider: OpenAIProvider;
  let configService: ConfigService;

  // Mock response
  const mockResponse: AIResponse = {
    content: 'Test response',
    model: 'test-model',
    provider: 'TestProvider',
    tokenUsage: { input: 10, output: 20, total: 30 },
    cost: 0.001,
    latency: 100,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FallbackStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                'AI_FALLBACK_ENABLED': true,
                'AI_RETRY_ATTEMPTS': 3,
                'AI_TIMEOUT_MS': 30000,
                'AI_COST_OPTIMIZATION': true,
              };
              return config[key];
            }),
          },
        },
        {
          provide: AnthropicProvider,
          useValue: {
            getName: jest.fn().mockReturnValue('AnthropicProvider'),
            generate: jest.fn(),
            generateStream: jest.fn(),
            isAvailable: jest.fn(),
            getMetrics: jest.fn().mockReturnValue({
              status: 'available',
              totalRequests: 0,
              successfulRequests: 0,
              failedRequests: 0,
            }),
            resetMetrics: jest.fn(),
          },
        },
        {
          provide: GoogleProvider,
          useValue: {
            getName: jest.fn().mockReturnValue('GoogleProvider'),
            generate: jest.fn(),
            generateStream: jest.fn(),
            isAvailable: jest.fn(),
            getMetrics: jest.fn().mockReturnValue({
              status: 'available',
              totalRequests: 0,
              successfulRequests: 0,
              failedRequests: 0,
            }),
            resetMetrics: jest.fn(),
          },
        },
        {
          provide: OpenAIProvider,
          useValue: {
            getName: jest.fn().mockReturnValue('OpenAIProvider'),
            generate: jest.fn(),
            generateStream: jest.fn(),
            isAvailable: jest.fn(),
            getMetrics: jest.fn().mockReturnValue({
              status: 'available',
              totalRequests: 0,
              successfulRequests: 0,
              failedRequests: 0,
            }),
            resetMetrics: jest.fn(),
          },
        },
      ],
    }).compile();

    fallbackStrategy = module.get<FallbackStrategy>(FallbackStrategy);
    anthropicProvider = module.get<AnthropicProvider>(AnthropicProvider);
    googleProvider = module.get<GoogleProvider>(GoogleProvider);
    openAIProvider = module.get<OpenAIProvider>(OpenAIProvider);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('execute', () => {
    it('should successfully execute with primary provider', async () => {
      // Arrange
      jest.spyOn(anthropicProvider, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(anthropicProvider, 'generate').mockResolvedValue(mockResponse);

      // Act
      const result = await fallbackStrategy.execute('Test prompt');

      // Assert
      expect(result).toEqual(expect.objectContaining({
        content: 'Test response',
        provider: 'TestProvider',
      }));
      expect(anthropicProvider.generate).toHaveBeenCalledWith('Test prompt', expect.any(Object));
      expect(googleProvider.generate).not.toHaveBeenCalled();
      expect(openAIProvider.generate).not.toHaveBeenCalled();
    });

    it('should fallback to secondary provider when primary fails', async () => {
      // Arrange
      jest.spyOn(anthropicProvider, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(anthropicProvider, 'generate').mockRejectedValue(new Error('Primary failed'));
      jest.spyOn(googleProvider, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(googleProvider, 'generate').mockResolvedValue({
        ...mockResponse,
        provider: 'GoogleProvider',
      });

      // Act
      const result = await fallbackStrategy.execute('Test prompt');

      // Assert
      expect(result.provider).toBe('GoogleProvider');
      expect(anthropicProvider.generate).toHaveBeenCalled();
      expect(googleProvider.generate).toHaveBeenCalled();
      expect(openAIProvider.generate).not.toHaveBeenCalled();
    });

    it('should fallback to tertiary provider when primary and secondary fail', async () => {
      // Arrange
      jest.spyOn(anthropicProvider, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(anthropicProvider, 'generate').mockRejectedValue(new Error('Primary failed'));
      jest.spyOn(googleProvider, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(googleProvider, 'generate').mockRejectedValue(new Error('Secondary failed'));
      jest.spyOn(openAIProvider, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(openAIProvider, 'generate').mockResolvedValue({
        ...mockResponse,
        provider: 'OpenAIProvider',
      });

      // Act
      const result = await fallbackStrategy.execute('Test prompt');

      // Assert
      expect(result.provider).toBe('OpenAIProvider');
      expect(anthropicProvider.generate).toHaveBeenCalled();
      expect(googleProvider.generate).toHaveBeenCalled();
      expect(openAIProvider.generate).toHaveBeenCalled();
    });

    it('should throw AllProvidersFailedException when all providers fail', async () => {
      // Arrange
      jest.spyOn(anthropicProvider, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(anthropicProvider, 'generate').mockRejectedValue(new Error('Primary failed'));
      jest.spyOn(googleProvider, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(googleProvider, 'generate').mockRejectedValue(new Error('Secondary failed'));
      jest.spyOn(openAIProvider, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(openAIProvider, 'generate').mockRejectedValue(new Error('Tertiary failed'));

      // Act & Assert
      await expect(fallbackStrategy.execute('Test prompt')).rejects.toThrow(
        AllProvidersFailedException,
      );
    });

    it('should skip unavailable providers', async () => {
      // Arrange
      jest.spyOn(anthropicProvider, 'isAvailable').mockResolvedValue(false);
      jest.spyOn(googleProvider, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(googleProvider, 'generate').mockResolvedValue({
        ...mockResponse,
        provider: 'GoogleProvider',
      });

      // Act
      const result = await fallbackStrategy.execute('Test prompt');

      // Assert
      expect(result.provider).toBe('GoogleProvider');
      expect(anthropicProvider.generate).not.toHaveBeenCalled();
      expect(googleProvider.generate).toHaveBeenCalled();
    });

    it('should respect task type in options', async () => {
      // Arrange
      const options: AIOptions = {
        taskType: TaskType.DEEPFAKE_DETECTION,
        capability: ModelCapability.COMPLEX,
      };
      jest.spyOn(anthropicProvider, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(anthropicProvider, 'generate').mockResolvedValue(mockResponse);

      // Act
      await fallbackStrategy.execute('Test prompt', options);

      // Assert
      expect(anthropicProvider.generate).toHaveBeenCalledWith(
        'Test prompt',
        expect.objectContaining({
          taskType: TaskType.DEEPFAKE_DETECTION,
          capability: ModelCapability.COMPLEX,
        }),
      );
    });

    it('should add fallback metadata to response', async () => {
      // Arrange
      jest.spyOn(anthropicProvider, 'isAvailable').mockResolvedValue(false);
      jest.spyOn(googleProvider, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(googleProvider, 'generate').mockResolvedValue(mockResponse);

      // Act
      const result = await fallbackStrategy.execute('Test prompt');

      // Assert
      expect(result.metadata).toHaveProperty('fallbackAttempts');
      expect(result.metadata).toHaveProperty('totalLatency');
    });
  });

  describe('executeStream', () => {
    it('should stream from primary provider', async () => {
      // Arrange
      const mockGenerator = async function* () {
        yield 'chunk1';
        yield 'chunk2';
      };
      jest.spyOn(anthropicProvider, 'generateStream').mockReturnValue(mockGenerator());

      // Act
      const generator = fallbackStrategy.executeStream('Test prompt');
      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      // Assert
      expect(chunks).toEqual(['chunk1', 'chunk2']);
      expect(anthropicProvider.generateStream).toHaveBeenCalled();
      expect(googleProvider.generateStream).not.toHaveBeenCalled();
    });

    it('should fallback on streaming failure', async () => {
      // Arrange
      const failingGenerator = async function* () {
        throw new Error('Stream failed');
      };
      const workingGenerator = async function* () {
        yield 'google-chunk';
      };
      jest.spyOn(anthropicProvider, 'generateStream').mockReturnValue(failingGenerator());
      jest.spyOn(googleProvider, 'generateStream').mockReturnValue(workingGenerator());

      // Act
      const generator = fallbackStrategy.executeStream('Test prompt');
      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      // Assert
      expect(chunks).toEqual(['google-chunk']);
      expect(googleProvider.generateStream).toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it('should return statistics for all providers', () => {
      // Act
      const stats = fallbackStrategy.getStatistics();

      // Assert
      expect(stats).toHaveProperty('fallbackEnabled', true);
      expect(stats).toHaveProperty('costOptimization', true);
      expect(stats.providers).toHaveLength(3);
      expect(stats.providers[0].name).toBe('AnthropicProvider');
      expect(stats.providers[1].name).toBe('GoogleProvider');
      expect(stats.providers[2].name).toBe('OpenAIProvider');
    });
  });

  describe('resetMetrics', () => {
    it('should reset metrics for all providers', () => {
      // Act
      fallbackStrategy.resetMetrics();

      // Assert
      expect(anthropicProvider.resetMetrics).toHaveBeenCalled();
      expect(googleProvider.resetMetrics).toHaveBeenCalled();
      expect(openAIProvider.resetMetrics).toHaveBeenCalled();
    });
  });

  describe('setProviderEnabled', () => {
    it('should enable/disable specific provider', () => {
      // Act
      fallbackStrategy.setProviderEnabled('AnthropicProvider', false);
      const stats = fallbackStrategy.getStatistics();

      // Assert
      const anthropicStats = stats.providers.find(p => p.name === 'AnthropicProvider');
      expect(anthropicStats?.enabled).toBe(false);
    });
  });

  describe('getProvider', () => {
    it('should return provider by name', () => {
      // Act
      const provider = fallbackStrategy.getProvider('AnthropicProvider');

      // Assert
      expect(provider).toBe(anthropicProvider);
    });

    it('should return undefined for unknown provider', () => {
      // Act
      const provider = fallbackStrategy.getProvider('UnknownProvider');

      // Assert
      expect(provider).toBeUndefined();
    });
  });

  describe('Timeout handling', () => {
    it('should timeout long-running requests', async () => {
      // Arrange
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'AI_TIMEOUT_MS') return 100; // Short timeout
        return true;
      });

      const slowProvider = new Promise((resolve) => {
        setTimeout(() => resolve(mockResponse), 5000);
      });
      jest.spyOn(anthropicProvider, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(anthropicProvider, 'generate').mockReturnValue(slowProvider as any);
      jest.spyOn(googleProvider, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(googleProvider, 'generate').mockResolvedValue(mockResponse);

      // Recreate strategy with new timeout
      const module = await Test.createTestingModule({
        providers: [
          FallbackStrategy,
          { provide: ConfigService, useValue: configService },
          { provide: AnthropicProvider, useValue: anthropicProvider },
          { provide: GoogleProvider, useValue: googleProvider },
          { provide: OpenAIProvider, useValue: openAIProvider },
        ],
      }).compile();

      const strategy = module.get<FallbackStrategy>(FallbackStrategy);

      // Act
      const result = await strategy.execute('Test prompt', { timeout: 100 });

      // Assert
      expect(result.provider).toBe('TestProvider');
      expect(googleProvider.generate).toHaveBeenCalled();
    });
  });

  describe('Cost optimization', () => {
    it('should reorder providers for simple tasks when cost optimization is enabled', async () => {
      // Arrange
      const options: AIOptions = {
        capability: ModelCapability.SIMPLE,
      };
      jest.spyOn(anthropicProvider, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(anthropicProvider, 'generate').mockResolvedValue(mockResponse);

      // Act
      await fallbackStrategy.execute('Test prompt', options);

      // Assert
      expect(anthropicProvider.generate).toHaveBeenCalledWith(
        'Test prompt',
        expect.objectContaining({
          capability: ModelCapability.SIMPLE,
        }),
      );
    });
  });
});

describe('AllProvidersFailedException', () => {
  it('should create exception with failed attempts', () => {
    // Arrange
    const attempts = [
      {
        provider: 'Provider1',
        error: 'Error1',
        timestamp: new Date(),
        latency: 100,
      },
      {
        provider: 'Provider2',
        error: 'Error2',
        timestamp: new Date(),
        latency: 200,
      },
    ];

    // Act
    const exception = new AllProvidersFailedException(attempts);

    // Assert
    expect(exception.message).toBe('All AI providers failed to generate response');
    expect(exception.attempts).toEqual(attempts);
    expect(exception.name).toBe('AllProvidersFailedException');
  });
});