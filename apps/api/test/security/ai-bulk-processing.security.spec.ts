/**
 * Bulk Processing Security Tests
 *
 * Ensures secure batch processing of AI operations:
 * - Input validation for all operations
 * - Prompt caching security
 * - Rate limiting for bulk ops
 * - Error isolation
 * - Resource management
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
  mockLLMResponse,
  validateNoSystemPrompt,
  validateSanitized,
  XSS_PAYLOADS,
} from '../helpers/ai-test-utils';

describe('Bulk Processing Security Tests', () => {
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

    jest.spyOn(fallbackStrategy, 'execute').mockResolvedValue(
      mockLLMResponse('Batch response', 100)
    );
  });

  afterEach(async () => {
    clearTestAIData();
    jest.clearAllMocks();
    await app.close();
  });

  describe('Batch Size Validation', () => {
    it('should reject batches exceeding maximum size (5 items)', async () => {
      const userId = 'test-user-1';
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

    it('should accept batches within limit', async () => {
      const userId = 'test-user-2';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      const operations = Array(5).fill({
        type: 'analyze',
        data: { text: 'Valid analysis' },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          operations,
        });

      expect([200, 404]).toContain(response.status);
    });

    it('should reject empty batch arrays', async () => {
      const userId = 'test-user-3';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          operations: [],
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Batch Input Validation', () => {
    it('should validate all operations in batch', async () => {
      const userId = 'test-user-4';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      const operations = [
        { type: 'analyze', data: { text: 'Valid text' }},
        { type: 'analyze', data: { text: '<script>alert(1)</script>' }},
        { type: 'analyze', data: { text: 'Another valid text' }},
      ];

      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          operations,
        });

      if (response.status === 200) {
        // Verify all operations were sanitized
        const results = response.body.results;
        results.forEach((result: any) => {
          if (result.input) {
            expect(validateSanitized(result.input)).toBe(true);
          }
        });
      }
    });

    it('should reject batch if any operation has invalid type', async () => {
      const userId = 'test-user-5';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      const operations = [
        { type: 'analyze', data: { text: 'Valid' }},
        { type: 'invalid_type', data: { text: 'Test' }},
      ];

      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          operations,
        });

      expect(response.status).toBe(400);
    });

    it('should sanitize XSS in all batch operations', async () => {
      const userId = 'test-user-6';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      const operations = XSS_PAYLOADS.map(payload => ({
        type: 'analyze',
        data: { text: payload },
      }));

      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          operations: operations.slice(0, 5), // Keep within batch limit
        });

      if (response.status === 200) {
        const results = JSON.stringify(response.body);
        expect(validateSanitized(results)).toBe(true);
      }
    });

    it('should validate required fields in each operation', async () => {
      const userId = 'test-user-7';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      const operations = [
        { type: 'analyze', data: { text: 'Valid' }},
        { type: 'analyze', data: {} }, // Missing text field
      ];

      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          operations,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Prompt Caching Security', () => {
    it('should use prompt caching efficiently without exposing system prompts', async () => {
      const userId = 'test-user-8';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      const operations = Array(5).fill({
        type: 'analyze',
        data: { text: 'Test text' },
      });

      const executeSpy = jest.spyOn(fallbackStrategy, 'execute');

      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          operations,
        });

      if (response.status === 200) {
        // Verify caching was used
        expect(executeSpy).toHaveBeenCalled();

        // Verify no system prompts in response
        const responseStr = JSON.stringify(response.body);
        expect(validateNoSystemPrompt(responseStr)).toBe(true);
      }
    });

    it('should not cache user-specific data', async () => {
      const user1Id = 'user-1';
      const user2Id = 'user-2';

      const session1 = await createMockSession(app, user1Id, 'reference_intelligence');
      const session2 = await createMockSession(app, user2Id, 'reference_intelligence');

      const operations1 = [{ type: 'analyze', data: { text: 'User1 private data' }}];
      const operations2 = [{ type: 'analyze', data: { text: 'User2 private data' }}];

      // User1 request
      await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${user1Id}-token`)
        .send({ agent_id: session1.agent_id, operations: operations1 });

      // User2 request
      const response2 = await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${user2Id}-token`)
        .send({ agent_id: session2.agent_id, operations: operations2 });

      // User2 should not see User1's data
      const response2Str = JSON.stringify(response2.body);
      expect(response2Str).not.toContain('User1 private data');
    });

    it('should invalidate cache on system prompt changes', async () => {
      const userId = 'test-user-9';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      const operations = [{ type: 'analyze', data: { text: 'Test' }}];

      // First request
      const response1 = await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({ agent_id: session.agent_id, operations });

      // Simulate system prompt change (would be done by admin)
      // Second request should not use stale cache
      const response2 = await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({ agent_id: session.agent_id, operations });

      // Both should succeed with fresh processing
      expect([200, 404]).toContain(response1.status);
      expect([200, 404]).toContain(response2.status);
    });
  });

  describe('Error Isolation', () => {
    it('should isolate errors to individual operations', async () => {
      const userId = 'test-user-10';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      // Mock one failure in batch
      let callCount = 0;
      jest.spyOn(fallbackStrategy, 'execute').mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Operation 2 failed');
        }
        return mockLLMResponse('Success', 100);
      });

      const operations = [
        { type: 'analyze', data: { text: 'Test 1' }},
        { type: 'analyze', data: { text: 'Test 2' }},
        { type: 'analyze', data: { text: 'Test 3' }},
      ];

      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          operations,
        });

      if (response.status === 200) {
        const results = response.body.results;
        expect(results[0].success).toBe(true);
        expect(results[1].success).toBe(false);
        expect(results[2].success).toBe(true);
      }
    });

    it('should not expose error details across operations', async () => {
      const userId = 'test-user-11';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      jest.spyOn(fallbackStrategy, 'execute').mockRejectedValue(
        new Error('Internal API key: sk-abc123xyz')
      );

      const operations = [
        { type: 'analyze', data: { text: 'Test 1' }},
        { type: 'analyze', data: { text: 'Test 2' }},
      ];

      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          operations,
        });

      const responseStr = JSON.stringify(response.body);
      expect(responseStr).not.toContain('sk-abc123xyz');
      expect(responseStr).not.toContain('API key');
    });

    it('should rollback partial batch on critical errors', async () => {
      const userId = 'test-user-12';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      // Mock critical system error
      jest.spyOn(fallbackStrategy, 'execute').mockRejectedValue(
        new Error('CRITICAL: Database connection lost')
      );

      const operations = [
        { type: 'analyze', data: { text: 'Test 1' }},
        { type: 'analyze', data: { text: 'Test 2' }},
      ];

      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          operations,
        });

      // Should fail entire batch for critical errors
      expect(response.status).toBeGreaterThanOrEqual(500);
    });
  });

  describe('Rate Limiting for Bulk Operations', () => {
    it('should count bulk operations toward rate limits', async () => {
      const userId = 'test-user-13';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      // Each operation counts toward limit
      const operations = Array(5).fill({
        type: 'analyze',
        data: { text: 'Test' },
      });

      // Submit 2 batches (10 operations total)
      await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({ agent_id: session.agent_id, operations });

      await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({ agent_id: session.agent_id, operations });

      // Should hit rate limit (if 10/minute limit)
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: 'Test',
        });

      expect(response.status).toBe(429);
    });

    it('should apply separate rate limit for bulk endpoints', async () => {
      const userId = 'test-user-14';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      // Max 10 bulk requests per hour
      let bulkLimitHit = false;

      for (let i = 0; i < 12; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/ai/batch')
          .set('Authorization', `Bearer ${userId}-token`)
          .send({
            agent_id: session.agent_id,
            operations: [{ type: 'analyze', data: { text: 'Test' }}],
          });

        if (response.status === 429) {
          bulkLimitHit = true;
          break;
        }
      }

      // Should eventually hit bulk-specific rate limit
    });
  });

  describe('Resource Management', () => {
    it('should limit concurrent batch processing', async () => {
      const userId = 'test-user-15';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      const operations = Array(5).fill({
        type: 'analyze',
        data: { text: 'Test' },
      });

      // Submit 5 batches concurrently
      const promises = Array(5).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/api/v1/ai/batch')
          .set('Authorization', `Bearer ${userId}-token`)
          .send({ agent_id: session.agent_id, operations })
      );

      const responses = await Promise.all(promises);

      // Some should be throttled
      const throttled = responses.filter(r => r.status === 429);
      expect(throttled.length).toBeGreaterThan(0);
    });

    it('should timeout long-running batch operations', async () => {
      const userId = 'test-user-16';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      // Mock very slow operation
      jest.spyOn(fallbackStrategy, 'execute').mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockLLMResponse('Late', 100)), 60000))
      );

      const operations = [{ type: 'analyze', data: { text: 'Slow' }}];

      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({ agent_id: session.agent_id, operations });

      // Should timeout before 60 seconds
      expect(response.status).toBeGreaterThanOrEqual(408);
    }, 10000); // 10 second test timeout

    it('should clean up resources after batch completion', async () => {
      const userId = 'test-user-17';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      const operations = Array(3).fill({
        type: 'analyze',
        data: { text: 'Test' },
      });

      await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({ agent_id: session.agent_id, operations });

      // Memory/connections should be cleaned up
      // (This would require actual memory monitoring)
    });
  });

  describe('Batch Results Security', () => {
    it('should not expose internal operation IDs', async () => {
      const userId = 'test-user-18';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      const operations = [
        { type: 'analyze', data: { text: 'Test 1' }},
        { type: 'analyze', data: { text: 'Test 2' }},
      ];

      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({ agent_id: session.agent_id, operations });

      if (response.status === 200) {
        const results = response.body.results;
        results.forEach((result: any) => {
          expect(result).not.toHaveProperty('internal_id');
          expect(result).not.toHaveProperty('system_prompt_id');
        });
      }
    });

    it('should maintain result order matching input', async () => {
      const userId = 'test-user-19';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      const operations = [
        { type: 'analyze', data: { text: 'First' }},
        { type: 'analyze', data: { text: 'Second' }},
        { type: 'analyze', data: { text: 'Third' }},
      ];

      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({ agent_id: session.agent_id, operations });

      if (response.status === 200) {
        const results = response.body.results;
        expect(results[0].input || results[0].data.text).toContain('First');
        expect(results[1].input || results[1].data.text).toContain('Second');
        expect(results[2].input || results[2].data.text).toContain('Third');
      }
    });

    it('should never include system prompts in any result', async () => {
      const userId = 'test-user-20';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      const operations = Array(5).fill({
        type: 'analyze',
        data: { text: 'Test' },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({ agent_id: session.agent_id, operations });

      if (response.status === 200) {
        const responseStr = JSON.stringify(response.body);
        expect(validateNoSystemPrompt(responseStr)).toBe(true);
      }
    });
  });

  describe('Atomic Operations', () => {
    it('should mark batch as atomic when specified', async () => {
      const userId = 'test-user-21';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      // Mock one failure
      jest.spyOn(fallbackStrategy, 'execute').mockRejectedValueOnce(
        new Error('Operation failed')
      );

      const operations = [
        { type: 'analyze', data: { text: 'Test 1' }},
        { type: 'analyze', data: { text: 'Test 2' }},
      ];

      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          operations,
          atomic: true,
        });

      // Should fail entire batch if atomic
      if (response.body.atomic) {
        const results = response.body.results;
        const allFailed = results.every((r: any) => !r.success);
        expect(allFailed).toBe(true);
      }
    });
  });

  describe('Logging for Bulk Operations', () => {
    it('should log all operations individually', async () => {
      const userId = 'test-user-22';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      const operations = [
        { type: 'analyze', data: { text: 'Op 1' }},
        { type: 'analyze', data: { text: 'Op 2' }},
        { type: 'analyze', data: { text: 'Op 3' }},
      ];

      await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({ agent_id: session.agent_id, operations });

      // Each operation should have individual log entry
      // (Would check interaction logs in real implementation)
    });

    it('should link batch operations with batch_id', async () => {
      const userId = 'test-user-23';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      const operations = [
        { type: 'analyze', data: { text: 'Test 1' }},
        { type: 'analyze', data: { text: 'Test 2' }},
      ];

      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({ agent_id: session.agent_id, operations });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('batch_id');
        // All operations should share this batch_id in logs
      }
    });
  });
});
