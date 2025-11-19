/**
 * Rate Limiting Security Tests
 *
 * Tests rate limiting and DDoS protection
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Rate Limiting Security Tests', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Authentication Rate Limiting', () => {
    it('should rate limit signin attempts (5 per minute)', async () => {
      const requests = [];

      // Make 6 rapid signin attempts
      for (let i = 0; i < 6; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/api/v1/auth/signin')
            .send({
              email: `test${i}@example.com`,
              password: 'TestPassword123!',
            })
        );
      }

      const responses = await Promise.all(requests);

      // First 5 should succeed or fail normally
      const normalResponses = responses.slice(0, 5);
      normalResponses.forEach(response => {
        expect(response.status).not.toBe(429);
      });

      // 6th should be rate limited
      expect(responses[5].status).toBe(429);
      expect(responses[5].body.message).toContain('rate limit');
    });

    it('should rate limit signup attempts (5 per minute)', async () => {
      const requests = [];

      // Make 6 rapid signup attempts
      for (let i = 0; i < 6; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/api/v1/auth/signup')
            .send({
              email: `test${i}@example.com`,
              password: 'TestPassword123!',
              firstName: 'Test',
              lastName: 'User',
              role: 'seeker',
            })
        );
      }

      const responses = await Promise.all(requests);

      // Check that rate limiting kicks in
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should rate limit password reset (3 per hour)', async () => {
      const email = 'reset@example.com';
      const requests = [];

      // Make 4 password reset attempts
      for (let i = 0; i < 4; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/api/v1/auth/forgot-password')
            .send({ email })
        );
      }

      const responses = await Promise.all(requests);

      // First 3 should work, 4th should be rate limited
      expect(responses[3].status).toBe(429);
    });
  });

  describe('General API Rate Limiting', () => {
    it('should rate limit general API calls (100 per minute)', async () => {
      const token = 'valid-token'; // Would need actual token in real test
      const requests = [];

      // Make 101 API calls
      for (let i = 0; i < 101; i++) {
        requests.push(
          request(app.getHttpServer())
            .get('/api/v1/users/profile')
            .set('Authorization', `Bearer ${token}`)
        );
      }

      const responses = await Promise.all(requests);

      // Last request should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should provide Retry-After header when rate limited', async () => {
      const requests = [];

      // Trigger rate limit
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/api/v1/auth/signin')
            .send({
              email: 'test@example.com',
              password: 'password',
            })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponse = responses.find(r => r.status === 429);

      if (rateLimitedResponse) {
        expect(rateLimitedResponse.headers['retry-after']).toBeDefined();
      }
    });
  });

  describe('DDoS Protection', () => {
    it('should handle burst traffic gracefully', async () => {
      const requests = [];

      // Simulate burst of 50 concurrent requests
      for (let i = 0; i < 50; i++) {
        requests.push(
          request(app.getHttpServer())
            .get('/api/v1/public/health')
        );
      }

      const responses = await Promise.all(requests);

      // Some should succeed, some should be rate limited
      const successfulResponses = responses.filter(r => r.status === 200);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(successfulResponses.length).toBeGreaterThan(0);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should track rate limiting by IP', async () => {
      // Simulate requests from same IP
      const requests = [];

      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app.getHttpServer())
            .get('/api/v1/public/health')
            .set('X-Forwarded-For', '192.168.1.1')
        );
      }

      const responses = await Promise.all(requests);

      // Should see rate limiting for this IP
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should track rate limiting by user for authenticated requests', async () => {
      const userToken = 'user-token'; // Would need actual token
      const requests = [];

      // Make requests with same user token
      for (let i = 0; i < 101; i++) {
        requests.push(
          request(app.getHttpServer())
            .get('/api/v1/users/profile')
            .set('Authorization', `Bearer ${userToken}`)
            .set('X-Forwarded-For', `192.168.1.${i}`) // Different IPs
        );
      }

      const responses = await Promise.all(requests);

      // Should still be rate limited despite different IPs
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Admin Bypass', () => {
    it('should not rate limit admin users', async () => {
      const adminToken = 'admin-token'; // Would need actual admin token
      const requests = [];

      // Admin should be able to make many requests
      for (let i = 0; i < 200; i++) {
        requests.push(
          request(app.getHttpServer())
            .get('/api/v1/admin/users')
            .set('Authorization', `Bearer ${adminToken}`)
        );
      }

      const responses = await Promise.all(requests);

      // No requests should be rate limited for admin
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBe(0);
    });
  });

  describe('Rate Limit Headers', () => {
    it('should include rate limit headers in responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/public/health');

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should decrease remaining count with each request', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/api/v1/public/health');

      const response2 = await request(app.getHttpServer())
        .get('/api/v1/public/health');

      const remaining1 = parseInt(response1.headers['x-ratelimit-remaining']);
      const remaining2 = parseInt(response2.headers['x-ratelimit-remaining']);

      expect(remaining2).toBeLessThan(remaining1);
    });
  });

  describe('Endpoint-Specific Limits', () => {
    it('should apply strict limits to authentication endpoints', async () => {
      const authRequests = [];

      for (let i = 0; i < 6; i++) {
        authRequests.push(
          request(app.getHttpServer())
            .post('/api/v1/auth/signin')
            .send({
              email: 'test@example.com',
              password: 'password',
            })
        );
      }

      const authResponses = await Promise.all(authRequests);
      const authRateLimited = authResponses.filter(r => r.status === 429);
      expect(authRateLimited.length).toBeGreaterThan(0);

      // Meanwhile, general endpoints should still work
      const generalRequests = [];

      for (let i = 0; i < 20; i++) {
        generalRequests.push(
          request(app.getHttpServer())
            .get('/api/v1/public/health')
        );
      }

      const generalResponses = await Promise.all(generalRequests);
      const generalRateLimited = generalResponses.filter(r => r.status === 429);

      // General endpoint should have higher limit
      expect(generalRateLimited.length).toBeLessThan(authRateLimited.length);
    });

    it('should apply moderate limits to AI endpoints', async () => {
      const aiRequests = [];
      const token = 'user-token'; // Would need actual token

      for (let i = 0; i < 21; i++) {
        aiRequests.push(
          request(app.getHttpServer())
            .post('/api/v1/ai/process')
            .set('Authorization', `Bearer ${token}`)
            .send({ data: 'test' })
        );
      }

      const responses = await Promise.all(aiRequests);

      // Should be rate limited after 20 requests per minute
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});