import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User } from '../src/database/entities';
import { AuthModule } from '../src/auth/auth.module';
import { DatabaseModule } from '../src/database/database.module';
import { testUsers, invalidEmailData, invalidPasswordData } from './fixtures/test-data';
import { extractToken, expectValidationError, expectUnauthorizedError, expectConflictError } from './helpers/test-utils';

describe('Auth Endpoints (E2E)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let verificationCode: string;

  beforeAll(async () => {
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
          entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
          synchronize: true,
          dropSchema: true,
          logging: false,
        }),
        DatabaseModule,
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    userRepository = moduleFixture.get('UserRepository');
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // Clean up database after each test
    if (userRepository) {
      await userRepository.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE;');
    }
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should successfully register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send(testUsers.seeker1)
        .expect(201);

      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('email', testUsers.seeker1.email);
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBeGreaterThan(0);

      // Verify user was created in database
      const user = await userRepository.findOne({ where: { email: testUsers.seeker1.email } });
      expect(user).toBeDefined();
      expect(user?.firstName).toBe(testUsers.seeker1.firstName);
      expect(user?.lastName).toBe(testUsers.seeker1.lastName);
      expect(user?.role).toBe(testUsers.seeker1.role);
      expect(user?.emailVerified).toBe(false);
      expect(user?.password).not.toBe(testUsers.seeker1.password); // Password should be hashed

      // Store verification code for later tests
      verificationCode = user?.emailVerificationCode || '';
    });

    it('should hash the password correctly', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send(testUsers.seeker1)
        .expect(201);

      const user = await userRepository.findOne({ where: { email: testUsers.seeker1.email } });
      expect(user?.password).toBeDefined();
      expect(user?.password).not.toBe(testUsers.seeker1.password);
      expect(user?.password?.length).toBeGreaterThan(50); // Bcrypt hashes are typically 60 characters
    });

    it('should generate email verification code', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send(testUsers.seeker1)
        .expect(201);

      const user = await userRepository.findOne({ where: { email: testUsers.seeker1.email } });
      expect(user?.emailVerificationCode).toBeDefined();
      expect(user?.emailVerificationCode?.length).toBe(6);
      expect(user?.emailVerificationExpiry).toBeDefined();
      expect(user?.emailVerificationExpiry).toBeInstanceOf(Date);
    });

    it('should reject duplicate email registration', async () => {
      // First registration
      await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send(testUsers.seeker1)
        .expect(201);

      // Second registration with same email
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send(testUsers.seeker1)
        .expect(409);

      expectConflictError(response, 'already exists');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send(invalidEmailData)
        .expect(400);

      expectValidationError(response);
    });

    it('should reject password shorter than 8 characters', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send(invalidPasswordData)
        .expect(400);

      expectValidationError(response);
    });

    it('should reject missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({ email: 'test@example.com' })
        .expect(400);

      expectValidationError(response);
    });

    it('should reject invalid role', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          ...testUsers.seeker1,
          role: 'invalid_role',
        })
        .expect(400);

      expectValidationError(response);
    });
  });

  describe('POST /api/v1/auth/signin', () => {
    beforeEach(async () => {
      // Create a test user
      await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send(testUsers.seeker1)
        .expect(201);
    });

    it('should successfully sign in with correct credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({
          email: testUsers.seeker1.email,
          password: testUsers.seeker1.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('role', testUsers.seeker1.role);
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBeGreaterThan(0);
    });

    it('should update lastLoginAt timestamp', async () => {
      const userBefore = await userRepository.findOne({ where: { email: testUsers.seeker1.email } });
      const lastLoginBefore = userBefore?.lastLoginAt;

      await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({
          email: testUsers.seeker1.email,
          password: testUsers.seeker1.password,
        })
        .expect(200);

      const userAfter = await userRepository.findOne({ where: { email: testUsers.seeker1.email } });
      expect(userAfter?.lastLoginAt).toBeDefined();

      if (lastLoginBefore) {
        expect(userAfter?.lastLoginAt?.getTime()).toBeGreaterThan(lastLoginBefore.getTime());
      }
    });

    it('should reject incorrect password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({
          email: testUsers.seeker1.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expectUnauthorizedError(response);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        })
        .expect(401);

      expectUnauthorizedError(response);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should reject signin without password (magic link not implemented)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({
          email: testUsers.seeker1.email,
        })
        .expect(401);

      expectUnauthorizedError(response);
    });

    it('should reject invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({
          email: 'invalid-email',
          password: 'SomePassword123!',
        })
        .expect(400);

      expectValidationError(response);
    });

    it('should generate valid JWT token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({
          email: testUsers.seeker1.email,
          password: testUsers.seeker1.password,
        })
        .expect(200);

      const token = extractToken(response);
      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts separated by dots
    });
  });

  describe('POST /api/v1/auth/verify-email', () => {
    let testUserEmail: string;
    let testVerificationCode: string;

    beforeEach(async () => {
      // Create a test user
      const signupResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send(testUsers.seeker1)
        .expect(201);

      testUserEmail = testUsers.seeker1.email;

      // Get verification code from database
      const user = await userRepository.findOne({ where: { email: testUserEmail } });
      testVerificationCode = user?.emailVerificationCode || '';
    });

    it('should successfully verify email with valid OTP', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({
          email: testUserEmail,
          code: testVerificationCode,
        })
        .expect(200);

      expect(response.body).toHaveProperty('verified', true);

      // Verify user is marked as verified in database
      const user = await userRepository.findOne({ where: { email: testUserEmail } });
      expect(user?.emailVerified).toBe(true);
      expect(user?.emailVerificationCode).toBeNull();
      expect(user?.emailVerificationExpiry).toBeNull();
    });

    it('should allow verification of already verified email', async () => {
      // First verification
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({
          email: testUserEmail,
          code: testVerificationCode,
        })
        .expect(200);

      // Second verification
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({
          email: testUserEmail,
          code: testVerificationCode,
        })
        .expect(200);

      expect(response.body).toHaveProperty('verified', true);
    });

    it('should reject invalid OTP code', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({
          email: testUserEmail,
          code: '999999',
        })
        .expect(401);

      expectUnauthorizedError(response);
      expect(response.body.message).toContain('Invalid or expired');
    });

    it('should reject verification for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({
          email: 'nonexistent@example.com',
          code: '123456',
        })
        .expect(401);

      expectUnauthorizedError(response);
      expect(response.body.message).toContain('User not found');
    });

    it('should reject expired verification code', async () => {
      // Manually expire the verification code
      const user = await userRepository.findOne({ where: { email: testUserEmail } });
      if (user) {
        user.emailVerificationExpiry = new Date(Date.now() - 1000); // 1 second ago
        await userRepository.save(user);
      }

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({
          email: testUserEmail,
          code: testVerificationCode,
        })
        .expect(401);

      expectUnauthorizedError(response);
      expect(response.body.message).toContain('Invalid or expired');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({
          email: 'invalid-email',
          code: '123456',
        })
        .expect(400);

      expectValidationError(response);
    });

    it('should reject missing code field', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({
          email: testUserEmail,
        })
        .expect(400);

      expectValidationError(response);
    });
  });

  describe('API Contract Validation', () => {
    it('signup response should match contract', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send(testUsers.seeker2)
        .expect(201);

      // Validate response structure
      expect(response.body).toMatchObject({
        userId: expect.any(String),
        email: expect.any(String),
        token: expect.any(String),
      });

      // Validate UUID format
      expect(response.body.userId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('signin response should match contract', async () => {
      // Create user first
      await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send(testUsers.seeker2)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({
          email: testUsers.seeker2.email,
          password: testUsers.seeker2.password,
        })
        .expect(200);

      // Validate response structure
      expect(response.body).toMatchObject({
        userId: expect.any(String),
        token: expect.any(String),
        role: expect.any(String),
      });

      // Validate UUID format
      expect(response.body.userId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('verify-email response should match contract', async () => {
      // Create user first
      await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send(testUsers.referrer1)
        .expect(201);

      const user = await userRepository.findOne({ where: { email: testUsers.referrer1.email } });
      const code = user?.emailVerificationCode || '';

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({
          email: testUsers.referrer1.email,
          code,
        })
        .expect(200);

      // Validate response structure
      expect(response.body).toMatchObject({
        verified: expect.any(Boolean),
      });
    });
  });
});
