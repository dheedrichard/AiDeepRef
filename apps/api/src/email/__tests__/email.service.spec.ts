/**
 * Email Service Tests
 *
 * Tests for the email service functionality
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bull';
import { EmailService } from '../services/email.service';
import { EmailTemplateService } from '../services/email-template.service';
import { EmailRateLimiterService } from '../services/email-rate-limiter.service';
import { EmailTrackingService } from '../services/email-tracking.service';
import { SendGridProvider } from '../providers/sendgrid-provider';
import { SESProvider } from '../providers/ses-provider';
import { SMTPProvider } from '../providers/smtp-provider';
import { StubProvider } from '../providers/stub-provider';
import { EmailType, EmailPriority } from '../interfaces/email.interfaces';

describe('EmailService', () => {
  let service: EmailService;
  let templateService: EmailTemplateService;
  let rateLimiterService: EmailRateLimiterService;
  let trackingService: EmailTrackingService;
  let stubProvider: StubProvider;
  let mockQueue: any;

  beforeEach(async () => {
    // Mock Bull queue
    mockQueue = {
      add: jest.fn().mockResolvedValue({}),
      getWaitingCount: jest.fn().mockResolvedValue(0),
      getActiveCount: jest.fn().mockResolvedValue(0),
      getCompletedCount: jest.fn().mockResolvedValue(0),
      getFailedCount: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: getQueueToken('email-sending'),
          useValue: mockQueue,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                EMAIL_SERVICE: 'stub',
                EMAIL_ENABLE_QUEUE: 'true',
                EMAIL_ENABLE_TRACKING: 'true',
                EMAIL_FROM: 'noreply@deepref.ai',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: EmailTemplateService,
          useValue: {
            render: jest.fn().mockResolvedValue({
              subject: 'Test Subject',
              html: '<p>Test HTML</p>',
              text: 'Test Text',
            }),
          },
        },
        {
          provide: EmailRateLimiterService,
          useValue: {
            checkUserLimit: jest.fn().mockResolvedValue({
              allowed: true,
              info: { count: 1, limit: 10 },
            }),
            checkRecipientLimit: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: EmailTrackingService,
          useValue: {
            logEmailSend: jest.fn().mockResolvedValue({ id: 'log-id' }),
            updateEmailStatus: jest.fn(),
          },
        },
        SendGridProvider,
        SESProvider,
        SMTPProvider,
        StubProvider,
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    templateService = module.get<EmailTemplateService>(EmailTemplateService);
    rateLimiterService = module.get<EmailRateLimiterService>(EmailRateLimiterService);
    trackingService = module.get<EmailTrackingService>(EmailTrackingService);
    stubProvider = module.get<StubProvider>(StubProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendVerificationEmail', () => {
    it('should queue verification email', async () => {
      const result = await service.sendVerificationEmail(
        'user@example.com',
        '123456',
        'user-id',
      );

      expect(result).toBe(true);
      expect(templateService.render).toHaveBeenCalledWith(
        EmailType.VERIFICATION,
        expect.objectContaining({ verificationCode: '123456' }),
      );
      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('should check rate limits', async () => {
      await service.sendVerificationEmail(
        'user@example.com',
        '123456',
        'user-id',
      );

      expect(rateLimiterService.checkUserLimit).toHaveBeenCalledWith(
        'user-id',
        EmailType.VERIFICATION,
      );
    });

    it('should not send if rate limit exceeded', async () => {
      jest.spyOn(rateLimiterService, 'checkUserLimit').mockResolvedValue({
        allowed: false,
        info: { count: 10, limit: 10 } as any,
      });

      const result = await service.sendVerificationEmail(
        'user@example.com',
        '123456',
        'user-id',
      );

      expect(result).toBe(false);
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('sendMagicLinkEmail', () => {
    it('should queue magic link email', async () => {
      const result = await service.sendMagicLinkEmail(
        'user@example.com',
        'https://app.com/auth/verify/token',
        'user-id',
      );

      expect(result).toBe(true);
      expect(templateService.render).toHaveBeenCalledWith(
        EmailType.MAGIC_LINK,
        expect.objectContaining({
          magicLink: 'https://app.com/auth/verify/token',
        }),
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should queue password reset email', async () => {
      const result = await service.sendPasswordResetEmail(
        'user@example.com',
        'https://app.com/reset/token',
        'user-id',
      );

      expect(result).toBe(true);
      expect(templateService.render).toHaveBeenCalledWith(
        EmailType.PASSWORD_RESET,
        expect.objectContaining({
          resetLink: 'https://app.com/reset/token',
        }),
      );
    });
  });

  describe('sendMfaCodeEmail', () => {
    it('should queue MFA code email with high priority', async () => {
      const result = await service.sendMfaCodeEmail(
        'user@example.com',
        '654321',
        'user-id',
      );

      expect(result).toBe(true);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-email',
        expect.objectContaining({
          type: EmailType.MFA_CODE,
          priority: EmailPriority.CRITICAL,
        }),
        expect.objectContaining({
          priority: EmailPriority.CRITICAL,
        }),
      );
    });
  });

  describe('sendSecurityAlert', () => {
    it('should send security alert', async () => {
      const result = await service.sendSecurityAlert(
        'user@example.com',
        'Account locked',
        'user-id',
        'lockout',
      );

      expect(result).toBe(true);
      expect(templateService.render).toHaveBeenCalledWith(
        EmailType.ACCOUNT_LOCKOUT,
        expect.objectContaining({ alertMessage: 'Account locked' }),
      );
    });
  });

  describe('sendTemplatedEmail', () => {
    it('should render template and queue email', async () => {
      const result = await service.sendTemplatedEmail(
        EmailType.WELCOME,
        'user@example.com',
        { recipientName: 'John Doe' },
        { userId: 'user-id', priority: EmailPriority.NORMAL },
      );

      expect(result).toBe(true);
      expect(templateService.render).toHaveBeenCalledWith(
        EmailType.WELCOME,
        expect.objectContaining({ recipientName: 'John Doe' }),
      );
      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('should check recipient rate limit', async () => {
      await service.sendTemplatedEmail(
        EmailType.WELCOME,
        'user@example.com',
        {},
        { userId: 'user-id' },
      );

      expect(rateLimiterService.checkRecipientLimit).toHaveBeenCalledWith(
        'user@example.com',
        EmailType.WELCOME,
        5,
      );
    });
  });

  describe('sendDirect', () => {
    it('should send email directly without queueing', async () => {
      jest.spyOn(stubProvider, 'send').mockResolvedValue({
        success: true,
        messageId: 'msg-123',
        provider: 'stub' as any,
        timestamp: new Date(),
      });

      const result = await service.sendDirect(
        {
          to: 'user@example.com',
          subject: 'Test',
          html: '<p>Test</p>',
          text: 'Test',
        },
        EmailType.SYSTEM_NOTIFICATION,
        'user-id',
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-123');
      expect(trackingService.logEmailSend).toHaveBeenCalled();
      expect(trackingService.updateEmailStatus).toHaveBeenCalledWith(
        'msg-123',
        'sent',
      );
    });

    it('should handle send failures', async () => {
      jest.spyOn(stubProvider, 'send').mockResolvedValue({
        success: false,
        error: 'Send failed',
        provider: 'stub' as any,
        timestamp: new Date(),
      });

      const result = await service.sendDirect(
        {
          to: 'user@example.com',
          subject: 'Test',
          html: '<p>Test</p>',
        },
        EmailType.SYSTEM_NOTIFICATION,
      );

      expect(result.success).toBe(false);
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const stats = await service.getQueueStats();

      expect(stats).toEqual({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      });
    });
  });

  describe('verifyConnection', () => {
    it('should verify provider connection', async () => {
      jest.spyOn(stubProvider, 'verifyConnection').mockResolvedValue(true);

      const result = await service.verifyConnection();

      expect(result).toBe(true);
    });
  });
});
