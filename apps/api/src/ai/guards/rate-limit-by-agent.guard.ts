import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';

/**
 * In-memory rate limiter for agent sessions
 * In production, this should use Redis
 */
@Injectable()
export class RateLimitByAgentGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitByAgentGuard.name);
  private readonly rateLimitStore = new Map<string, { count: number; resetTime: number }>();
  private readonly MAX_REQUESTS = 10; // 10 messages per minute per agent
  private readonly WINDOW_MS = 60 * 1000; // 1 minute

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Get agent_id from body or params
    const agentId = request.body?.agent_id || request.params?.agentId;

    if (!agentId) {
      // If no agent_id, let it pass (will be caught by AgentSessionGuard)
      return true;
    }

    const now = Date.now();
    const key = `rate:${agentId}`;

    // Get or create rate limit entry
    let entry = this.rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired one
      entry = {
        count: 0,
        resetTime: now + this.WINDOW_MS,
      };
      this.rateLimitStore.set(key, entry);
    }

    // Check if limit exceeded
    if (entry.count >= this.MAX_REQUESTS) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

      this.logger.warn(
        `Rate limit exceeded for agent ${agentId}: ${entry.count} requests`,
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded',
          error: 'Too Many Requests',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment counter
    entry.count++;

    // Cleanup old entries (run occasionally)
    if (Math.random() < 0.01) {
      this.cleanup();
    }

    return true;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitStore.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired rate limit entries`);
    }
  }

  /**
   * Reset rate limit for an agent (for testing)
   */
  resetAgentLimit(agentId: string): void {
    const key = `rate:${agentId}`;
    this.rateLimitStore.delete(key);
  }

  /**
   * Get current rate limit status for an agent
   */
  getStatus(agentId: string): { count: number; limit: number; resetTime: number } | null {
    const key = `rate:${agentId}`;
    const entry = this.rateLimitStore.get(key);

    if (!entry) {
      return null;
    }

    return {
      count: entry.count,
      limit: this.MAX_REQUESTS,
      resetTime: entry.resetTime,
    };
  }
}
