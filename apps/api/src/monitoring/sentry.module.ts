import { Module, Global, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { SentryService } from './sentry.service';
import { createSentryConfig, SentryConfigOptions } from './sentry.config';

export interface SentryModuleOptions {
  dsn?: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
  enableProfiling?: boolean;
}

@Global()
@Module({})
export class SentryModule {
  static forRoot(options?: SentryModuleOptions): DynamicModule {
    return {
      module: SentryModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'SENTRY_OPTIONS',
          useFactory: (configService: ConfigService): SentryConfigOptions => {
            return {
              dsn: options?.dsn || configService.get<string>('SENTRY_DSN', ''),
              environment: options?.environment || configService.get<string>('SENTRY_ENVIRONMENT', 'development'),
              release: options?.release || configService.get<string>('SENTRY_RELEASE') || process.env.npm_package_version,
              tracesSampleRate: options?.tracesSampleRate ?? configService.get<number>('SENTRY_TRACES_SAMPLE_RATE', 0.2),
              profilesSampleRate: options?.profilesSampleRate ?? configService.get<number>('SENTRY_PROFILES_SAMPLE_RATE', 0.05),
              enableProfiling: options?.enableProfiling ?? configService.get<boolean>('SENTRY_ENABLE_PROFILING', true),
            };
          },
          inject: [ConfigService],
        },
        {
          provide: 'SENTRY_INIT',
          useFactory: (sentryOptions: SentryConfigOptions) => {
            // Only initialize if DSN is provided
            if (sentryOptions.dsn) {
              const config = createSentryConfig(sentryOptions);
              Sentry.init(config);
              console.log(`✅ Sentry initialized for environment: ${sentryOptions.environment}`);
            } else {
              console.log('⚠️  Sentry DSN not configured - monitoring disabled');
            }
            return Sentry;
          },
          inject: ['SENTRY_OPTIONS'],
        },
        SentryService,
      ],
      exports: [SentryService, 'SENTRY_INIT'],
    };
  }

  static forRootAsync(options: {
    imports?: any[];
    useFactory: (...args: any[]) => Promise<SentryModuleOptions> | SentryModuleOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: SentryModule,
      imports: options.imports || [],
      providers: [
        {
          provide: 'SENTRY_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: 'SENTRY_INIT',
          useFactory: (sentryOptions: SentryConfigOptions) => {
            if (sentryOptions.dsn) {
              const config = createSentryConfig(sentryOptions);
              Sentry.init(config);
              console.log(`✅ Sentry initialized for environment: ${sentryOptions.environment}`);
            } else {
              console.log('⚠️  Sentry DSN not configured - monitoring disabled');
            }
            return Sentry;
          },
          inject: ['SENTRY_OPTIONS'],
        },
        SentryService,
      ],
      exports: [SentryService, 'SENTRY_INIT'],
    };
  }
}
