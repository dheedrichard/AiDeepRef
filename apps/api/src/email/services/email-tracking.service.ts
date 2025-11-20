/**
 * Email Tracking Service
 *
 * Tracks email delivery status, opens, clicks, bounces, and complaints
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { EmailLog } from '../entities/email-log.entity';
import {
  EmailDeliveryStatus,
  EmailStats,
  EmailWebhookEvent,
  EmailType,
  EmailProvider,
} from '../interfaces/email.interfaces';

@Injectable()
export class EmailTrackingService {
  private readonly logger = new Logger(EmailTrackingService.name);

  constructor(
    @InjectRepository(EmailLog)
    private emailLogRepository: Repository<EmailLog>,
  ) {}

  /**
   * Log email send attempt
   */
  async logEmailSend(data: {
    userId?: string;
    recipientEmail: string;
    recipientName?: string;
    emailType: EmailType;
    subject: string;
    provider: EmailProvider;
    messageId?: string;
    metadata?: Record<string, any>;
    tags?: string[];
  }): Promise<EmailLog> {
    const log = this.emailLogRepository.create({
      userId: data.userId || null,
      recipientEmail: data.recipientEmail,
      recipientName: data.recipientName || null,
      emailType: data.emailType,
      subject: data.subject,
      provider: data.provider,
      messageId: data.messageId || null,
      status: 'pending',
      metadata: data.metadata || null,
      tags: data.tags || null,
      retryCount: 0,
    });

    return await this.emailLogRepository.save(log);
  }

  /**
   * Update email status
   */
  async updateEmailStatus(
    messageId: string,
    status: 'sent' | 'delivered' | 'bounced' | 'complained' | 'failed',
    error?: string,
  ): Promise<void> {
    const updateData: any = { status };

    switch (status) {
      case 'sent':
        updateData.sentAt = new Date();
        break;
      case 'delivered':
        updateData.deliveredAt = new Date();
        break;
      case 'bounced':
        updateData.bouncedAt = new Date();
        updateData.bounceReason = error;
        break;
      case 'complained':
        updateData.complainedAt = new Date();
        updateData.complaintReason = error;
        break;
      case 'failed':
        updateData.errorMessage = error;
        break;
    }

    await this.emailLogRepository.update(
      { messageId },
      updateData,
    );

    this.logger.log(`Email ${messageId} status updated to: ${status}`);
  }

  /**
   * Increment retry count
   */
  async incrementRetryCount(messageId: string): Promise<void> {
    await this.emailLogRepository.increment(
      { messageId },
      'retryCount',
      1,
    );
  }

  /**
   * Process webhook event
   */
  async processWebhookEvent(event: EmailWebhookEvent): Promise<void> {
    const { messageId, eventType, reason } = event;

    switch (eventType) {
      case 'delivered':
        await this.updateEmailStatus(messageId, 'delivered');
        break;
      case 'opened':
        await this.emailLogRepository.update(
          { messageId },
          { openedAt: new Date() },
        );
        break;
      case 'clicked':
        await this.emailLogRepository.update(
          { messageId },
          { clickedAt: new Date() },
        );
        break;
      case 'bounced':
        await this.updateEmailStatus(messageId, 'bounced', reason);
        break;
      case 'complained':
        await this.updateEmailStatus(messageId, 'complained', reason);
        break;
      case 'failed':
        await this.updateEmailStatus(messageId, 'failed', reason);
        break;
    }

    this.logger.log(`Webhook event processed: ${eventType} for ${messageId}`);
  }

  /**
   * Get delivery status for message
   */
  async getDeliveryStatus(messageId: string): Promise<EmailDeliveryStatus | null> {
    const log = await this.emailLogRepository.findOne({
      where: { messageId },
    });

    if (!log) {
      return null;
    }

    return {
      emailLogId: log.id,
      status: log.status,
      provider: log.provider,
      messageId: log.messageId || undefined,
      error: log.errorMessage || undefined,
      deliveredAt: log.deliveredAt || undefined,
      openedAt: log.openedAt || undefined,
      clickedAt: log.clickedAt || undefined,
      bouncedAt: log.bouncedAt || undefined,
      complainedAt: log.complainedAt || undefined,
    };
  }

  /**
   * Get email statistics for a date range
   */
  async getEmailStats(startDate: Date, endDate: Date): Promise<EmailStats> {
    const logs = await this.emailLogRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });

    const sent = logs.filter(log => log.status === 'sent' || log.status === 'delivered').length;
    const delivered = logs.filter(log => log.status === 'delivered').length;
    const bounced = logs.filter(log => log.status === 'bounced').length;
    const complained = logs.filter(log => log.status === 'complained').length;
    const failed = logs.filter(log => log.status === 'failed').length;

    const total = sent + failed;
    const deliveryRate = total > 0 ? (delivered / total) * 100 : 0;
    const bounceRate = total > 0 ? (bounced / total) * 100 : 0;
    const complaintRate = total > 0 ? (complained / total) * 100 : 0;

    return {
      sent,
      delivered,
      bounced,
      complained,
      failed,
      deliveryRate,
      bounceRate,
      complaintRate,
    };
  }

  /**
   * Get user email history
   */
  async getUserEmailHistory(
    userId: string,
    limit: number = 50,
  ): Promise<EmailLog[]> {
    return await this.emailLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get failed emails for retry
   */
  async getFailedEmails(
    maxRetries: number = 3,
    limit: number = 100,
  ): Promise<EmailLog[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return await this.emailLogRepository
      .createQueryBuilder('email')
      .where('email.status = :status', { status: 'failed' })
      .andWhere('email.retryCount < :maxRetries', { maxRetries })
      .andWhere('email.createdAt > :oneDayAgo', { oneDayAgo })
      .orderBy('email.createdAt', 'ASC')
      .limit(limit)
      .getMany();
  }

  /**
   * Clean up old logs (data retention)
   */
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await this.emailLogRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(`Cleaned up ${result.affected || 0} old email logs`);
    return result.affected || 0;
  }

  /**
   * Get statistics by email type
   */
  async getStatsByType(
    startDate: Date,
    endDate: Date,
  ): Promise<Map<EmailType, EmailStats>> {
    const logs = await this.emailLogRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });

    const statsByType = new Map<EmailType, EmailStats>();

    // Group by email type
    const typeGroups = logs.reduce((groups, log) => {
      const type = log.emailType;
      if (!groups.has(type)) {
        groups.set(type, []);
      }
      groups.get(type)!.push(log);
      return groups;
    }, new Map<EmailType, EmailLog[]>());

    // Calculate stats for each type
    for (const [type, typeLogs] of typeGroups) {
      const sent = typeLogs.filter(log => log.status === 'sent' || log.status === 'delivered').length;
      const delivered = typeLogs.filter(log => log.status === 'delivered').length;
      const bounced = typeLogs.filter(log => log.status === 'bounced').length;
      const complained = typeLogs.filter(log => log.status === 'complained').length;
      const failed = typeLogs.filter(log => log.status === 'failed').length;

      const total = sent + failed;
      const deliveryRate = total > 0 ? (delivered / total) * 100 : 0;
      const bounceRate = total > 0 ? (bounced / total) * 100 : 0;
      const complaintRate = total > 0 ? (complained / total) * 100 : 0;

      statsByType.set(type, {
        sent,
        delivered,
        bounced,
        complained,
        failed,
        deliveryRate,
        bounceRate,
        complaintRate,
      });
    }

    return statsByType;
  }
}
