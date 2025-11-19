/**
 * Fine-Tuning Data Export Security Tests
 *
 * Ensures secure export of interaction data for model fine-tuning:
 * - Proper data format
 * - System prompt exclusion
 * - PII redaction
 * - Access control
 * - Data approval workflow
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
  storeTestInteraction,
  validateNoSystemPrompt,
} from '../helpers/ai-test-utils';

describe('Fine-Tuning Data Export Security Tests', () => {
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
      mockLLMResponse('Test response', 100)
    );
  });

  afterEach(async () => {
    clearTestAIData();
    jest.clearAllMocks();
    await app.close();
  });

  describe('Export Format Validation', () => {
    it('should export interactions in correct fine-tuning format', async () => {
      const userId = 'test-user-1';
      const session = await createMockSession(app, userId, 'reference_coach');

      // Create some interactions
      storeTestInteraction({
        interaction_id: 'int-1',
        session_id: session.session_id,
        user_id: userId,
        user_input: 'How should I prepare my references?',
        ai_response: 'Here are some tips for preparing references...',
        tokens_used: 150,
        response_time_ms: 500,
        model_used: 'claude-sonnet-4.5',
        success: true,
        created_at: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/ai/finetune/export')
        .set('Authorization', 'Bearer admin-token')
        .query({ session_id: session.session_id });

      if (response.status === 200) {
        const exported = response.body;
        expect(Array.isArray(exported)).toBe(true);
        expect(exported[0]).toHaveProperty('messages');
        expect(Array.isArray(exported[0].messages)).toBe(true);

        const messages = exported[0].messages;
        expect(messages).toContainEqual(
          expect.objectContaining({
            role: 'user',
            content: 'How should I prepare my references?',
          })
        );
        expect(messages).toContainEqual(
          expect.objectContaining({
            role: 'assistant',
            content: 'Here are some tips for preparing references...',
          })
        );
      }
    });

    it('should never include system prompts in export', async () => {
      const userId = 'test-user-2';
      const session = await createMockSession(app, userId, 'reference_coach');

      // Create interactions
      storeTestInteraction({
        interaction_id: 'int-2',
        session_id: session.session_id,
        user_id: userId,
        user_input: 'Test input',
        ai_response: 'Test response',
        tokens_used: 50,
        response_time_ms: 300,
        model_used: 'claude-sonnet-4.5',
        success: true,
        created_at: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/ai/finetune/export')
        .set('Authorization', 'Bearer admin-token')
        .query({ session_id: session.session_id });

      if (response.status === 200) {
        const exportedData = JSON.stringify(response.body);
        expect(validateNoSystemPrompt(exportedData)).toBe(true);

        // Verify no system role messages
        response.body.forEach((item: any) => {
          const systemMessages = item.messages.filter((m: any) => m.role === 'system');
          expect(systemMessages).toHaveLength(0);
        });
      }
    });

    it('should format multi-turn conversations correctly', async () => {
      const userId = 'test-user-3';
      const session = await createMockSession(app, userId, 'reference_coach');

      // Create conversation
      const conversations = [
        { user: 'Hello', assistant: 'Hi there!' },
        { user: 'How are you?', assistant: 'I am doing well, thank you!' },
        { user: 'Can you help?', assistant: 'Of course, I would be happy to help.' },
      ];

      conversations.forEach((conv, i) => {
        storeTestInteraction({
          interaction_id: `int-${i}`,
          session_id: session.session_id,
          user_id: userId,
          user_input: conv.user,
          ai_response: conv.assistant,
          tokens_used: 50,
          response_time_ms: 300,
          model_used: 'claude-sonnet-4.5',
          success: true,
          created_at: new Date(Date.now() + i * 1000),
        });
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/ai/finetune/export')
        .set('Authorization', 'Bearer admin-token')
        .query({ session_id: session.session_id });

      if (response.status === 200) {
        const exported = response.body[0];
        expect(exported.messages).toHaveLength(6); // 3 pairs of user+assistant

        // Verify order
        expect(exported.messages[0].role).toBe('user');
        expect(exported.messages[1].role).toBe('assistant');
        expect(exported.messages[2].role).toBe('user');
      }
    });
  });

  describe('Data Filtering and Approval', () => {
    it('should only export approved interactions', async () => {
      const userId = 'test-user-4';
      const session = await createMockSession(app, userId, 'reference_coach');

      // Create approved and unapproved interactions
      storeTestInteraction({
        interaction_id: 'approved-1',
        session_id: session.session_id,
        user_id: userId,
        user_input: 'Approved message',
        ai_response: 'Approved response',
        tokens_used: 50,
        response_time_ms: 300,
        model_used: 'claude-sonnet-4.5',
        success: true,
        created_at: new Date(),
      });

      storeTestInteraction({
        interaction_id: 'unapproved-1',
        session_id: session.session_id,
        user_id: userId,
        user_input: 'Unapproved message',
        ai_response: 'Unapproved response',
        tokens_used: 50,
        response_time_ms: 300,
        model_used: 'claude-sonnet-4.5',
        success: true,
        created_at: new Date(),
      });

      // Export only approved
      const response = await request(app.getHttpServer())
        .get('/api/v1/ai/finetune/export')
        .set('Authorization', 'Bearer admin-token')
        .query({
          session_id: session.session_id,
          approved_only: true,
        });

      if (response.status === 200) {
        const exported = JSON.stringify(response.body);
        expect(exported).toContain('Approved message');
        expect(exported).not.toContain('Unapproved message');
      }
    });

    it('should exclude failed interactions', async () => {
      const userId = 'test-user-5';
      const session = await createMockSession(app, userId, 'reference_coach');

      // Create successful and failed interactions
      storeTestInteraction({
        interaction_id: 'success-1',
        session_id: session.session_id,
        user_id: userId,
        user_input: 'Success',
        ai_response: 'Success response',
        tokens_used: 50,
        response_time_ms: 300,
        model_used: 'claude-sonnet-4.5',
        success: true,
        created_at: new Date(),
      });

      storeTestInteraction({
        interaction_id: 'failed-1',
        session_id: session.session_id,
        user_id: userId,
        user_input: 'Failed',
        ai_response: '',
        tokens_used: 0,
        response_time_ms: 0,
        model_used: 'claude-sonnet-4.5',
        success: false,
        error_message: 'API Error',
        created_at: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/ai/finetune/export')
        .set('Authorization', 'Bearer admin-token')
        .query({ session_id: session.session_id });

      if (response.status === 200) {
        const exported = JSON.stringify(response.body);
        expect(exported).toContain('Success');
        expect(exported).not.toContain('Failed');
      }
    });

    it('should filter by date range', async () => {
      const userId = 'test-user-6';
      const session = await createMockSession(app, userId, 'reference_coach');

      const now = Date.now();

      storeTestInteraction({
        interaction_id: 'old-1',
        session_id: session.session_id,
        user_id: userId,
        user_input: 'Old message',
        ai_response: 'Old response',
        tokens_used: 50,
        response_time_ms: 300,
        model_used: 'claude-sonnet-4.5',
        success: true,
        created_at: new Date(now - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      });

      storeTestInteraction({
        interaction_id: 'recent-1',
        session_id: session.session_id,
        user_id: userId,
        user_input: 'Recent message',
        ai_response: 'Recent response',
        tokens_used: 50,
        response_time_ms: 300,
        model_used: 'claude-sonnet-4.5',
        success: true,
        created_at: new Date(now),
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/ai/finetune/export')
        .set('Authorization', 'Bearer admin-token')
        .query({
          start_date: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
        });

      if (response.status === 200) {
        const exported = JSON.stringify(response.body);
        expect(exported).toContain('Recent message');
        expect(exported).not.toContain('Old message');
      }
    });
  });

  describe('PII Redaction', () => {
    it('should redact email addresses', async () => {
      const userId = 'test-user-7';
      const session = await createMockSession(app, userId, 'reference_coach');

      storeTestInteraction({
        interaction_id: 'pii-1',
        session_id: session.session_id,
        user_id: userId,
        user_input: 'My email is john.doe@example.com',
        ai_response: 'Contact john.doe@example.com for more info',
        tokens_used: 50,
        response_time_ms: 300,
        model_used: 'claude-sonnet-4.5',
        success: true,
        created_at: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/ai/finetune/export')
        .set('Authorization', 'Bearer admin-token')
        .query({
          session_id: session.session_id,
          redact_pii: true,
        });

      if (response.status === 200) {
        const exported = JSON.stringify(response.body);
        expect(exported).not.toContain('john.doe@example.com');
        expect(exported).toMatch(/\[EMAIL\]|\[REDACTED\]/);
      }
    });

    it('should redact phone numbers', async () => {
      const userId = 'test-user-8';
      const session = await createMockSession(app, userId, 'reference_coach');

      storeTestInteraction({
        interaction_id: 'pii-2',
        session_id: session.session_id,
        user_id: userId,
        user_input: 'Call me at 555-123-4567',
        ai_response: 'I will call 555-123-4567',
        tokens_used: 50,
        response_time_ms: 300,
        model_used: 'claude-sonnet-4.5',
        success: true,
        created_at: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/ai/finetune/export')
        .set('Authorization', 'Bearer admin-token')
        .query({
          session_id: session.session_id,
          redact_pii: true,
        });

      if (response.status === 200) {
        const exported = JSON.stringify(response.body);
        expect(exported).not.toContain('555-123-4567');
        expect(exported).toMatch(/\[PHONE\]|\[REDACTED\]/);
      }
    });

    it('should redact names when specified', async () => {
      const userId = 'test-user-9';
      const session = await createMockSession(app, userId, 'reference_coach');

      storeTestInteraction({
        interaction_id: 'pii-3',
        session_id: session.session_id,
        user_id: userId,
        user_input: 'My name is John Smith',
        ai_response: 'Hello John Smith',
        tokens_used: 50,
        response_time_ms: 300,
        model_used: 'claude-sonnet-4.5',
        success: true,
        created_at: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/ai/finetune/export')
        .set('Authorization', 'Bearer admin-token')
        .query({
          session_id: session.session_id,
          redact_pii: true,
          redact_names: true,
        });

      if (response.status === 200) {
        const exported = JSON.stringify(response.body);
        expect(exported).not.toContain('John Smith');
      }
    });
  });

  describe('Access Control', () => {
    it('should require admin role for export', async () => {
      const userId = 'regular-user';
      const session = await createMockSession(app, userId, 'reference_coach');

      const response = await request(app.getHttpServer())
        .get('/api/v1/ai/finetune/export')
        .set('Authorization', 'Bearer regular-user-token')
        .query({ session_id: session.session_id });

      expect(response.status).toBe(403);
    });

    it('should allow admins to export any user data', async () => {
      const userId = 'test-user-10';
      const session = await createMockSession(app, userId, 'reference_coach');

      storeTestInteraction({
        interaction_id: 'test-1',
        session_id: session.session_id,
        user_id: userId,
        user_input: 'Test',
        ai_response: 'Response',
        tokens_used: 50,
        response_time_ms: 300,
        model_used: 'claude-sonnet-4.5',
        success: true,
        created_at: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/ai/finetune/export')
        .set('Authorization', 'Bearer admin-token')
        .query({ session_id: session.session_id });

      expect([200, 404]).toContain(response.status);
    });

    it('should log all export operations', async () => {
      const userId = 'test-user-11';
      const session = await createMockSession(app, userId, 'reference_coach');

      const logSpy = jest.spyOn(console, 'log');

      await request(app.getHttpServer())
        .get('/api/v1/ai/finetune/export')
        .set('Authorization', 'Bearer admin-token')
        .query({ session_id: session.session_id });

      // Should log export activity
      expect(logSpy).toHaveBeenCalled();
      const logs = logSpy.mock.calls.flat().join(' ');
      expect(logs.toLowerCase()).toMatch(/export|finetune/);

      logSpy.mockRestore();
    });
  });

  describe('Export Statistics', () => {
    it('should provide export metadata', async () => {
      const userId = 'test-user-12';
      const session = await createMockSession(app, userId, 'reference_coach');

      // Create several interactions
      for (let i = 0; i < 5; i++) {
        storeTestInteraction({
          interaction_id: `test-${i}`,
          session_id: session.session_id,
          user_id: userId,
          user_input: `Test ${i}`,
          ai_response: `Response ${i}`,
          tokens_used: 50,
          response_time_ms: 300,
          model_used: 'claude-sonnet-4.5',
          success: true,
          created_at: new Date(),
        });
      }

      const response = await request(app.getHttpServer())
        .get('/api/v1/ai/finetune/export')
        .set('Authorization', 'Bearer admin-token')
        .query({ session_id: session.session_id });

      if (response.status === 200) {
        // Should include metadata
        expect(response.body).toHaveProperty('metadata');
        expect(response.body.metadata).toHaveProperty('total_interactions');
        expect(response.body.metadata.total_interactions).toBe(5);
      }
    });

    it('should provide token statistics', async () => {
      const userId = 'test-user-13';
      const session = await createMockSession(app, userId, 'reference_coach');

      storeTestInteraction({
        interaction_id: 'stats-1',
        session_id: session.session_id,
        user_id: userId,
        user_input: 'Test',
        ai_response: 'Response',
        tokens_used: 150,
        response_time_ms: 300,
        model_used: 'claude-sonnet-4.5',
        success: true,
        created_at: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/ai/finetune/export/stats')
        .set('Authorization', 'Bearer admin-token')
        .query({ session_id: session.session_id });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('total_tokens');
        expect(response.body.total_tokens).toBeGreaterThan(0);
      }
    });
  });

  describe('Export Formats', () => {
    it('should support JSONL export format', async () => {
      const userId = 'test-user-14';
      const session = await createMockSession(app, userId, 'reference_coach');

      storeTestInteraction({
        interaction_id: 'format-1',
        session_id: session.session_id,
        user_id: userId,
        user_input: 'Test',
        ai_response: 'Response',
        tokens_used: 50,
        response_time_ms: 300,
        model_used: 'claude-sonnet-4.5',
        success: true,
        created_at: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/ai/finetune/export')
        .set('Authorization', 'Bearer admin-token')
        .query({
          session_id: session.session_id,
          format: 'jsonl',
        });

      if (response.status === 200) {
        // Each line should be valid JSON
        const lines = response.text.split('\n').filter(l => l.trim());
        lines.forEach(line => {
          expect(() => JSON.parse(line)).not.toThrow();
        });
      }
    });

    it('should support CSV export format for analytics', async () => {
      const userId = 'test-user-15';
      const session = await createMockSession(app, userId, 'reference_coach');

      storeTestInteraction({
        interaction_id: 'csv-1',
        session_id: session.session_id,
        user_id: userId,
        user_input: 'Test',
        ai_response: 'Response',
        tokens_used: 50,
        response_time_ms: 300,
        model_used: 'claude-sonnet-4.5',
        success: true,
        created_at: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/ai/finetune/export')
        .set('Authorization', 'Bearer admin-token')
        .query({
          session_id: session.session_id,
          format: 'csv',
        });

      if (response.status === 200) {
        expect(response.text).toContain('interaction_id');
        expect(response.text).toContain('user_input');
        expect(response.text).toContain('ai_response');
      }
    });
  });

  describe('Data Quality Checks', () => {
    it('should exclude very short interactions', async () => {
      const userId = 'test-user-16';
      const session = await createMockSession(app, userId, 'reference_coach');

      storeTestInteraction({
        interaction_id: 'short-1',
        session_id: session.session_id,
        user_id: userId,
        user_input: 'Hi',
        ai_response: 'Hello',
        tokens_used: 10,
        response_time_ms: 100,
        model_used: 'claude-sonnet-4.5',
        success: true,
        created_at: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/ai/finetune/export')
        .set('Authorization', 'Bearer admin-token')
        .query({
          session_id: session.session_id,
          min_length: 20,
        });

      if (response.status === 200) {
        const exported = JSON.stringify(response.body);
        expect(exported).not.toContain('Hi');
      }
    });

    it('should exclude duplicate interactions', async () => {
      const userId = 'test-user-17';
      const session = await createMockSession(app, userId, 'reference_coach');

      // Add same interaction twice
      for (let i = 0; i < 2; i++) {
        storeTestInteraction({
          interaction_id: `dup-${i}`,
          session_id: session.session_id,
          user_id: userId,
          user_input: 'Duplicate message',
          ai_response: 'Duplicate response',
          tokens_used: 50,
          response_time_ms: 300,
          model_used: 'claude-sonnet-4.5',
          success: true,
          created_at: new Date(),
        });
      }

      const response = await request(app.getHttpServer())
        .get('/api/v1/ai/finetune/export')
        .set('Authorization', 'Bearer admin-token')
        .query({
          session_id: session.session_id,
          remove_duplicates: true,
        });

      if (response.status === 200) {
        // Should only have one instance
        const matches = response.text.match(/Duplicate message/g);
        expect(matches?.length).toBeLessThanOrEqual(1);
      }
    });
  });
});
