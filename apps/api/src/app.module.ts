import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

// Import all feature modules
import { AuthModule } from './auth/auth.module';
import { MfaModule } from './mfa/mfa.module';
import { SeekersModule } from './seekers/seekers.module';
import { ReferrersModule } from './referrers/referrers.module';
import { ReferencesModule } from './references/references.module';
import { BundlesModule } from './bundles/bundles.module';
import { AiModule } from './ai/ai.module';
import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import { BffModule } from './bff/bff.module';

// Monitoring imports
import { SentryModule } from './monitoring/sentry.module';
import { SentryExceptionFilter } from './monitoring/filters/sentry-exception.filter';
import { UserContextInterceptor } from './monitoring/interceptors/user-context.interceptor';
import { PerformanceInterceptor } from './monitoring/interceptors/performance.interceptor';
import { TypeOrmSentryLogger } from './monitoring/loggers/typeorm-sentry.logger';

// Performance imports
import { CacheControlInterceptor } from './common/interceptors/cache-control.interceptor';

// Security imports
import { getThrottleConfig } from './common/config/throttle.config';
import { CustomThrottleGuard } from './common/guards/throttle.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { CsrfGuard } from './common/guards/csrf.guard';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Monitoring - Initialize early for error tracking
    SentryModule.forRoot(),

    // Rate limiting
    ThrottlerModule.forRoot(getThrottleConfig()),

    // Winston Logger
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context, trace }) => {
              return `${timestamp} [${context}] ${level}: ${message}${trace ? `\n${trace}` : ''}`;
            }),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
      ],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USER', 'postgres'),
        password: configService.get('DATABASE_PASSWORD', 'postgres'),
        database: configService.get('DATABASE_NAME', 'deepref'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        // CRITICAL: Never use synchronize in production - it can cause data loss
        synchronize: false,
        // Migrations configuration
        migrations: [__dirname + '/database/migrations/*.js'],
        migrationsRun: configService.get('DATABASE_MIGRATIONS_RUN', 'true') === 'true',
        // Logging configuration with Sentry integration
        logging: configService.get('DATABASE_LOGGING', 'false') === 'true'
          ? 'all'
          : ['error'],
        logger: new TypeOrmSentryLogger(),
        maxQueryExecutionTime: 500, // Log slow queries > 500ms
        // SSL configuration
        ssl: configService.get('DATABASE_SSL', 'false') === 'true' ? {
          rejectUnauthorized: false
        } : false,
        // Connection pooling
        extra: {
          max: parseInt(configService.get('DATABASE_POOL_MAX', '20'), 10),
          min: parseInt(configService.get('DATABASE_POOL_MIN', '5'), 10),
          idleTimeoutMillis: 30000,
        },
      }),
    }),

    // Feature modules
    DatabaseModule,
    CommonModule,
    AuthModule,
    MfaModule,
    SeekersModule,
    ReferrersModule,
    ReferencesModule,
    BundlesModule,
    AiModule,
    BffModule, // Backend-for-Frontend aggregation layer
  ],
  providers: [
    // Global Exception Filter - Sentry error tracking
    {
      provide: APP_FILTER,
      useClass: SentryExceptionFilter,
    },

    // Global Interceptors - Performance and context tracking
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: UserContextInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheControlInterceptor, // HTTP caching with ETags
    },

    // Global Guards - Order matters!
    {
      provide: APP_GUARD,
      useClass: CustomThrottleGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
})
export class AppModule {}
