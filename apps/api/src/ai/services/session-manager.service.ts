import { Injectable, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AISession } from '../entities/ai-session.entity';
import { PromptManagerService } from './prompt-manager.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';

export interface StartSessionDto {
  userId: string;
  sessionType: string;
  metadata?: Record<string, any>;
}

export interface SessionResponse {
  agent_id: string;
  session_id: string;
}

@Injectable()
export class SessionManagerService {
  private readonly logger = new Logger(SessionManagerService.name);
  private readonly DEFAULT_SESSION_HOURS = 24;

  constructor(
    @InjectRepository(AISession)
    private sessionRepository: Repository<AISession>,
    private promptManager: PromptManagerService,
  ) {}

  /**
   * Create new AI session
   */
  async startSession(dto: StartSessionDto): Promise<SessionResponse> {
    // Get active prompt for this session type
    const prompt = await this.promptManager.getPromptForSessionType(dto.sessionType);

    // Generate unique agent_id (public-facing identifier)
    const agentId = uuidv4();

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.DEFAULT_SESSION_HOURS);

    const session = this.sessionRepository.create({
      agent_id: agentId,
      user_id: dto.userId,
      session_type: dto.sessionType,
      prompt_id: prompt.id,
      metadata: dto.metadata || {},
      status: 'active',
      expires_at: expiresAt,
      interaction_count: 0,
      total_tokens_used: 0,
    });

    await this.sessionRepository.save(session);

    this.logger.log(
      `Started new ${dto.sessionType} session for user ${dto.userId}: ${agentId}`,
    );

    return {
      agent_id: agentId,
      session_id: session.id,
    };
  }

  /**
   * End session and cleanup
   */
  async endSession(agentId: string): Promise<{ success: boolean; duration_minutes: number }> {
    const session = await this.sessionRepository.findOne({
      where: { agent_id: agentId },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${agentId}`);
    }

    const endedAt = new Date();
    const durationMinutes = Math.floor(
      (endedAt.getTime() - session.created_at.getTime()) / 1000 / 60,
    );

    session.status = 'ended';
    session.ended_at = endedAt;

    await this.sessionRepository.save(session);

    this.logger.log(
      `Ended session ${agentId} after ${durationMinutes} minutes`,
    );

    return {
      success: true,
      duration_minutes: durationMinutes,
    };
  }

  /**
   * Get session by agent_id and validate ownership
   */
  async getSessionByAgentId(agentId: string, userId: string): Promise<AISession> {
    const session = await this.sessionRepository.findOne({
      where: { agent_id: agentId },
      relations: ['prompt'],
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${agentId}`);
    }

    // Validate ownership
    if (session.user_id !== userId) {
      this.logger.warn(
        `Unauthorized access attempt to session ${agentId} by user ${userId}`,
      );
      throw new UnauthorizedException('Invalid agent session');
    }

    // Check if session is expired
    if (this.isExpired(session)) {
      throw new UnauthorizedException('Session expired');
    }

    // Check if session is active
    if (session.status !== 'active') {
      throw new UnauthorizedException(`Session is ${session.status}`);
    }

    return session;
  }

  /**
   * Get session by agent_id without user validation (internal use only)
   */
  async getSessionByAgentIdInternal(agentId: string): Promise<AISession> {
    const session = await this.sessionRepository.findOne({
      where: { agent_id: agentId },
      relations: ['prompt'],
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${agentId}`);
    }

    return session;
  }

  /**
   * Update session statistics
   */
  async updateSessionStats(
    sessionId: string,
    tokensUsed: number,
  ): Promise<void> {
    await this.sessionRepository.increment(
      { id: sessionId },
      'interaction_count',
      1,
    );
    await this.sessionRepository.increment(
      { id: sessionId },
      'total_tokens_used',
      tokensUsed,
    );
  }

  /**
   * Get user's active sessions
   */
  async getUserActiveSessions(userId: string): Promise<AISession[]> {
    return this.sessionRepository.find({
      where: {
        user_id: userId,
        status: 'active',
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  /**
   * Check if session is expired
   */
  isExpired(session: AISession): boolean {
    return new Date() > session.expires_at;
  }

  /**
   * Cleanup expired sessions (Cron job - runs every hour)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();

    const result = await this.sessionRepository.update(
      {
        status: 'active',
        expires_at: LessThan(now),
      },
      {
        status: 'expired',
        ended_at: now,
      },
    );

    if (result.affected && result.affected > 0) {
      this.logger.log(
        `Cleaned up ${result.affected} expired sessions`,
      );
    }
  }

  /**
   * Extend session expiration
   */
  async extendSession(agentId: string, hours: number = 24): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { agent_id: agentId },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${agentId}`);
    }

    const newExpiresAt = new Date(session.expires_at);
    newExpiresAt.setHours(newExpiresAt.getHours() + hours);

    session.expires_at = newExpiresAt;
    await this.sessionRepository.save(session);

    this.logger.log(`Extended session ${agentId} by ${hours} hours`);
  }
}
