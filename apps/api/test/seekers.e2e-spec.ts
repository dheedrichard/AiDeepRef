import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User, Reference } from '../src/database/entities';
import { AuthModule } from '../src/auth/auth.module';
import { SeekersModule } from '../src/seekers/seekers.module';
import { DatabaseModule } from '../src/database/database.module';
import { CommonModule } from '../src/common/common.module';
import { testUsers, testReferenceRequest } from './fixtures/test-data';
import { extractToken, expectValidationError, expectUnauthorizedError } from './helpers/test-utils';

describe('Seekers Endpoints (E2E)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let referenceRepository: Repository<Reference>;
  let seekerToken: string;
  let seekerId: string;

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
        CommonModule,
        AuthModule,
        SeekersModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    userRepository = moduleFixture.get('UserRepository');
    referenceRepository = moduleFixture.get('ReferenceRepository');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Create a test seeker user
    const signupResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send(testUsers.seeker1)
      .expect(201);

    seekerToken = extractToken(signupResponse);
    seekerId = signupResponse.body.userId;
  });

  afterEach(async () => {
    // Clean up database after each test
    if (referenceRepository) {
      await referenceRepository.query('TRUNCATE TABLE references RESTART IDENTITY CASCADE;');
    }
    if (userRepository) {
      await userRepository.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE;');
    }
  });

  describe('GET /api/v1/seekers/:id/profile', () => {
    it('should get seeker profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/seekers/${seekerId}/profile`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', seekerId);
      expect(response.body).toHaveProperty('firstName', testUsers.seeker1.firstName);
      expect(response.body).toHaveProperty('lastName', testUsers.seeker1.lastName);
      expect(response.body).toHaveProperty('email', testUsers.seeker1.email);
      expect(response.body).toHaveProperty('role', testUsers.seeker1.role);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should reject request without authentication token', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/seekers/${seekerId}/profile`)
        .expect(401);

      expectUnauthorizedError(response);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/seekers/${seekerId}/profile`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expectUnauthorizedError(response);
    });
  });

  describe('POST /api/v1/seekers/:id/references/request', () => {
    it('should successfully create a reference request', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/seekers/${seekerId}/references/request`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .send(testReferenceRequest)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('seekerId', seekerId);
      expect(response.body).toHaveProperty('referrerName', testReferenceRequest.referrerName);
      expect(response.body).toHaveProperty('referrerEmail', testReferenceRequest.referrerEmail);
      expect(response.body).toHaveProperty('company', testReferenceRequest.company);
      expect(response.body).toHaveProperty('role', testReferenceRequest.role);
      expect(response.body).toHaveProperty('questions');
      expect(response.body.questions).toEqual(testReferenceRequest.questions);
      expect(response.body).toHaveProperty('allowedFormats');
      expect(response.body.allowedFormats).toEqual(testReferenceRequest.allowedFormats);
      expect(response.body).toHaveProperty('status', 'pending');

      // Verify reference was created in database
      const reference = await referenceRepository.findOne({ where: { id: response.body.id } });
      expect(reference).toBeDefined();
      expect(reference?.seekerId).toBe(seekerId);
      expect(reference?.referrerEmail).toBe(testReferenceRequest.referrerEmail);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/seekers/${seekerId}/references/request`)
        .send(testReferenceRequest)
        .expect(401);

      expectUnauthorizedError(response);
    });

    it('should reject request with missing referrer name', async () => {
      const invalidRequest = { ...testReferenceRequest };
      delete (invalidRequest as any).referrerName;

      const response = await request(app.getHttpServer())
        .post(`/api/v1/seekers/${seekerId}/references/request`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .send(invalidRequest)
        .expect(400);

      expectValidationError(response);
    });

    it('should reject request with invalid email', async () => {
      const invalidRequest = {
        ...testReferenceRequest,
        referrerEmail: 'invalid-email',
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/seekers/${seekerId}/references/request`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .send(invalidRequest)
        .expect(400);

      expectValidationError(response);
    });

    it('should reject request with empty questions array', async () => {
      const invalidRequest = {
        ...testReferenceRequest,
        questions: [],
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/seekers/${seekerId}/references/request`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .send(invalidRequest)
        .expect(400);

      expectValidationError(response);
    });

    it('should reject request with invalid format', async () => {
      const invalidRequest = {
        ...testReferenceRequest,
        allowedFormats: ['invalid_format'],
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/seekers/${seekerId}/references/request`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .send(invalidRequest)
        .expect(400);

      expectValidationError(response);
    });

    it('should create multiple reference requests', async () => {
      const request1 = await request(app.getHttpServer())
        .post(`/api/v1/seekers/${seekerId}/references/request`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .send(testReferenceRequest)
        .expect(201);

      const request2 = await request(app.getHttpServer())
        .post(`/api/v1/seekers/${seekerId}/references/request`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .send({
          ...testReferenceRequest,
          referrerEmail: 'another.referrer@example.com',
        })
        .expect(201);

      expect(request1.body.id).not.toBe(request2.body.id);

      // Verify both references exist in database
      const references = await referenceRepository.find({ where: { seekerId } });
      expect(references).toHaveLength(2);
    });

    it('should validate allowEmployerReachback field', async () => {
      const requestWithReachback = await request(app.getHttpServer())
        .post(`/api/v1/seekers/${seekerId}/references/request`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .send({
          ...testReferenceRequest,
          allowEmployerReachback: true,
        })
        .expect(201);

      expect(requestWithReachback.body.allowEmployerReachback).toBe(true);

      const requestWithoutReachback = await request(app.getHttpServer())
        .post(`/api/v1/seekers/${seekerId}/references/request`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .send({
          ...testReferenceRequest,
          referrerEmail: 'different@example.com',
          allowEmployerReachback: false,
        })
        .expect(201);

      expect(requestWithoutReachback.body.allowEmployerReachback).toBe(false);
    });
  });

  describe('Authorization Tests', () => {
    let anotherSeekerToken: string;
    let anotherSeekerId: string;

    beforeEach(async () => {
      // Create another seeker
      const signupResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send(testUsers.seeker2)
        .expect(201);

      anotherSeekerToken = extractToken(signupResponse);
      anotherSeekerId = signupResponse.body.userId;
    });

    it('should not allow accessing another seeker profile', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/seekers/${anotherSeekerId}/profile`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .expect(403);

      expect(response.body.message).toBeDefined();
    });

    it('should not allow creating reference request for another seeker', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/seekers/${anotherSeekerId}/references/request`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .send(testReferenceRequest)
        .expect(403);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('API Contract Validation', () => {
    it('reference request response should match contract', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/seekers/${seekerId}/references/request`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .send(testReferenceRequest)
        .expect(201);

      // Validate response structure
      expect(response.body).toMatchObject({
        id: expect.any(String),
        seekerId: expect.any(String),
        referrerName: expect.any(String),
        referrerEmail: expect.any(String),
        company: expect.any(String),
        role: expect.any(String),
        questions: expect.any(Array),
        allowedFormats: expect.any(Array),
        allowEmployerReachback: expect.any(Boolean),
        status: expect.any(String),
      });

      // Validate UUID format
      expect(response.body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('profile response should not expose sensitive data', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/seekers/${seekerId}/profile`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .expect(200);

      // Should not expose password
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('emailVerificationCode');
      expect(response.body).not.toHaveProperty('emailVerificationExpiry');
    });
  });

  describe('Performance Tests', () => {
    it('should handle reference request within acceptable time', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .post(`/api/v1/seekers/${seekerId}/references/request`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .send(testReferenceRequest)
        .expect(201);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, (_, index) =>
        request(app.getHttpServer())
          .post(`/api/v1/seekers/${seekerId}/references/request`)
          .set('Authorization', `Bearer ${seekerToken}`)
          .send({
            ...testReferenceRequest,
            referrerEmail: `referrer${index}@example.com`,
          })
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
      });

      // Verify all references were created
      const references = await referenceRepository.find({ where: { seekerId } });
      expect(references).toHaveLength(5);
    });
  });
});
