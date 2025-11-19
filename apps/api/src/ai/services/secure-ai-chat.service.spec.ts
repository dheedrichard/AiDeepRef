import { Test, TestingModule } from '@nestjs/testing';
import { SecureAIChatService } from './secure-ai-chat.service';
import { PromptManagerService } from './prompt-manager.service';
import { SessionManagerService } from './session-manager.service';
import { InteractionLoggerService } from './interaction-logger.service';
import { FallbackStrategy } from '../strategies/fallback.strategy';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';

describe('SecureAIChatService', () => {
  let service: SecureAIChatService;
  let promptManager: jest.Mocked<PromptManagerService>;
  let sessionManager: jest.Mocked<SessionManagerService>;
  let interactionLogger: jest.Mocked<InteractionLoggerService>;
  let fallbackStrategy: jest.Mocked<FallbackStrategy>;

  beforeEach(async () => {
    const mockPromptManager = {
      getPromptForSessionType: jest.fn(),
      getDecryptedPrompt: jest.fn(),
    };

    const mockSessionManager = {
      getSessionByAgentId: jest.fn(),
      updateSessionStats: jest.fn(),
    };

    const mockInteractionLogger = {
      logInteraction: jest.fn(),
      getHistory: jest.fn(),
    };

    const mockFallbackStrategy = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecureAIChatService,
        { provide: PromptManagerService, useValue: mockPromptManager },
        { provide: SessionManagerService, useValue: mockSessionManager },
        { provide: InteractionLoggerService, useValue: mockInteractionLogger },
        { provide: FallbackStrategy, useValue: mockFallbackStrategy },
      ],
    }).compile();

    service = module.get<SecureAIChatService>(SecureAIChatService);
    promptManager = module.get(PromptManagerService);
    sessionManager = module.get(SessionManagerService);
    interactionLogger = module.get(InteractionLoggerService);
    fallbackStrategy = module.get(FallbackStrategy);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('chat', () => {
    const agentId = 'agent-123';
    const userId = 'user-456';
    const userMessage = 'How should I structure my reference request?';

    const mockSession = {
      id: 'session-789',
      agent_id: agentId,
      user_id: userId,
      session_type: 'reference_coach',
      prompt_id: 'prompt-111',
      status: 'active',
    };

    const mockPrompt = {
      id: 'prompt-111',
      session_type: 'reference_coach',
      model_preference: 'claude-3-5-sonnet-20241022',
      model_config: {},
    };

    const systemPrompt = 'You are a professional reference coach...';
    const aiResponse = 'Here are some tips for structuring your request...';

    beforeEach(() => {
      sessionManager.getSessionByAgentId.mockResolvedValue(mockSession as any);
      promptManager.getPromptForSessionType.mockResolvedValue(mockPrompt as any);
      promptManager.getDecryptedPrompt.mockResolvedValue(systemPrompt);
      fallbackStrategy.execute.mockResolvedValue(aiResponse);
      interactionLogger.logInteraction.mockResolvedValue({ id: 'interaction-222' } as any);
      sessionManager.updateSessionStats.mockResolvedValue(undefined);
    });

    it('should successfully process chat request', async () => {
      const result = await service.chat(agentId, userMessage, userId);

      expect(result).toEqual({
        message: aiResponse,
        interaction_id: 'interaction-222',
        tokens_used: expect.any(Number),
        model_used: 'claude-3-5-sonnet-20241022',
      });
    });

    it('should never expose system prompt in response', async () => {
      const result = await service.chat(agentId, userMessage, userId);

      expect(result.message).not.toContain('system:');
      expect(result.message).not.toContain('You are a');
      expect(result.message).toBe(aiResponse);
    });

    it('should validate session ownership', async () => {
      sessionManager.getSessionByAgentId.mockRejectedValue(
        new UnauthorizedException('Invalid agent session'),
      );

      await expect(
        service.chat(agentId, userMessage, 'wrong-user-id'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should log all interactions', async () => {
      await service.chat(agentId, userMessage, userId);

      expect(interactionLogger.logInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: mockSession.id,
          prompt_id: mockPrompt.id,
          user_input: userMessage,
          ai_response: aiResponse,
          model_used: mockPrompt.model_preference,
        }),
      );
    });

    it('should update session statistics', async () => {
      await service.chat(agentId, userMessage, userId);

      expect(sessionManager.updateSessionStats).toHaveBeenCalledWith(
        mockSession.id,
        expect.any(Number),
      );
    });

    it('should handle LLM failures gracefully', async () => {
      fallbackStrategy.execute.mockRejectedValue(new Error('LLM unavailable'));

      await expect(
        service.chat(agentId, userMessage, userId),
      ).rejects.toThrow('LLM unavailable');
    });
  });

  describe('getHistory', () => {
    it('should return sanitized history without system prompts', async () => {
      const agentId = 'agent-123';
      const userId = 'user-456';

      const mockSession = {
        id: 'session-789',
        agent_id: agentId,
        user_id: userId,
      };

      const mockHistory = [
        { role: 'user', content: 'Hello', timestamp: new Date() },
        { role: 'assistant', content: 'Hi there!', timestamp: new Date() },
      ];

      sessionManager.getSessionByAgentId.mockResolvedValue(mockSession as any);
      interactionLogger.getHistory.mockResolvedValue(mockHistory);

      const result = await service.getHistory(agentId, userId);

      expect(result).toEqual(mockHistory);
      expect(result.every(msg => msg.role !== 'system')).toBe(true);
    });
  });
});
