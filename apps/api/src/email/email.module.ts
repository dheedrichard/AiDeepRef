/**
 * Email Module
 *
 * Provides comprehensive email functionality including:
 * - Multi-provider support (SendGrid, AWS SES, SMTP)
 * - Asynchronous queue processing with Bull
 * - Email templating with Handlebars
 * - Rate limiting per user and globally
 * - Delivery tracking and analytics
 * - Bounce and complaint handling
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

// Entities
import { EmailLog } from './entities/email-log.entity';

// Services
import { EmailService } from './services/email.service';
import { EmailTemplateService } from './services/email-template.service';
import { EmailTrackingService } from './services/email-tracking.service';
import { EmailRateLimiterService } from './services/email-rate-limiter.service';

// Providers
import { SendGridProvider } from './providers/sendgrid-provider';
import { SESProvider } from './providers/ses-provider';
import { SMTPProvider } from './providers/smtp-provider';
import { StubProvider } from './providers/stub-provider';

// Processors
import { EmailProcessor } from './processors/email.processor';

// Controllers
import { EmailWebhookController } from './controllers/email-webhook.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([EmailLog]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
          db: configService.get<number>('REDIS_DB', 0),
        },
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'email-sending',
    }),
  ],
  controllers: [EmailWebhookController],
  providers: [
    // Core services
    EmailService,
    EmailTemplateService,
    EmailTrackingService,
    EmailRateLimiterService,

    // Email providers
    SendGridProvider,
    SESProvider,
    SMTPProvider,
    StubProvider,

    // Queue processors
    EmailProcessor,
  ],
  exports: [
    EmailService,
    EmailTrackingService,
  ],
})
export class EmailModule {}
