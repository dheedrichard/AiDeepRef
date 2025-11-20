/**
 * Email Rate Limiter Service
 *
 * Prevents email abuse by rate limiting sends per user and globally
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { EmailLog } from '../entities/email-log.entity';
import { EmailType, EmailRateLimitInfo } from '../interfaces/email.interfaces';

@Injectable()
export class EmailRateLimiterService {
  private readonly logger = new Logger(EmailRateLimiterService.name);
  private readonly userHourlyLimit: number;
  private readonly userDailyLimit: number;
  private readonly globalHourlyLimit: number;
  private readonly typeSpecificLimits: Map<EmailType, number>;

  constructor(
    @InjectRepository(EmailLog)
    private emailLogRepository: Repository<EmailLog>,
    private configService: ConfigService,
  ) {
    this.userHourlyLimit = this.configService.get<number>('EMAIL_RATE_LIMIT_USER_HOURLY', 10);
    this.userDailyLimit = this.configService.get<number>('EMAIL_RATE_LIMIT_USER_DAILY', 50);
    this.globalHourlyLimit = this.configService.get<number>('EMAIL_RATE_LIMIT_GLOBAL_HOURLY', 1000);

    // Type-specific limits (more restrictive for security-sensitive emails)
    this.typeSpecificLimits = new Map([
      [EmailType.VERIFICATION, 5], // Max 5 verification emails per hour per user
      [EmailType.PASSWORD_RESET, 3], // Max 3 password reset emails per hour per user
      [EmailType.MAGIC_LINK, 5], // Max 5 magic links per hour per user
      [EmailType.MFA_CODE, 10], // Max 10 MFA codes per hour per user
    ]);
  }

  /**
   * Check if user can send email
   */
  async checkUserLimit(
    userId: string,
    emailType: EmailType,
  ): Promise<{ allowed: boolean; info: EmailRateLimitInfo }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Check type-specific limit
    const typeLimit = this.typeSpecificLimits.get(emailType);
    if (typeLimit) {
      const typeCount = await this.emailLogRepository.count({
        where: {
          userId,
          emailType,
          createdAt: MoreThan(oneHourAgo),
          status: 'sent',
        },
      });

      if (typeCount >= typeLimit) {
        return {
          allowed: false,
          info: {
            userId,
            emailType,
            count: typeCount,
            limit: typeLimit,
            windowMs: 60 * 60 * 1000,
            resetAt: new Date(Date.now() + 60 * 60 * 1000),
          },
        };
      }
    }

    // Check hourly limit
    const hourlyCount = await this.emailLogRepository.count({
      where: {
        userId,
        createdAt: MoreThan(oneHourAgo),
        status: 'sent',
      },
    });

    if (hourlyCount >= this.userHourlyLimit) {
      return {
        allowed: false,
        info: {
          userId,
          emailType,
          count: hourlyCount,
          limit: this.userHourlyLimit,
          windowMs: 60 * 60 * 1000,
          resetAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      };
    }

    // Check daily limit
    const dailyCount = await this.emailLogRepository.count({
      where: {
        userId,
        createdAt: MoreThan(oneDayAgo),
        status: 'sent',
      },
    });

    if (dailyCount >= this.userDailyLimit) {
      return {
        allowed: false,
        info: {
          userId,
          emailType,
          count: dailyCount,
          limit: this.userDailyLimit,
          windowMs: 24 * 60 * 60 * 1000,
          resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      };
    }

    return {
      allowed: true,
      info: {
        userId,
        emailType,
        count: hourlyCount,
        limit: this.userHourlyLimit,
        windowMs: 60 * 60 * 1000,
        resetAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    };
  }

  /**
   * Check global rate limit
   */
  async checkGlobalLimit(): Promise<{ allowed: boolean; info: EmailRateLimitInfo }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const globalCount = await this.emailLogRepository.count({
      where: {
        createdAt: MoreThan(oneHourAgo),
        status: 'sent',
      },
    });

    const allowed = globalCount < this.globalHourlyLimit;

    return {
      allowed,
      info: {
        emailType: EmailType.SYSTEM_NOTIFICATION,
        count: globalCount,
        limit: this.globalHourlyLimit,
        windowMs: 60 * 60 * 1000,
        resetAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    };
  }

  /**
   * Check if email address has recent sends (prevent spam to same address)
   */
  async checkRecipientLimit(
    email: string,
    emailType: EmailType,
    limitMinutes: number = 5,
  ): Promise<boolean> {
    const cutoffTime = new Date(Date.now() - limitMinutes * 60 * 1000);

    const recentCount = await this.emailLogRepository.count({
      where: {
        recipientEmail: email,
        emailType,
        createdAt: MoreThan(cutoffTime),
        status: 'sent',
      },
    });

    return recentCount === 0;
  }

  /**
   * Get rate limit status for user
   */
  async getUserRateLimitStatus(userId: string): Promise<{
    hourlyUsed: number;
    hourlyLimit: number;
    dailyUsed: number;
    dailyLimit: number;
    resetAt: Date;
  }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [hourlyUsed, dailyUsed] = await Promise.all([
      this.emailLogRepository.count({
        where: {
          userId,
          createdAt: MoreThan(oneHourAgo),
          status: 'sent',
        },
      }),
      this.emailLogRepository.count({
        where: {
          userId,
          createdAt: MoreThan(oneDayAgo),
          status: 'sent',
        },
      }),
    ]);

    return {
      hourlyUsed,
      hourlyLimit: this.userHourlyLimit,
      dailyUsed,
      dailyLimit: this.userDailyLimit,
      resetAt: new Date(Date.now() + 60 * 60 * 1000),
    };
  }
}
