import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User, Reference } from '../src/database/entities';
import { ReferenceStatus, ReferenceFormat } from '../src/database/entities/reference.entity';
import { AuthModule } from '../src/auth/auth.module';
import { SeekersModule } from '../src/seekers/seekers.module';
import { ReferencesModule } from '../src/references/references.module';
import { DatabaseModule } from '../src/database/database.module';
import { CommonModule } from '../src/common/common.module';
import { testUsers, testReferenceRequest, testReferenceSubmission } from './fixtures/test-data';
import { extractToken, expectValidationError, expectUnauthorizedError } from './helpers/test-utils';

describe('References Endpoints (E2E)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let referenceRepository: Repository<Reference>;
  let seekerToken: string;
  let seekerId: string;
  let referrerToken: string;
  let referrerId: string;
  let testReferenceId: string;

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
        ReferencesModule,
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
    // Create a seeker user
    const seekerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send(testUsers.seeker1)
      .expect(201);

    seekerToken = extractToken(seekerResponse);
    seekerId = seekerResponse.body.userId;

    // Create a referrer user
    const referrerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send(testUsers.referrer1)
      .expect(201);

    referrerToken = extractToken(referrerResponse);
    referrerId = referrerResponse.body.userId;

    // Create a reference request
    const referenceResponse = await request(app.getHttpServer())
      .post(`/api/v1/seekers/${seekerId}/references/request`)
      .set('Authorization', `Bearer ${seekerToken}`)
      .send(testReferenceRequest)
      .expect(201);

    testReferenceId = referenceResponse.body.id;
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

  describe('GET /api/v1/references/:id', () => {
    it('should retrieve reference by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/references/${testReferenceId}`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testReferenceId);
      expect(response.body).toHaveProperty('seekerId', seekerId);
      expect(response.body).toHaveProperty('status', ReferenceStatus.PENDING);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/references/${testReferenceId}`)
        .expect(401);

      expectUnauthorizedError(response);
    });

    it('should return 404 for non-existent reference', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .get(`/api/v1/references/${fakeId}`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .expect(404);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('POST /api/v1/references/:id/submit', () => {
    it('should successfully submit a reference', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/references/${testReferenceId}/submit`)
        .set('Authorization', `Bearer ${referrerToken}`)
        .send(testReferenceSubmission)
        .expect(200);

      expect(response.body).toHaveProperty('id', testReferenceId);
      expect(response.body).toHaveProperty('status', ReferenceStatus.COMPLETED);
      expect(response.body).toHaveProperty('format', testReferenceSubmission.format);
      expect(response.body).toHaveProperty('responses');
      expect(response.body.responses).toEqual(testReferenceSubmission.responses);

      // Verify reference was updated in database
      const reference = await referenceRepository.findOne({ where: { id: testReferenceId } });
      expect(reference?.status).toBe(ReferenceStatus.COMPLETED);
      expect(reference?.format).toBe(testReferenceSubmission.format);
      expect(reference?.submittedAt).toBeDefined();
    });

    it('should update submittedAt timestamp', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/references/${testReferenceId}/submit`)
        .set('Authorization', `Bearer ${referrerToken}`)
        .send(testReferenceSubmission)
        .expect(200);

      const reference = await referenceRepository.findOne({ where: { id: testReferenceId } });
      expect(reference?.submittedAt).toBeInstanceOf(Date);
      expect(reference?.submittedAt?.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should reject submission without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/references/${testReferenceId}/submit`)
        .send(testReferenceSubmission)
        .expect(401);

      expectUnauthorizedError(response);
    });

    it('should reject submission with invalid format', async () => {
      const invalidSubmission = {
        ...testReferenceSubmission,
        format: 'invalid_format',
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/references/${testReferenceId}/submit`)
        .set('Authorization', `Bearer ${referrerToken}`)
        .send(invalidSubmission)
        .expect(400);

      expectValidationError(response);
    });

    it('should reject submission with missing responses', async () => {
      const invalidSubmission = {
        format: testReferenceSubmission.format,
        // Missing responses
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/references/${testReferenceId}/submit`)
        .set('Authorization', `Bearer ${referrerToken}`)
        .send(invalidSubmission)
        .expect(400);

      expectValidationError(response);
    });

    it('should reject submission for non-existent reference', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .post(`/api/v1/references/${fakeId}/submit`)
        .set('Authorization', `Bearer ${referrerToken}`)
        .send(testReferenceSubmission)
        .expect(404);

      expect(response.body.message).toBeDefined();
    });

    it('should handle different reference formats', async () => {
      // Test VIDEO format
      const videoSubmission = {
        format: ReferenceFormat.VIDEO,
        responses: testReferenceSubmission.responses,
        contentUrl: 'https://example.com/video.mp4',
      };

      const videoResponse = await request(app.getHttpServer())
        .post(`/api/v1/references/${testReferenceId}/submit`)
        .set('Authorization', `Bearer ${referrerToken}`)
        .send(videoSubmission)
        .expect(200);

      expect(videoResponse.body.format).toBe(ReferenceFormat.VIDEO);
    });

    it('should handle AUDIO format', async () => {
      const audioSubmission = {
        format: ReferenceFormat.AUDIO,
        responses: testReferenceSubmission.responses,
        contentUrl: 'https://example.com/audio.mp3',
      };

      const audioResponse = await request(app.getHttpServer())
        .post(`/api/v1/references/${testReferenceId}/submit`)
        .set('Authorization', `Bearer ${referrerToken}`)
        .send(audioSubmission)
        .expect(200);

      expect(audioResponse.body.format).toBe(ReferenceFormat.AUDIO);
    });
  });

  describe('GET /api/v1/references/seeker/:seekerId', () => {
    it('should list all references for a seeker', async () => {
      // Create multiple references
      await request(app.getHttpServer())
        .post(`/api/v1/seekers/${seekerId}/references/request`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .send({
          ...testReferenceRequest,
          referrerEmail: 'another@example.com',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/references/seeker/${seekerId}`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      response.body.forEach((ref: any) => {
        expect(ref).toHaveProperty('id');
        expect(ref).toHaveProperty('seekerId', seekerId);
        expect(ref).toHaveProperty('status');
      });
    });

    it('should return empty array when no references exist', async () => {
      // Create a new seeker with no references
      const newSeekerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send(testUsers.seeker2)
        .expect(201);

      const newSeekerToken = extractToken(newSeekerResponse);
      const newSeekerId = newSeekerResponse.body.userId;

      const response = await request(app.getHttpServer())
        .get(`/api/v1/references/seeker/${newSeekerId}`)
        .set('Authorization', `Bearer ${newSeekerToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(0);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/references/seeker/${seekerId}`)
        .expect(401);

      expectUnauthorizedError(response);
    });
  });

  describe('PATCH /api/v1/references/:id/status', () => {
    it('should update reference status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/references/${testReferenceId}/status`)
        .set('Authorization', `Bearer ${referrerToken}`)
        .send({ status: ReferenceStatus.DECLINED })
        .expect(200);

      expect(response.body).toHaveProperty('status', ReferenceStatus.DECLINED);

      // Verify status was updated in database
      const reference = await referenceRepository.findOne({ where: { id: testReferenceId } });
      expect(reference?.status).toBe(ReferenceStatus.DECLINED);
    });

    it('should reject invalid status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/references/${testReferenceId}/status`)
        .set('Authorization', `Bearer ${referrerToken}`)
        .send({ status: 'invalid_status' })
        .expect(400);

      expectValidationError(response);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/references/${testReferenceId}/status`)
        .send({ status: ReferenceStatus.DECLINED })
        .expect(401);

      expectUnauthorizedError(response);
    });
  });

  describe('Reference Lifecycle Tests', () => {
    it('should handle complete reference lifecycle', async () => {
      // Step 1: Create reference request (already done in beforeEach)
      let reference = await referenceRepository.findOne({ where: { id: testReferenceId } });
      expect(reference?.status).toBe(ReferenceStatus.PENDING);

      // Step 2: Submit reference
      await request(app.getHttpServer())
        .post(`/api/v1/references/${testReferenceId}/submit`)
        .set('Authorization', `Bearer ${referrerToken}`)
        .send(testReferenceSubmission)
        .expect(200);

      reference = await referenceRepository.findOne({ where: { id: testReferenceId } });
      expect(reference?.status).toBe(ReferenceStatus.COMPLETED);
      expect(reference?.submittedAt).toBeDefined();

      // Step 3: Verify reference can be retrieved
      const response = await request(app.getHttpServer())
        .get(`/api/v1/references/${testReferenceId}`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .expect(200);

      expect(response.body.status).toBe(ReferenceStatus.COMPLETED);
      expect(response.body.responses).toEqual(testReferenceSubmission.responses);
    });

    it('should handle reference expiry', async () => {
      // Create reference with expiry date
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30); // 30 days from now

      const reference = await referenceRepository.findOne({ where: { id: testReferenceId } });
      if (reference) {
        reference.expiryDate = expiryDate;
        await referenceRepository.save(reference);
      }

      const response = await request(app.getHttpServer())
        .get(`/api/v1/references/${testReferenceId}`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .expect(200);

      expect(response.body.expiryDate).toBeDefined();
    });
  });

  describe('API Contract Validation', () => {
    it('reference response should match contract', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/references/${testReferenceId}`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .expect(200);

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

    it('submitted reference should include AI scores', async () => {
      // Submit reference first
      await request(app.getHttpServer())
        .post(`/api/v1/references/${testReferenceId}/submit`)
        .set('Authorization', `Bearer ${referrerToken}`)
        .send(testReferenceSubmission)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/references/${testReferenceId}`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .expect(200);

      // These fields might be null initially, but structure should exist
      expect(response.body).toHaveProperty('rcsScore');
      expect(response.body).toHaveProperty('aiAuthenticityScore');
      expect(response.body).toHaveProperty('deepfakeProbability');
    });
  });

  describe('Performance Tests', () => {
    it('should handle reference retrieval within acceptable time', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get(`/api/v1/references/${testReferenceId}`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(500); // Should complete within 500ms
    });

    it('should handle listing references efficiently', async () => {
      // Create multiple references
      const promises = Array.from({ length: 10 }, (_, index) =>
        request(app.getHttpServer())
          .post(`/api/v1/seekers/${seekerId}/references/request`)
          .set('Authorization', `Bearer ${seekerToken}`)
          .send({
            ...testReferenceRequest,
            referrerEmail: `ref${index}@example.com`,
          })
      );

      await Promise.all(promises);

      const startTime = Date.now();

      await request(app.getHttpServer())
        .get(`/api/v1/references/seeker/${seekerId}`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
