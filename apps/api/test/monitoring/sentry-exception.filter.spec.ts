import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { SentryExceptionFilter } from '../../src/monitoring/filters/sentry-exception.filter';
import { SentryService } from '../../src/monitoring/sentry.service';

describe('SentryExceptionFilter', () => {
  let filter: SentryExceptionFilter;
  let sentryService: SentryService;

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  const mockRequest = {
    method: 'GET',
    url: '/test',
    route: { path: '/test' },
    params: {},
    query: {},
    headers: {
      'user-agent': 'test-agent',
    },
    socket: {
      remoteAddress: '127.0.0.1',
    },
  };

  const mockArgumentsHost = {
    switchToHttp: () => ({
      getResponse: () => mockResponse,
      getRequest: () => mockRequest,
    }),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentryExceptionFilter,
        {
          provide: SentryService,
          useValue: {
            captureException: jest.fn().mockReturnValue('test-event-id'),
            setContext: jest.fn(),
            addBreadcrumb: jest.fn(),
            setTags: jest.fn(),
          },
        },
      ],
    }).compile();

    filter = module.get<SentryExceptionFilter>(SentryExceptionFilter);
    sentryService = module.get<SentryService>(SentryService);

    // Clear all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch', () => {
    it('should capture 5xx errors in Sentry', () => {
      const error = new Error('Internal server error');

      filter.catch(error, mockArgumentsHost);

      expect(sentryService.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          level: 'error',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should not capture 4xx errors in Sentry', () => {
      const error = new HttpException('Bad request', HttpStatus.BAD_REQUEST);

      filter.catch(error, mockArgumentsHost);

      expect(sentryService.captureException).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('should set request context for errors', () => {
      const error = new Error('Internal server error');

      filter.catch(error, mockArgumentsHost);

      expect(sentryService.setContext).toHaveBeenCalledWith(
        'request',
        expect.objectContaining({
          method: 'GET',
          url: '/test',
        })
      );
    });

    it('should add breadcrumb for errors', () => {
      const error = new Error('Internal server error');

      filter.catch(error, mockArgumentsHost);

      expect(sentryService.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('HTTP 500'),
          category: 'http',
          level: 'error',
        })
      );
    });

    it('should set tags for errors', () => {
      const error = new Error('Internal server error');

      filter.catch(error, mockArgumentsHost);

      expect(sentryService.setTags).toHaveBeenCalledWith(
        expect.objectContaining({
          'http.method': 'GET',
          'http.status_code': '500',
        })
      );
    });

    it('should sanitize sensitive query parameters', () => {
      const requestWithSensitiveQuery = {
        ...mockRequest,
        query: {
          token: 'secret-token',
          password: 'secret-password',
          normalParam: 'visible',
        },
      };

      const mockHostWithSensitiveQuery = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => requestWithSensitiveQuery,
        }),
      } as any;

      const error = new Error('Internal server error');
      filter.catch(error, mockHostWithSensitiveQuery);

      expect(sentryService.setContext).toHaveBeenCalledWith(
        'request',
        expect.objectContaining({
          query: expect.objectContaining({
            token: '[FILTERED]',
            password: '[FILTERED]',
            normalParam: 'visible',
          }),
        })
      );
    });

    it('should sanitize sensitive headers', () => {
      const requestWithSensitiveHeaders = {
        ...mockRequest,
        headers: {
          authorization: 'Bearer secret-token',
          cookie: 'session=abc123',
          'user-agent': 'test-agent',
        },
      };

      const mockHostWithSensitiveHeaders = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => requestWithSensitiveHeaders,
        }),
      } as any;

      const error = new Error('Internal server error');
      filter.catch(error, mockHostWithSensitiveHeaders);

      expect(sentryService.setContext).toHaveBeenCalledWith(
        'request',
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: '[FILTERED]',
            cookie: '[FILTERED]',
            'user-agent': 'test-agent',
          }),
        })
      );
    });

    it('should include event ID in error response for 5xx errors', () => {
      const error = new Error('Internal server error');

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          sentryEventId: expect.any(String),
        })
      );
    });
  });
});
