import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { SessionManagerService } from '../services/session-manager.service';

@Injectable()
export class AgentSessionGuard implements CanActivate {
  private readonly logger = new Logger(AgentSessionGuard.name);

  constructor(private sessionManager: SessionManagerService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Get agent_id from body or params
    const agentId = request.body?.agent_id || request.params?.agentId;

    if (!agentId) {
      throw new UnauthorizedException('Agent ID is required');
    }

    // Get user from JWT (set by JwtAuthGuard)
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    try {
      // Verify agent_id belongs to this user
      const session = await this.sessionManager.getSessionByAgentId(agentId, userId);

      if (!session) {
        throw new UnauthorizedException('Invalid agent session');
      }

      // Check session not expired
      if (this.sessionManager.isExpired(session)) {
        throw new UnauthorizedException('Session expired');
      }

      // Check session is active
      if (session.status !== 'active') {
        throw new UnauthorizedException(`Session is ${session.status}`);
      }

      // Attach session to request for use in controller
      request.aiSession = session;

      return true;
    } catch (error) {
      this.logger.warn(
        `Session validation failed for agent ${agentId} and user ${userId}: ${error.message}`,
      );
      throw new UnauthorizedException('Invalid agent session');
    }
  }
}
