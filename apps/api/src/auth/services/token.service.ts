/**
 * Token Service
 *
 * Manages refresh tokens, session tracking, and token revocation
 * Features:
 * - Refresh token creation and validation
 * - Session management across devices
 * - Token revocation (single and bulk)
 * - Automatic cleanup of expired tokens
 */

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { User } from '../../database/entities';

export interface TokenPayload {
  sub: string;
  email: string;
  type: 'access' | 'refresh';
  sessionId: string;
  role?: string;
  mfaEnabled?: boolean;
  mfa_verified?: boolean;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
  ) {}

  /**
   * Create and store a new refresh token
   */
  async createRefreshToken(
    user: User,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    // Generate refresh token JWT
    const sessionId = crypto.randomBytes(16).toString('hex');
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      type: 'refresh',
      sessionId,
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: '7d', // 7 days
    });

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Extract device name from user agent
    const deviceName = this.extractDeviceName(userAgent);

    // Store refresh token in database
    const refreshToken = this.refreshTokenRepository.create({
      token,
      userId: user.id,
      expiresAt,
      ipAddress,
      userAgent,
      deviceName,
      lastUsedAt: new Date(),
    });

    await this.refreshTokenRepository.save(refreshToken);

    this.logger.log(`Created refresh token for user ${user.email} from ${deviceName || 'unknown device'}`);

    return token;
  }

  /**
   * Validate refresh token and return user ID
   */
  async validateRefreshToken(token: string): Promise<{ userId: string; payload: TokenPayload }> {
    try {
      // Verify JWT signature and expiration
      const payload = this.jwtService.verify(token) as TokenPayload;

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Check if token exists and is not revoked
      const refreshToken = await this.refreshTokenRepository.findOne({
        where: { token },
      });

      if (!refreshToken) {
        throw new UnauthorizedException('Token not found');
      }

      if (refreshToken.isRevoked) {
        this.logger.warn(`Attempt to use revoked token for user ${payload.sub}`);
        throw new UnauthorizedException('Token has been revoked');
      }

      if (refreshToken.expiresAt < new Date()) {
        this.logger.warn(`Attempt to use expired token for user ${payload.sub}`);
        throw new UnauthorizedException('Token has expired');
      }

      // Update last used timestamp
      refreshToken.lastUsedAt = new Date();
      await this.refreshTokenRepository.save(refreshToken);

      return {
        userId: payload.sub,
        payload,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Token validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Revoke a specific refresh token
   */
  async revokeToken(token: string): Promise<boolean> {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token },
    });

    if (!refreshToken) {
      return false;
    }

    refreshToken.isRevoked = true;
    refreshToken.revokedAt = new Date();
    await this.refreshTokenRepository.save(refreshToken);

    this.logger.log(`Revoked token for user ${refreshToken.userId}`);
    return true;
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<number> {
    const result = await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() },
    );

    const count = result.affected || 0;
    this.logger.log(`Revoked ${count} tokens for user ${userId}`);
    return count;
  }

  /**
   * Revoke all tokens except the current one
   */
  async revokeAllExceptCurrent(userId: string, currentToken: string): Promise<number> {
    const tokens = await this.refreshTokenRepository.find({
      where: { userId, isRevoked: false },
    });

    const tokensToRevoke = tokens.filter((t) => t.token !== currentToken);

    for (const token of tokensToRevoke) {
      token.isRevoked = true;
      token.revokedAt = new Date();
    }

    await this.refreshTokenRepository.save(tokensToRevoke);

    this.logger.log(`Revoked ${tokensToRevoke.length} tokens for user ${userId} (kept current)`);
    return tokensToRevoke.length;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<RefreshToken[]> {
    return this.refreshTokenRepository.find({
      where: { userId, isRevoked: false },
      order: { lastUsedAt: 'DESC' },
    });
  }

  /**
   * Clean up expired tokens (scheduled task)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    const count = result.affected || 0;
    if (count > 0) {
      this.logger.log(`Cleaned up ${count} expired tokens`);
    }
    return count;
  }

  /**
   * Extract device name from user agent
   */
  private extractDeviceName(userAgent?: string): string {
    if (!userAgent) {
      return 'Unknown Device';
    }

    // Simple device detection
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Macintosh')) return 'Mac';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Linux')) return 'Linux';

    return 'Unknown Device';
  }

  /**
   * Get token statistics for a user
   */
  async getTokenStats(userId: string): Promise<{
    total: number;
    active: number;
    revoked: number;
  }> {
    const [total, active, revoked] = await Promise.all([
      this.refreshTokenRepository.count({ where: { userId } }),
      this.refreshTokenRepository.count({ where: { userId, isRevoked: false } }),
      this.refreshTokenRepository.count({ where: { userId, isRevoked: true } }),
    ]);

    return { total, active, revoked };
  }
}
