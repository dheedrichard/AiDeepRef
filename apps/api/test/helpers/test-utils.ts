import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AppModule } from '../../src/app.module';
import { User, Reference, Bundle, KYCDocument } from '../../src/database/entities';

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env.test',
      }),
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: process.env.TEST_DATABASE_HOST || 'localhost',
        port: parseInt(process.env.TEST_DATABASE_PORT || '5432'),
        username: process.env.TEST_DATABASE_USERNAME || 'deepref_test',
        password: process.env.TEST_DATABASE_PASSWORD || 'test_password',
        database: process.env.TEST_DATABASE_NAME || 'deepref_test',
        entities: [User, Reference, Bundle, KYCDocument],
        synchronize: true,
        dropSchema: true,
        logging: false,
      }),
      TypeOrmModule.forFeature([User, Reference, Bundle, KYCDocument]),
      JwtModule.register({
        secret: process.env.JWT_SECRET || 'test-secret-key',
        signOptions: { expiresIn: '7d' },
      }),
      AppModule,
    ],
  })
    .overrideProvider('WinstonModule')
    .useValue({
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    })
    .compile();

  const app = moduleFixture.createNestApplication();

  // Apply global prefix
  app.setGlobalPrefix('api/v1');

  // Apply global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.init();
  return app;
}

export function extractToken(response: any): string {
  return response.body.token || '';
}

export function expectValidationError(response: any, expectedMessage?: string) {
  expect(response.status).toBe(400);
  expect(response.body.message).toBeDefined();
  if (expectedMessage) {
    expect(response.body.message).toContain(expectedMessage);
  }
}

export function expectUnauthorizedError(response: any) {
  expect(response.status).toBe(401);
  expect(response.body.message).toBeDefined();
}

export function expectNotFoundError(response: any) {
  expect(response.status).toBe(404);
  expect(response.body.message).toBeDefined();
}

export function expectConflictError(response: any, expectedMessage?: string) {
  expect(response.status).toBe(409);
  expect(response.body.message).toBeDefined();
  if (expectedMessage) {
    expect(response.body.message).toContain(expectedMessage);
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
