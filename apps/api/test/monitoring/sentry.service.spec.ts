import { Test, TestingModule } from '@nestjs/testing';
import { SentryService } from '../../src/monitoring/sentry.service';
import * as Sentry from '@sentry/node';

// Mock Sentry
jest.mock('@sentry/node');

describe('SentryService', () => {
  let service: SentryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SentryService],
    }).compile();

    service = module.get<SentryService>(SentryService);

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('captureException', () => {
    it('should capture an exception with context', () => {
      const mockEventId = 'test-event-id';
      (Sentry.captureException as jest.Mock).mockReturnValue(mockEventId);

      const error = new Error('Test error');
      const context = {
        tags: { test: 'tag' },
        extra: { test: 'extra' },
        level: 'error' as Sentry.SeverityLevel,
      };

      const eventId = service.captureException(error, context);

      expect(Sentry.captureException).toHaveBeenCalledWith(error, expect.objectContaining({
        tags: context.tags,
        extra: expect.any(Object),
        level: context.level,
      }));
      expect(eventId).toBe(mockEventId);
    });

    it('should sanitize sensitive data from context', () => {
      const mockEventId = 'test-event-id';
      (Sentry.captureException as jest.Mock).mockReturnValue(mockEventId);

      const error = new Error('Test error');
      const context = {
        extra: {
          password: 'secret123',
          token: 'abc123',
          normalData: 'visible',
        },
      };

      service.captureException(error, context);

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          extra: expect.objectContaining({
            password: '[FILTERED]',
            token: '[FILTERED]',
            normalData: 'visible',
          }),
        })
      );
    });
  });

  describe('captureMessage', () => {
    it('should capture a message with default level', () => {
      const mockEventId = 'test-event-id';
      (Sentry.captureMessage as jest.Mock).mockReturnValue(mockEventId);

      const message = 'Test message';
      const eventId = service.captureMessage(message);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(message, expect.objectContaining({
        level: 'info',
      }));
      expect(eventId).toBe(mockEventId);
    });

    it('should capture a message with custom level', () => {
      const mockEventId = 'test-event-id';
      (Sentry.captureMessage as jest.Mock).mockReturnValue(mockEventId);

      const message = 'Test warning';
      const eventId = service.captureMessage(message, 'warning');

      expect(Sentry.captureMessage).toHaveBeenCalledWith(message, expect.objectContaining({
        level: 'warning',
      }));
      expect(eventId).toBe(mockEventId);
    });
  });

  describe('setUser', () => {
    it('should set user context with masked email', () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'admin',
      };

      service.setUser(user);

      expect(Sentry.setUser).toHaveBeenCalledWith(expect.objectContaining({
        id: user.id,
        username: user.username,
        email: expect.stringContaining('t***@example.com'),
      }));
    });

    it('should clear user context when null is passed', () => {
      service.setUser(null);

      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });

    it('should set user role as tag', () => {
      const user = {
        id: '123',
        role: 'admin',
      };

      service.setUser(user);

      expect(Sentry.setTag).toHaveBeenCalledWith('user.role', 'admin');
    });
  });

  describe('addBreadcrumb', () => {
    it('should add a breadcrumb with default values', () => {
      const breadcrumb = {
        message: 'Test breadcrumb',
      };

      service.addBreadcrumb(breadcrumb);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
        message: breadcrumb.message,
        category: 'custom',
        level: 'info',
      }));
    });

    it('should add a breadcrumb with custom values', () => {
      const breadcrumb = {
        message: 'Test breadcrumb',
        category: 'http',
        level: 'warning' as Sentry.SeverityLevel,
        data: { test: 'data' },
      };

      service.addBreadcrumb(breadcrumb);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
        message: breadcrumb.message,
        category: breadcrumb.category,
        level: breadcrumb.level,
        data: expect.any(Object),
      }));
    });

    it('should sanitize breadcrumb data', () => {
      const breadcrumb = {
        message: 'Test breadcrumb',
        data: {
          password: 'secret',
          normalData: 'visible',
        },
      };

      service.addBreadcrumb(breadcrumb);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          password: '[FILTERED]',
          normalData: 'visible',
        }),
      }));
    });
  });

  describe('setContext', () => {
    it('should set custom context', () => {
      const context = {
        key1: 'value1',
        key2: 'value2',
      };

      service.setContext('test', context);

      expect(Sentry.setContext).toHaveBeenCalledWith('test', expect.any(Object));
    });

    it('should sanitize context data', () => {
      const context = {
        apiKey: 'secret-key',
        normalData: 'visible',
      };

      service.setContext('test', context);

      expect(Sentry.setContext).toHaveBeenCalledWith('test', expect.objectContaining({
        apiKey: '[FILTERED]',
        normalData: 'visible',
      }));
    });
  });

  describe('trackMetric', () => {
    it('should track a gauge metric', () => {
      service.trackMetric('test.metric', 100, 'millisecond', { tag: 'value' });

      expect(Sentry.metrics.gauge).toHaveBeenCalledWith('test.metric', 100, {
        unit: 'millisecond',
        tags: { tag: 'value' },
      });
    });
  });

  describe('incrementCounter', () => {
    it('should increment a counter', () => {
      service.incrementCounter('test.counter', 1, { tag: 'value' });

      expect(Sentry.metrics.increment).toHaveBeenCalledWith('test.counter', 1, {
        tags: { tag: 'value' },
      });
    });

    it('should increment a counter with default value', () => {
      service.incrementCounter('test.counter');

      expect(Sentry.metrics.increment).toHaveBeenCalledWith('test.counter', 1, {
        tags: undefined,
      });
    });
  });

  describe('trackDistribution', () => {
    it('should track a distribution metric', () => {
      service.trackDistribution('test.distribution', 50, 'millisecond', { tag: 'value' });

      expect(Sentry.metrics.distribution).toHaveBeenCalledWith('test.distribution', 50, {
        unit: 'millisecond',
        tags: { tag: 'value' },
      });
    });
  });
});
