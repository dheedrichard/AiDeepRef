/**
 * Email Webhook Controller
 *
 * Handles webhook callbacks from email providers (SendGrid, AWS SES)
 * for delivery tracking, bounces, and complaints
 */

import { Controller, Post, Body, Headers, Logger, HttpCode } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailTrackingService } from '../services/email-tracking.service';
import { EmailWebhookEvent, EmailProvider } from '../interfaces/email.interfaces';
import * as crypto from 'crypto';

@Controller('api/v1/email/webhook')
export class EmailWebhookController {
  private readonly logger = new Logger(EmailWebhookController.name);
  private readonly sendgridWebhookSecret?: string;

  constructor(
    private trackingService: EmailTrackingService,
    private configService: ConfigService,
  ) {
    this.sendgridWebhookSecret = this.configService.get<string>('SENDGRID_WEBHOOK_SECRET');
  }

  /**
   * SendGrid webhook endpoint
   */
  @Post('sendgrid')
  @HttpCode(200)
  async handleSendGridWebhook(
    @Body() events: any[],
    @Headers('x-twilio-email-event-webhook-signature') signature: string,
    @Headers('x-twilio-email-event-webhook-timestamp') timestamp: string,
  ): Promise<void> {
    // Verify webhook signature
    if (this.sendgridWebhookSecret && signature && timestamp) {
      const isValid = this.verifySendGridSignature(
        JSON.stringify(events),
        signature,
        timestamp,
      );

      if (!isValid) {
        this.logger.warn('Invalid SendGrid webhook signature');
        return;
      }
    }

    // Process events
    for (const event of events) {
      try {
        const webhookEvent = this.parseSendGridEvent(event);
        if (webhookEvent) {
          await this.trackingService.processWebhookEvent(webhookEvent);
        }
      } catch (error) {
        this.logger.error('Failed to process SendGrid webhook event:', error);
      }
    }

    this.logger.log(`Processed ${events.length} SendGrid webhook events`);
  }

  /**
   * AWS SES webhook endpoint (via SNS)
   */
  @Post('ses')
  @HttpCode(200)
  async handleSESWebhook(@Body() body: any): Promise<void> {
    try {
      // Handle SNS subscription confirmation
      if (body.Type === 'SubscriptionConfirmation') {
        this.logger.log('SNS subscription confirmation received');
        // In production, you would confirm the subscription here
        return;
      }

      // Handle SNS notification
      if (body.Type === 'Notification') {
        const message = JSON.parse(body.Message);
        const webhookEvent = this.parseSESEvent(message);

        if (webhookEvent) {
          await this.trackingService.processWebhookEvent(webhookEvent);
        }
      }

      this.logger.log('Processed SES webhook event');
    } catch (error) {
      this.logger.error('Failed to process SES webhook:', error);
    }
  }

  /**
   * Parse SendGrid webhook event
   */
  private parseSendGridEvent(event: any): EmailWebhookEvent | null {
    const eventTypeMap: Record<string, EmailWebhookEvent['eventType']> = {
      delivered: 'delivered',
      open: 'opened',
      click: 'clicked',
      bounce: 'bounced',
      dropped: 'failed',
      deferred: 'failed',
      spamreport: 'complained',
    };

    const eventType = eventTypeMap[event.event];
    if (!eventType) {
      return null;
    }

    return {
      provider: EmailProvider.SENDGRID,
      eventType,
      messageId: event['sg_message_id'] || event.smtp_id,
      email: event.email,
      timestamp: new Date(event.timestamp * 1000),
      reason: event.reason || event.type,
      metadata: {
        category: event.category,
        attemptNum: event.attempt_num,
      },
    };
  }

  /**
   * Parse AWS SES webhook event
   */
  private parseSESEvent(message: any): EmailWebhookEvent | null {
    const notificationType = message.notificationType?.toLowerCase();

    let eventType: EmailWebhookEvent['eventType'];
    let reason: string | undefined;

    if (notificationType === 'delivery') {
      eventType = 'delivered';
    } else if (notificationType === 'bounce') {
      eventType = 'bounced';
      reason = message.bounce?.bounceType;
    } else if (notificationType === 'complaint') {
      eventType = 'complained';
      reason = message.complaint?.complaintFeedbackType;
    } else {
      return null;
    }

    const mail = message.mail;
    const messageId = mail?.messageId;
    const destination = mail?.destination?.[0];

    if (!messageId || !destination) {
      return null;
    }

    return {
      provider: EmailProvider.SES,
      eventType,
      messageId,
      email: destination,
      timestamp: new Date(mail.timestamp),
      reason,
      metadata: message,
    };
  }

  /**
   * Verify SendGrid webhook signature
   */
  private verifySendGridSignature(
    payload: string,
    signature: string,
    timestamp: string,
  ): boolean {
    if (!this.sendgridWebhookSecret) {
      return true; // Skip verification if secret not configured
    }

    const payloadToVerify = timestamp + payload;
    const expectedSignature = crypto
      .createHmac('sha256', this.sendgridWebhookSecret)
      .update(payloadToVerify)
      .digest('base64');

    return signature === expectedSignature;
  }
}
