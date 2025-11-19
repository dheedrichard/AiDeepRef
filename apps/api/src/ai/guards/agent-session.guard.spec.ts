import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AgentSessionGuard } from './agent-session.guard';
import { SessionManagerService } from '../services/session-manager.service';

describe('AgentSessionGuard', () => {
  let guard: AgentSessionGuard;
  let sessionManager: jest.Mocked<SessionManagerService>;

  beforeEach(async () => {
    const mockSessionManager = {
      getSessionByAgentId: jest.fn(),
      isExpired: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentSessionGuard,
        {
          provide: SessionManagerService,
          useValue: mockSessionManager,
        },
      ],
    }).compile();

    guard = module.get<AgentSessionGuard>(AgentSessionGuard);
    sessionManager = module.get(SessionManagerService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    const mockContext = (body: any, user: any) => ({
      switchToHttp: () => ({
        getRequest: () => ({ body, user }),
      }),
    }) as ExecutionContext;

    it('should allow valid session', async () => {
      const mockSession = {
        id: 'session-123',
        agent_id: 'agent-456',
        user_id: 'user-789',
        status: 'active',
      };

      sessionManager.getSessionByAgentId.mockResolvedValue(mockSession as any);
      sessionManager.isExpired.mockReturnValue(false);

      const context = mockContext(
        { agent_id: 'agent-456' },
        { id: 'user-789' },
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(sessionManager.getSessionByAgentId).toHaveBeenCalledWith(
        'agent-456',
        'user-789',
      );
    });

    it('should reject expired session', async () => {
      const mockSession = {
        id: 'session-123',
        status: 'active',
      };

      sessionManager.getSessionByAgentId.mockResolvedValue(mockSession as any);
      sessionManager.isExpired.mockReturnValue(true);

      const context = mockContext(
        { agent_id: 'agent-456' },
        { id: 'user-789' },
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject inactive session', async () => {
      const mockSession = {
        id: 'session-123',
        status: 'ended',
      };

      sessionManager.getSessionByAgentId.mockResolvedValue(mockSession as any);
      sessionManager.isExpired.mockReturnValue(false);

      const context = mockContext(
        { agent_id: 'agent-456' },
        { id: 'user-789' },
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject when agent_id is missing', async () => {
      const context = mockContext({}, { id: 'user-789' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject when user is not authenticated', async () => {
      const context = mockContext({ agent_id: 'agent-456' }, null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
