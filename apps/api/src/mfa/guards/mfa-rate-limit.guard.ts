import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';

/**
 * Rate limiting guard for MFA endpoints
 * Limits MFA verification attempts to prevent brute force attacks
 */
@Injectable()
export class MfaRateLimitGuard extends ThrottlerGuard {
  private readonly logger = new Logger(MfaRateLimitGuard.name);

  constructor(reflector: Reflector) {
    super({
      ttl: 900000, // 15 minutes in milliseconds
      limit: 5, // 5 attempts per 15 minutes
    }, reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const result = await super.canActivate(context);
      return result as boolean;
    } catch (error) {
      const request = context.switchToHttp().getRequest();
      const user = request.user;

      this.logger.warn(
        `Rate limit exceeded for MFA verification: ${user?.sub || request.ip}`,
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many MFA verification attempts. Please try again later.',
          error: 'MFA_RATE_LIMIT_EXCEEDED',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
