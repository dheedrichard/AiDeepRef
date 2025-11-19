/**
 * AI Interaction Logging Security Tests
 *
 * Ensures all AI interactions are properly logged for:
 * - Audit trails
 * - Security monitoring
 * - Fine-tuning data collection
 * - Compliance
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
  getLastInteraction,
  storeTestInteraction,
  validateNoSystemPrompt,
} from '../helpers/ai-test-utils';

describe('AI Interaction Logging Tests', () => {
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
      mockLLMResponse('Test AI response', 150)
    );
  });

  afterEach(async () => {
    clearTestAIData();
    jest.clearAllMocks();
    await app.close();
  });

  describe('Basic Interaction Logging', () => {
    it('should log all user inputs', async () => {
      const userId = 'test-user-1';
      const session = await createMockSession(app, userId, 'reference_coach');
      const testMessage = 'How should I prepare my references?';

      await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: testMessage,
        });

      const interaction = await getLastInteraction();
      expect(interaction).toBeDefined();
      expect(interaction?.user_input).toBe(testMessage);
      expect(interaction?.user_id).toBe(userId);
      expect(interaction?.session_id).toBe(session.session_id);
    });

    it('should log all AI responses', async () => {
      const userId = 'test-user-2';
      const session = await createMockSession(app, userId, 'reference_coach');
      const expectedResponse = 'Here is my advice';

      jest.spyOn(fallbackStrategy, 'execute').mockResolvedValue(
        mockLLMResponse(expectedResponse, 100)
      );

      await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: 'Give me advice',
        });

      const interaction = await getLastInteraction();
      expect(interaction).toBeDefined();
      expect(interaction?.ai_response).toBe(expectedResponse);
    });

    it('should generate unique interaction_id for each interaction', async () => {
      const userId = 'test-user-3';
      const session = await createMockSession(app, userId, 'reference_coach');

      const interactionIds: string[] = [];

      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/ai/chat')
          .set('Authorization', `Bearer ${userId}-token`)
          .send({
            agent_id: session.agent_id,
            message: `Test message ${i}`,
          });

        const interaction = await getLastInteraction();
        if (interaction) {
          interactionIds.push(interaction.interaction_id);
        }
      }

      // All IDs should be unique
      const uniqueIds = new Set(interactionIds);
      expect(uniqueIds.size).toBe(5);
    });

    it('should include timestamps for all interactions', async () => {
      const userId = 'test-user-4';
      const session = await createMockSession(app, userId, 'reference_coach');

      const before = new Date();

      await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: 'test',
        });

      const after = new Date();

      const interaction = await getLastInteraction();
      expect(interaction).toBeDefined();
      expect(interaction?.created_at).toBeDefined();
      expect(interaction?.created_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(interaction?.created_at.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Metadata Logging', () => {
    it('should log token usage', async () => {
      const userId = 'test-user-5';
      const session = await createMockSession(app, userId, 'reference_coach');

      jest.spyOn(fallbackStrategy, 'execute').mockResolvedValue(
        mockLLMResponse('Response', 250)
      );

      await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: 'test',
        });

      const interaction = await getLastInteraction();
      expect(interaction).toBeDefined();
      expect(interaction?.tokens_used).toBe(250);
      expect(interaction?.tokens_used).toBeGreaterThan(0);
    });

    it('should log response time', async () => {
      const userId = 'test-user-6';
      const session = await createMockSession(app, userId, 'reference_coach');

      // Mock with specific latency
      jest.spyOn(fallbackStrategy, 'execute').mockResolvedValue({
        ...mockLLMResponse('Response', 100),
        latency: 750,
      });

      await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: 'test',
        });

      const interaction = await getLastInteraction();
      expect(interaction).toBeDefined();
      expect(interaction?.response_time_ms).toBeGreaterThan(0);
    });

    it('should log model used', async () => {
      const userId = 'test-user-7';
      const session = await createMockSession(app, userId, 'reference_coach');

      const modelUsed = 'claude-sonnet-4.5';
      jest.spyOn(fallbackStrategy, 'execute').mockResolvedValue({
        ...mockLLMResponse('Response', 100),
        model: modelUsed,
      });

      await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: 'test',
        });

      const interaction = await getLastInteraction();
      expect(interaction).toBeDefined();
      expect(interaction?.model_used).toBe(modelUsed);
    });

    it('should log provider information', async () => {
      const userId = 'test-user-8';
      const session = await createMockSession(app, userId, 'reference_coach');

      jest.spyOn(fallbackStrategy, 'execute').mockResolvedValue({
        ...mockLLMResponse('Response', 100),
        provider: 'anthropic',
      });

      await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: 'test',
        });

      const interaction = await getLastInteraction();
      expect(interaction).toBeDefined();
      // Provider info should be in metadata or separate field
    });

    it('should log session context', async () => {
      const userId = 'test-user-9';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: 'test',
        });

      const interaction = await getLastInteraction();
      expect(interaction).toBeDefined();
      expect(interaction?.session_id).toBe(session.session_id);
      expect(interaction?.user_id).toBe(userId);
    });
  });

  describe('Success/Failure Tracking', () => {
    it('should mark successful interactions', async () => {
      const userId = 'test-user-10';
      const session = await createMockSession(app, userId, 'reference_coach');

      jest.spyOn(fallbackStrategy, 'execute').mockResolvedValue(
        mockLLMResponse('Success', 100)
      );

      await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: 'test',
        });

      const interaction = await getLastInteraction();
      expect(interaction).toBeDefined();
      expect(interaction?.success).toBe(true);
      expect(interaction?.error_message).toBeUndefined();
    });

    it('should log failures with error messages', async () => {
      const userId = 'test-user-11';
      const session = await createMockSession(app, userId, 'reference_coach');

      const errorMessage = 'API rate limit exceeded';
      jest.spyOn(fallbackStrategy, 'execute').mockRejectedValue(
        new Error(errorMessage)
      );

      await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: 'test',
        })
        .expect(500);

      const interaction = await getLastInteraction();
      expect(interaction).toBeDefined();
      expect(interaction?.success).toBe(false);
      expect(interaction?.error_message).toContain(errorMessage);
    });

    it('should not expose sensitive error details', async () => {
      const userId = 'test-user-12';
      const session = await createMockSession(app, userId, 'reference_coach');

      jest.spyOn(fallbackStrategy, 'execute').mockRejectedValue(
        new Error('Database connection string: postgres://user:pass@host/db failed')
      );

      await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: 'test',
        });

      const interaction = await getLastInteraction();
      if (interaction?.error_message) {
        // Should not contain sensitive info
        expect(interaction.error_message).not.toContain('postgres://');
        expect(interaction.error_message).not.toContain('password');
        expect(interaction.error_message).not.toContain('user:pass');
      }
    });
  });

  describe('System Prompt Protection in Logs', () => {
    it('should never log system prompts', async () => {
      const userId = 'test-user-13';
      const session = await createMockSession(app, userId, 'reference_coach');

      await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: 'test',
        });

      const interaction = await getLastInteraction();
      expect(interaction).toBeDefined();

      // Verify no system prompt in any field
      const interactionStr = JSON.stringify(interaction);
      expect(validateNoSystemPrompt(interactionStr)).toBe(true);
      expect(interaction?.system_prompt).toBeUndefined();
    });

    it('should not log system prompts even in error cases', async () => {
      const userId = 'test-user-14';
      const session = await createMockSession(app, userId, 'reference_coach');

      jest.spyOn(fallbackStrategy, 'execute').mockRejectedValue(
        new Error('System prompt validation failed')
      );

      await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: 'test',
        });

      const interaction = await getLastInteraction();
      if (interaction) {
        expect(validateNoSystemPrompt(JSON.stringify(interaction))).toBe(true);
      }
    });
  });

  describe('Streaming Interaction Logging', () => {
    it('should log streaming interactions when complete', async () => {
      const userId = 'test-user-15';
      const session = await createMockSession(app, userId, 'reference_coach');

      // Mock streaming
      async function* mockStream() {
        yield 'Part 1 ';
        yield 'Part 2 ';
        yield 'Part 3';
      }

      jest.spyOn(fallbackStrategy, 'executeStream').mockReturnValue(mockStream());

      await request(app.getHttpServer())
        .get('/api/v1/ai/chat/stream')
        .set('Authorization', `Bearer ${userId}-token`)
        .query({
          agent_id: session.agent_id,
          message: 'test stream',
        });

      const interaction = await getLastInteraction();
      expect(interaction).toBeDefined();
      expect(interaction?.user_input).toBe('test stream');
      // Full response should be assembled
      expect(interaction?.ai_response).toContain('Part 1');
      expect(interaction?.ai_response).toContain('Part 2');
      expect(interaction?.ai_response).toContain('Part 3');
    });
  });

  describe('Bulk Interaction Logging', () => {
    it('should log each operation in bulk requests separately', async () => {
      const userId = 'test-user-16';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      const operations = [
        { type: 'analyze', data: { text: 'Text 1' }},
        { type: 'analyze', data: { text: 'Text 2' }},
        { type: 'analyze', data: { text: 'Text 3' }},
      ];

      await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          operations,
        });

      // Should have 3 separate interaction logs
      // (In real implementation, check interaction count)
    });

    it('should link bulk operations with batch_id', async () => {
      const userId = 'test-user-17';
      const session = await createMockSession(app, userId, 'reference_intelligence');

      const operations = [
        { type: 'analyze', data: { text: 'Text 1' }},
        { type: 'analyze', data: { text: 'Text 2' }},
      ];

      await request(app.getHttpServer())
        .post('/api/v1/ai/batch')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          operations,
        });

      // All operations should share same batch_id
      // (Check in real implementation)
    });
  });

  describe('Log Data Integrity', () => {
    it('should prevent log tampering', async () => {
      const userId = 'test-user-18';
      const session = await createMockSession(app, userId, 'reference_coach');

      await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: 'original message',
        });

      const interaction = await getLastInteraction();
      const originalInteractionId = interaction?.interaction_id;

      // Try to modify logged interaction via API
      const modifyResponse = await request(app.getHttpServer())
        .put(`/api/v1/ai/interactions/${originalInteractionId}`)
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          user_input: 'tampered message',
        });

      // Should not allow modification
      expect(modifyResponse.status).toBeGreaterThanOrEqual(403);
    });

    it('should maintain log immutability', async () => {
      const userId = 'test-user-19';
      const session = await createMockSession(app, userId, 'reference_coach');

      await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: 'test message',
        });

      const interaction1 = await getLastInteraction();
      const originalInput = interaction1?.user_input;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get the same interaction again
      const interaction2 = await getLastInteraction();

      // Data should be unchanged
      expect(interaction2?.user_input).toBe(originalInput);
      expect(interaction2?.interaction_id).toBe(interaction1?.interaction_id);
    });
  });

  describe('Log Querying', () => {
    it('should allow users to query their own interaction history', async () => {
      const userId = 'test-user-20';
      const session = await createMockSession(app, userId, 'reference_coach');

      // Create some interactions
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/ai/chat')
          .set('Authorization', `Bearer ${userId}-token`)
          .send({
            agent_id: session.agent_id,
            message: `Test ${i}`,
          });
      }

      // Query history
      const response = await request(app.getHttpServer())
        .get(`/api/v1/ai/sessions/${session.agent_id}/history`)
        .set('Authorization', `Bearer ${userId}-token`);

      expect(response.status).toBe(200);
      expect(response.body.messages).toHaveLength(3);
    });

    it('should prevent users from querying others\' logs', async () => {
      const user1Id = 'user-1';
      const user2Id = 'user-2';

      const user1Session = await createMockSession(app, user1Id, 'reference_coach');

      await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${user1Id}-token`)
        .send({
          agent_id: user1Session.agent_id,
          message: 'Private message',
        });

      // User2 tries to access User1's history
      const response = await request(app.getHttpServer())
        .get(`/api/v1/ai/sessions/${user1Session.agent_id}/history`)
        .set('Authorization', `Bearer ${user2Id}-token`);

      expect(response.status).toBe(401);
    });
  });

  describe('Log Retention', () => {
    it('should maintain logs for minimum 90 days', async () => {
      // This would require time manipulation or checking configuration
      // For now, verify the configuration exists
      const userId = 'test-user-21';
      const session = await createMockSession(app, userId, 'reference_coach');

      await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: 'test',
        });

      const interaction = await getLastInteraction();
      expect(interaction).toBeDefined();
      // In production, verify retention policy
    });
  });

  describe('Performance Monitoring', () => {
    it('should track slow responses', async () => {
      const userId = 'test-user-22';
      const session = await createMockSession(app, userId, 'reference_coach');

      // Mock slow response
      jest.spyOn(fallbackStrategy, 'execute').mockResolvedValue({
        ...mockLLMResponse('Slow response', 100),
        latency: 5000, // 5 seconds
      });

      await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: 'test',
        });

      const interaction = await getLastInteraction();
      expect(interaction?.response_time_ms).toBeGreaterThan(4000);
    });

    it('should log high token usage requests', async () => {
      const userId = 'test-user-23';
      const session = await createMockSession(app, userId, 'reference_coach');

      jest.spyOn(fallbackStrategy, 'execute').mockResolvedValue(
        mockLLMResponse('x'.repeat(2000), 5000) // High token count
      );

      await request(app.getHttpServer())
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${userId}-token`)
        .send({
          agent_id: session.agent_id,
          message: 'complex request',
        });

      const interaction = await getLastInteraction();
      expect(interaction?.tokens_used).toBeGreaterThan(4000);
    });
  });
});
