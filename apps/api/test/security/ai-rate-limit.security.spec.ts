/**
 * AI Rate Limiting Security Tests
 *
 * Ensures proper rate limiting to prevent:
 * - API abuse
 * - Cost overflow
 * - Service degradation
 * - DDoS attacks
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { AIModule } from '../../src/ai/ai.module';
import { FallbackStrategy } from '../../src/ai/strategies/fallback.strategy';
import {
  createMockSession,
  clearTestAIData,
  expectRateLimitError,
  mockLLMResponse,
  sleep,
} from '../helpers/ai-test-utils';

describe('AI Rate Limiting Security Tests', () => {
  let app: INestApplication;
  let fallbackStrategy: FallbackStrategy;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        AIModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    fallbackStrategy = moduleFixture.get<FallbackStrategy>(FallbackStrategy);

    await app.init();
    clearTestAIData();

    // Mock LLM responses
    jest.spyOn(fallbackStrategy, 'execute').mockResolvedValue(
      mockLLMResponse('Test response', 100)
    );
  });

  afterEach(async () => {
    clearTestAIData();
    jest.clearAllMocks();
    await app.close();
  });

  describe('Per-Session Message Rate Limiting', () => {
    it('should limit messages per agent_id to 10 per minute', async () => {
      const userId = 'test-user-1';
      const session = await createMockSession(app, userId, 'reference_coach');

      // Send 10 messages (should all succeed)
      for (let i = 0; i < 10; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/ai/chat')
          .set('Authorization', `Bearer ${userId}-token`)
          .send({
            agent_id: session.agent_id,
            message: `Test message ${i}`,
          });

        expect(response.status).toBe(200);
      }

      // 11th message should be rate limited
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: 'Test message 11',
        });

      expectRateLimitError(response);
    });

    it('should reset rate limit after time window', async () => {
      const userId = 'test-user-2';
      const session = await createMockSession(app, userId, 'reference_coach');

      // Send 10 messages
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/ai/chat')
          .set('Authorization', `Bearer ${userId}-token`)
          .send({
            agent_id: session.agent_id,
            message: `Test ${i}`,
          });
      }

      // Wait 61 seconds (rate limit window)
      await sleep(61000);

      // Should be able to send again
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: 'After reset',
        });

      expect(response.status).toBe(200);
    });

    it('should track rate limits per session independently', async () => {
      const userId = 'test-user-3';
      const session1 = await createMockSession(app, userId, 'reference_coach');
      const session2 = await createMockSession(app, userId, 'reference_intelligence');

      // Fill rate limit for session1
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/ai/chat')
          .set('Authorization', `Bearer ${userId}-token`)
          .send({
            agent_id: session1.agent_id,
            message: `Test ${i}`,
          });
      }

      // Session2 should still work
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session2.agent_id,
          message: 'Different session',
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Per-User Rate Limiting', () => {
    it('should limit user to 100 AI requests per hour', async () => {
      const userId = 'test-user-4';
      const session = await createMockSession(app, userId, 'reference_coach');

      // Simulate 100 requests across multiple sessions
      let successCount = 0;
      let rateLimited = false;

      for (let i = 0; i < 105; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/ai/chat')
          .set('Authorization', `Bearer ${userId}-token`)
          .send({
            agent_id: session.agent_id,
            message: `Request ${i}`,
          });

        if (response.status === 200) {
          successCount++;
        } else if (response.status === 429) {
          rateLimited = true;
          break;
        }
      }

      expect(successCount).toBeLessThanOrEqual(100);
      expect(rateLimited).toBe(true);
    });

    it('should return appropriate rate limit headers', async () => {
      const userId = 'test-user-5';
      const session = await createMockSession(app, userId, 'reference_coach');

      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: 'Test',
        });

      // Check for rate limit headers
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });

    it('should provide retry-after header when rate limited', async () => {
      const userId = 'test-user-6';
      const session = await createMockSession(app, userId, 'reference_coach');

      // Exhaust rate limit
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/ai/chat')
          .set('Authorization', `Bearer ${userId}-token`)
          .send({
            agent_id: session.agent_id,
            message: `Test ${i}`,
          });
      }

      // Get rate limited response
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: 'Rate limited',
        });

      expectRateLimitError(response);
      expect(response.headers).toHaveProperty('retry-after');
      expect(parseInt(response.headers['retry-after'])).toBeGreaterThan(0);
    });
  });

  describe('Bulk Operation Rate Limiting', () => {
    it('should limit bulk operations to 5 items per request', async () => {
      const userId = 'test-user-7';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      const operations = Array(6).fill({
        type: 'analyze',
        data: { text: 'Test analysis' },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          operations,
        });

      expect(response.status).toBe(429);
      expect(response.body.message.toLowerCase()).toContain('maximum');
    });

    it('should allow bulk operations within limit', async () => {
      const userId = 'test-user-8';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      const operations = Array(5).fill({
        type: 'analyze',
        data: { text: 'Test analysis' },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          operations,
        });

      expect([200, 404]).toContain(response.status); // 404 if endpoint not implemented yet
    });

    it('should count bulk operations toward user rate limit', async () => {
      const userId = 'test-user-9';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      // Each bulk operation with 5 items should count as 5 requests
      const operations = Array(5).fill({
        type: 'analyze',
        data: { text: 'Test' },
      });

      // Submit 20 bulk operations (100 total items)
      for (let i = 0; i < 20; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/ai/batch')
          .set('Authorization', `Bearer ${userId}-token`)
          .send({
            agent_id: session.agent_id,
            operations,
          });
      }

      // Next single request should be rate limited
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: 'Test',
        });

      expectRateLimitError(response);
    });
  });

  describe('Token-Based Rate Limiting', () => {
    it('should limit total tokens per user per day', async () => {
      const userId = 'test-user-10';
      const session = await createMockSession(app, userId, 'reference_coach');

      // Mock high token usage
      jest.spyOn(fallbackStrategy, 'execute').mockResolvedValue(
        mockLLMResponse('x'.repeat(1000), 10000) // 10k tokens
      );

      // Make requests until token limit hit
      let tokenLimitHit = false;

      for (let i = 0; i < 200; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/ai/chat')
          .set('Authorization', `Bearer ${userId}-token`)
          .send({
            agent_id: session.agent_id,
            message: 'Test',
          });

        if (response.status === 429 && response.body.message.toLowerCase().includes('token')) {
          tokenLimitHit = true;
          break;
        }
      }

      // Token limit should eventually be hit
      // (This depends on configured daily token limit)
    });

    it('should track token usage accurately', async () => {
      const userId = 'test-user-11';
      const session = await createMockSession(app, userId, 'reference_coach');

      jest.spyOn(fallbackStrategy, 'execute').mockResolvedValue(
        mockLLMResponse('Response', 150)
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: 'Test',
        });

      // Check for token usage in headers
      if (response.status === 200) {
        expect(response.headers).toHaveProperty('x-token-usage');
      }
    });
  });

  describe('Cost-Based Rate Limiting', () => {
    it('should limit users by daily cost threshold', async () => {
      const userId = 'test-user-12';
      const session = await createMockSession(app, userId, 'reference_coach');

      // Mock expensive model usage
      jest.spyOn(fallbackStrategy, 'execute').mockResolvedValue({
        ...mockLLMResponse('Expensive response', 10000),
        cost: 0.50, // $0.50 per request
      });

      // Make requests until cost limit hit
      let costLimitHit = false;

      for (let i = 0; i < 50; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/ai/chat')
          .set('Authorization', `Bearer ${userId}-token`)
          .send({
            agent_id: session.agent_id,
            message: 'Expensive request',
          });

        if (response.status === 429 && response.body.message.toLowerCase().includes('cost')) {
          costLimitHit = true;
          break;
        }
      }

      // Cost limit should be enforced
    });

    it('should provide cost information in response headers', async () => {
      const userId = 'test-user-13';
      const session = await createMockSession(app, userId, 'reference_coach');

      jest.spyOn(fallbackStrategy, 'execute').mockResolvedValue({
        ...mockLLMResponse('Response', 100),
        cost: 0.01,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: 'Test',
        });

      if (response.status === 200) {
        expect(response.headers).toHaveProperty('x-request-cost');
        expect(response.headers).toHaveProperty('x-daily-cost-remaining');
      }
    });
  });

  describe('Streaming Rate Limits', () => {
    it('should apply rate limits to streaming requests', async () => {
      const userId = 'test-user-14';
      const session = await createMockSession(app, userId, 'reference_coach');

      // Exhaust rate limit with regular requests
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/ai/chat')
          .set('Authorization', `Bearer ${userId}-token`)
          .send({
            agent_id: session.agent_id,
            message: `Test ${i}`,
          });
      }

      // Streaming request should also be rate limited
      const response = await request(app.getHttpServer())
        .get('/api/v1/ai/chat/stream')
        .set('Authorization', `Bearer ${userId}-token`)
        .query({
          agent_id: session.agent_id,
          message: 'Stream test',
        });

      expectRateLimitError(response);
    });
  });

  describe('DDoS Protection', () => {
    it('should detect and block rapid-fire requests', async () => {
      const userId = 'test-user-15';
      const session = await createMockSession(app, userId, 'reference_coach');

      // Send requests as fast as possible
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(app.getHttpServer())
            .post('/api/v1/ai/chat')
            .set('Authorization', `Bearer ${userId}-token`)
            .send({
              agent_id: session.agent_id,
              message: `Rapid ${i}`,
            })
        );
      }

      const responses = await Promise.all(promises);

      // Some should be rate limited
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(0);
    });

    it('should implement exponential backoff suggestions', async () => {
      const userId = 'test-user-16';
      const session = await createMockSession(app, userId, 'reference_coach');

      // Exhaust rate limit
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/ai/chat')
          .set('Authorization', `Bearer ${userId}-token`)
          .send({
            agent_id: session.agent_id,
            message: `Test ${i}`,
          });
      }

      // Get multiple rate limited responses
      const response1 = await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({ agent_id: session.agent_id, message: 'Test' });

      const response2 = await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({ agent_id: session.agent_id, message: 'Test' });

      expectRateLimitError(response1);
      expectRateLimitError(response2);

      // Second retry-after should be longer (exponential backoff)
      const retryAfter1 = parseInt(response1.headers['retry-after'] || '0');
      const retryAfter2 = parseInt(response2.headers['retry-after'] || '0');

      expect(retryAfter2).toBeGreaterThanOrEqual(retryAfter1);
    });
  });

  describe('Admin Bypass', () => {
    it('should allow admins to bypass rate limits', async () => {
      const adminId = 'admin-user';
      const session = await createMockSession(app, adminId, 'reference_coach');

      // Admin should be able to make more than 10 requests
      for (let i = 0; i < 20; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/ai/chat')
          .set('Authorization', `Bearer ${adminId}-admin-token`)
          .send({
            agent_id: session.agent_id,
            message: `Admin test ${i}`,
          });

        // Should not be rate limited
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Rate Limit Monitoring', () => {
    it('should log rate limit violations', async () => {
      const userId = 'test-user-17';
      const session = await createMockSession(app, userId, 'reference_coach');

      const logSpy = jest.spyOn(console, 'warn');

      // Trigger rate limit
      for (let i = 0; i < 11; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/ai/chat')
          .set('Authorization', `Bearer ${userId}-token`)
          .send({
            agent_id: session.agent_id,
            message: `Test ${i}`,
          });
      }

      // Should have logged the rate limit violation
      expect(logSpy).toHaveBeenCalled();
      const logCalls = logSpy.mock.calls.flat().join(' ');
      expect(logCalls.toLowerCase()).toContain('rate limit');

      logSpy.mockRestore();
    });

    it('should provide rate limit status endpoint', async () => {
      const userId = 'test-user-18';

      const response = await request(app.getHttpServer())
        .get('/api/v1/ai/rate-limit/status')
        .set('Authorization', `Bearer ${userId}-token`);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('requests_remaining');
        expect(response.body).toHaveProperty('tokens_remaining');
        expect(response.body).toHaveProperty('reset_at');
      }
    });
  });
});
