import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Guard to check if user has completed MFA verification in current session
 * Use this guard on routes that require MFA to be verified
 */
@Injectable()
export class MfaVerifiedGuard implements CanActivate {
  private readonly logger = new Logger(MfaVerifiedGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Check if user has MFA enabled
    if (!user.mfaEnabled) {
      // MFA not enabled, allow access
      return true;
    }

    // Check if MFA was verified in JWT token
    if (!user.mfa_verified) {
      this.logger.warn(`MFA verification required for user ${user.sub}`);
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'MFA verification required',
        error: 'MFA_REQUIRED',
      });
    }

    return true;
  }
}
