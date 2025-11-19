import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User, Reference, Bundle } from '../src/database/entities';
import { AuthModule } from '../src/auth/auth.module';
import { SeekersModule } from '../src/seekers/seekers.module';
import { BundlesModule } from '../src/bundles/bundles.module';
import { DatabaseModule } from '../src/database/database.module';
import { CommonModule } from '../src/common/common.module';
import { testUsers, testReferenceRequest, testBundle } from './fixtures/test-data';
import { extractToken, expectValidationError, expectUnauthorizedError } from './helpers/test-utils';

describe('Bundles Endpoints (E2E)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let referenceRepository: Repository<Reference>;
  let bundleRepository: Repository<Bundle>;
  let seekerToken: string;
  let seekerId: string;
  let referenceIds: string[] = [];

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
        BundlesModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    userRepository = moduleFixture.get('UserRepository');
    referenceRepository = moduleFixture.get('ReferenceRepository');
    bundleRepository = moduleFixture.get('BundleRepository');
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

    // Create multiple references
    referenceIds = [];
    for (let i = 0; i < 3; i++) {
      const refResponse = await request(app.getHttpServer())
        .post(`/api/v1/seekers/${seekerId}/references/request`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .send({
          ...testReferenceRequest,
          referrerEmail: `referrer${i}@example.com`,
        })
        .expect(201);

      referenceIds.push(refResponse.body.id);
    }
  });

  afterEach(async () => {
    // Clean up database after each test
    if (bundleRepository) {
      await bundleRepository.query('TRUNCATE TABLE bundle_references CASCADE;');
      await bundleRepository.query('TRUNCATE TABLE bundles RESTART IDENTITY CASCADE;');
    }
    if (referenceRepository) {
      await referenceRepository.query('TRUNCATE TABLE references RESTART IDENTITY CASCADE;');
    }
    if (userRepository) {
      await userRepository.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE;');
    }
  });

  describe('POST /api/v1/bundles', () => {
    it('should successfully create a bundle', async () => {
      const bundleData = {
        title: testBundle.title,
        description: testBundle.description,
        referenceIds: referenceIds,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/bundles')
        .set('Authorization', `Bearer ${seekerToken}`)
        .send(bundleData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('seekerId', seekerId);
      expect(response.body).toHaveProperty('title', testBundle.title);
      expect(response.body).toHaveProperty('description', testBundle.description);
      expect(response.body).toHaveProperty('shareLink');
      expect(response.body).toHaveProperty('isActive', true);
      expect(response.body.shareLink).toBeDefined();

      // Verify bundle was created in database
      const bundle = await bundleRepository.findOne({ where: { id: response.body.id } });
      expect(bundle).toBeDefined();
      expect(bundle?.seekerId).toBe(seekerId);
    });

    it('should generate unique share link', async () => {
      const bundleData = {
        title: 'Bundle 1',
        description: 'Description 1',
        referenceIds: [referenceIds[0]],
      };

      const response1 = await request(app.getHttpServer())
        .post('/api/v1/bundles')
        .set('Authorization', `Bearer ${seekerToken}`)
        .send(bundleData)
        .expect(201);

      const response2 = await request(app.getHttpServer())
        .post('/api/v1/bundles')
        .set('Authorization', `Bearer ${seekerToken}`)
        .send({
          ...bundleData,
          title: 'Bundle 2',
        })
        .expect(201);

      expect(response1.body.shareLink).not.toBe(response2.body.shareLink);
      expect(response1.body.shareLink.length).toBeGreaterThan(0);
      expect(response2.body.shareLink.length).toBeGreaterThan(0);
    });

    it('should create bundle with password protection', async () => {
      const bundleData = {
        title: testBundle.title,
        description: testBundle.description,
        referenceIds: referenceIds,
        password: 'SecurePassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/bundles')
        .set('Authorization', `Bearer ${seekerToken}`)
        .send(bundleData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).not.toHaveProperty('password'); // Password should not be returned

      // Verify password was hashed in database
      const bundle = await bundleRepository.findOne({ where: { id: response.body.id } });
      expect(bundle?.password).toBeDefined();
      expect(bundle?.password).not.toBe('SecurePassword123!'); // Should be hashed
    });

    it('should create bundle with expiry date', async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30); // 30 days from now

      const bundleData = {
        title: testBundle.title,
        description: testBundle.description,
        referenceIds: referenceIds,
        expiryDate: expiryDate.toISOString(),
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/bundles')
        .set('Authorization', `Bearer ${seekerToken}`)
        .send(bundleData)
        .expect(201);

      expect(response.body).toHaveProperty('expiryDate');
      expect(new Date(response.body.expiryDate)).toBeInstanceOf(Date);
    });

    it('should reject bundle without authentication', async () => {
      const bundleData = {
        title: testBundle.title,
        description: testBundle.description,
        referenceIds: referenceIds,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/bundles')
        .send(bundleData)
        .expect(401);

      expectUnauthorizedError(response);
    });

    it('should reject bundle with missing title', async () => {
      const bundleData = {
        description: testBundle.description,
        referenceIds: referenceIds,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/bundles')
        .set('Authorization', `Bearer ${seekerToken}`)
        .send(bundleData)
        .expect(400);

      expectValidationError(response);
    });

    it('should reject bundle with empty references array', async () => {
      const bundleData = {
        title: testBundle.title,
        description: testBundle.description,
        referenceIds: [],
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/bundles')
        .set('Authorization', `Bearer ${seekerToken}`)
        .send(bundleData)
        .expect(400);

      expectValidationError(response);
    });

    it('should reject bundle with invalid reference IDs', async () => {
      const bundleData = {
        title: testBundle.title,
        description: testBundle.description,
        referenceIds: ['invalid-id'],
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/bundles')
        .set('Authorization', `Bearer ${seekerToken}`)
        .send(bundleData)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('GET /api/v1/bundles/:id', () => {
    let bundleId: string;

    beforeEach(async () => {
      const bundleResponse = await request(app.getHttpServer())
        .post('/api/v1/bundles')
        .set('Authorization', `Bearer ${seekerToken}`)
        .send({
          title: testBundle.title,
          description: testBundle.description,
          referenceIds: referenceIds,
        })
        .expect(201);

      bundleId = bundleResponse.body.id;
    });

    it('should retrieve bundle by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/bundles/${bundleId}`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', bundleId);
      expect(response.body).toHaveProperty('seekerId', seekerId);
      expect(response.body).toHaveProperty('title', testBundle.title);
      expect(response.body).toHaveProperty('references');
      expect(response.body.references).toBeInstanceOf(Array);
      expect(response.body.references.length).toBe(referenceIds.length);
    });

    it('should include all bundle metadata', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/bundles/${bundleId}`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('shareLink');
      expect(response.body).toHaveProperty('viewCount');
      expect(response.body).toHaveProperty('isActive');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/bundles/${bundleId}`)
        .expect(401);

      expectUnauthorizedError(response);
    });

    it('should return 404 for non-existent bundle', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .get(`/api/v1/bundles/${fakeId}`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .expect(404);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('GET /api/v1/bundles/share/:shareLink', () => {
    let shareLink: string;
    let bundleId: string;

    beforeEach(async () => {
      const bundleResponse = await request(app.getHttpServer())
        .post('/api/v1/bundles')
        .set('Authorization', `Bearer ${seekerToken}`)
        .send({
          title: testBundle.title,
          description: testBundle.description,
          referenceIds: referenceIds,
        })
        .expect(201);

      shareLink = bundleResponse.body.shareLink;
      bundleId = bundleResponse.body.id;
    });

    it('should retrieve bundle by share link without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/bundles/share/${shareLink}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', bundleId);
      expect(response.body).toHaveProperty('title', testBundle.title);
      expect(response.body).toHaveProperty('references');
    });

    it('should increment view count on access', async () => {
      const initialResponse = await request(app.getHttpServer())
        .get(`/api/v1/bundles/${bundleId}`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .expect(200);

      const initialViewCount = initialResponse.body.viewCount;

      await request(app.getHttpServer())
        .get(`/api/v1/bundles/share/${shareLink}`)
        .expect(200);

      const updatedResponse = await request(app.getHttpServer())
        .get(`/api/v1/bundles/${bundleId}`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .expect(200);

      expect(updatedResponse.body.viewCount).toBe(initialViewCount + 1);
    });

    it('should require password for password-protected bundle', async () => {
      // Create password-protected bundle
      const protectedResponse = await request(app.getHttpServer())
        .post('/api/v1/bundles')
        .set('Authorization', `Bearer ${seekerToken}`)
        .send({
          title: 'Protected Bundle',
          description: 'Protected',
          referenceIds: [referenceIds[0]],
          password: 'SecurePass123!',
        })
        .expect(201);

      const protectedShareLink = protectedResponse.body.shareLink;

      // Try to access without password
      const response = await request(app.getHttpServer())
        .get(`/api/v1/bundles/share/${protectedShareLink}`)
        .expect(401);

      expectUnauthorizedError(response);
    });

    it('should allow access with correct password', async () => {
      // Create password-protected bundle
      const protectedResponse = await request(app.getHttpServer())
        .post('/api/v1/bundles')
        .set('Authorization', `Bearer ${seekerToken}`)
        .send({
          title: 'Protected Bundle',
          description: 'Protected',
          referenceIds: [referenceIds[0]],
          password: 'SecurePass123!',
        })
        .expect(201);

      const protectedShareLink = protectedResponse.body.shareLink;

      const response = await request(app.getHttpServer())
        .post(`/api/v1/bundles/share/${protectedShareLink}/verify`)
        .send({ password: 'SecurePass123!' })
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', 'Protected Bundle');
    });

    it('should return 404 for invalid share link', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/bundles/share/invalid-link')
        .expect(404);

      expect(response.body.message).toBeDefined();
    });

    it('should not show inactive bundles', async () => {
      // Deactivate the bundle
      const bundle = await bundleRepository.findOne({ where: { id: bundleId } });
      if (bundle) {
        bundle.isActive = false;
        await bundleRepository.save(bundle);
      }

      const response = await request(app.getHttpServer())
        .get(`/api/v1/bundles/share/${shareLink}`)
        .expect(404);

      expect(response.body.message).toBeDefined();
    });

    it('should not show expired bundles', async () => {
      // Set bundle as expired
      const bundle = await bundleRepository.findOne({ where: { id: bundleId } });
      if (bundle) {
        bundle.expiryDate = new Date(Date.now() - 1000); // 1 second ago
        await bundleRepository.save(bundle);
      }

      const response = await request(app.getHttpServer())
        .get(`/api/v1/bundles/share/${shareLink}`)
        .expect(410); // Gone

      expect(response.body.message).toContain('expired');
    });
  });

  describe('PATCH /api/v1/bundles/:id', () => {
    let bundleId: string;

    beforeEach(async () => {
      const bundleResponse = await request(app.getHttpServer())
        .post('/api/v1/bundles')
        .set('Authorization', `Bearer ${seekerToken}`)
        .send({
          title: testBundle.title,
          description: testBundle.description,
          referenceIds: referenceIds,
        })
        .expect(201);

      bundleId = bundleResponse.body.id;
    });

    it('should update bundle title', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/bundles/${bundleId}`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .send({ title: 'Updated Title' })
        .expect(200);

      expect(response.body).toHaveProperty('title', 'Updated Title');

      // Verify update in database
      const bundle = await bundleRepository.findOne({ where: { id: bundleId } });
      expect(bundle?.title).toBe('Updated Title');
    });

    it('should update bundle description', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/bundles/${bundleId}`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .send({ description: 'Updated Description' })
        .expect(200);

      expect(response.body).toHaveProperty('description', 'Updated Description');
    });

    it('should deactivate bundle', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/bundles/${bundleId}`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body).toHaveProperty('isActive', false);
    });

    it('should reject update without authentication', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/bundles/${bundleId}`)
        .send({ title: 'Updated Title' })
        .expect(401);

      expectUnauthorizedError(response);
    });
  });

  describe('DELETE /api/v1/bundles/:id', () => {
    let bundleId: string;

    beforeEach(async () => {
      const bundleResponse = await request(app.getHttpServer())
        .post('/api/v1/bundles')
        .set('Authorization', `Bearer ${seekerToken}`)
        .send({
          title: testBundle.title,
          description: testBundle.description,
          referenceIds: referenceIds,
        })
        .expect(201);

      bundleId = bundleResponse.body.id;
    });

    it('should delete bundle', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/bundles/${bundleId}`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .expect(200);

      // Verify bundle was deleted
      const bundle = await bundleRepository.findOne({ where: { id: bundleId } });
      expect(bundle).toBeNull();
    });

    it('should reject delete without authentication', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/bundles/${bundleId}`)
        .expect(401);

      expectUnauthorizedError(response);
    });

    it('should return 404 when deleting non-existent bundle', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/bundles/${fakeId}`)
        .set('Authorization', `Bearer ${seekerToken}`)
        .expect(404);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('API Contract Validation', () => {
    it('bundle response should match contract', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/bundles')
        .set('Authorization', `Bearer ${seekerToken}`)
        .send({
          title: testBundle.title,
          description: testBundle.description,
          referenceIds: referenceIds,
        })
        .expect(201);

      // Validate response structure
      expect(response.body).toMatchObject({
        id: expect.any(String),
        seekerId: expect.any(String),
        title: expect.any(String),
        description: expect.any(String),
        shareLink: expect.any(String),
        viewCount: expect.any(Number),
        isActive: expect.any(Boolean),
      });

      // Validate UUID format
      expect(response.body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('Performance Tests', () => {
    it('should create bundle within acceptable time', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .post('/api/v1/bundles')
        .set('Authorization', `Bearer ${seekerToken}`)
        .send({
          title: testBundle.title,
          description: testBundle.description,
          referenceIds: referenceIds,
        })
        .expect(201);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
