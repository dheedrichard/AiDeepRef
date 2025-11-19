/**
 * CSRF Guard
 *
 * Protects against Cross-Site Request Forgery attacks
 * Features:
 * - Double-submit cookie pattern
 * - Token validation for state-changing operations
 * - Exempt safe methods (GET, HEAD, OPTIONS)
 */

import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as crypto from 'crypto';

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);
  private readonly CSRF_HEADER = 'x-csrf-token';
  private readonly CSRF_COOKIE = 'csrf-token';
  private readonly SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Check if CSRF protection should be skipped
    const skipCsrf = this.reflector.getAllAndOverride<boolean>('skipCsrf', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCsrf) {
      return true;
    }

    // Skip CSRF check for safe methods
    if (this.SAFE_METHODS.includes(request.method)) {
      // Generate and set CSRF token for subsequent requests
      this.generateCsrfToken(request, response);
      return true;
    }

    // Validate CSRF token for state-changing operations
    return this.validateCsrfToken(request);
  }

  private generateCsrfToken(request: any, response: any): void {
    // Check if token already exists in session
    let token = request.session?.csrfToken;

    if (!token) {
      // Generate new token
      token = crypto.randomBytes(32).toString('hex');

      // Store in session
      if (request.session) {
        request.session.csrfToken = token;
      }

      // Set cookie (httpOnly: false so JavaScript can read it)
      response.cookie(this.CSRF_COOKIE, token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000, // 1 hour
      });

      // Also set as response header for SPA frameworks
      response.setHeader('X-CSRF-Token', token);

      this.logger.debug(`Generated new CSRF token for ${request.ip}`);
    }

    // Add token to request for downstream use
    request.csrfToken = token;
  }

  private validateCsrfToken(request: any): boolean {
    // Get token from header
    const headerToken = request.headers[this.CSRF_HEADER] || request.headers['x-xsrf-token'];

    // Get token from cookie
    const cookieToken = request.cookies?.[this.CSRF_COOKIE];

    // Get token from body (for form submissions)
    const bodyToken = request.body?._csrf || request.body?.csrfToken;

    // Get token from query (not recommended but supported)
    const queryToken = request.query?._csrf;

    // Get session token
    const sessionToken = request.session?.csrfToken;

    // Determine which token to validate
    const providedToken = headerToken || bodyToken || queryToken;

    if (!providedToken) {
      this.logger.warn(`CSRF token missing for ${request.method} ${request.url} from ${request.ip}`);
      throw new ForbiddenException('CSRF token missing');
    }

    // Validate against session token (primary validation)
    if (sessionToken && providedToken === sessionToken) {
      this.logger.debug(`CSRF token validated (session) for ${request.method} ${request.url}`);
      return true;
    }

    // Validate against cookie token (double-submit pattern)
    if (cookieToken && providedToken === cookieToken) {
      this.logger.debug(`CSRF token validated (cookie) for ${request.method} ${request.url}`);
      return true;
    }

    // Log potential CSRF attack
    this.logger.error(`Invalid CSRF token for ${request.method} ${request.url} from ${request.ip}`);
    this.logger.debug(`Provided: ${providedToken?.substring(0, 10)}..., Session: ${sessionToken?.substring(0, 10)}..., Cookie: ${cookieToken?.substring(0, 10)}...`);

    // Check if this might be a targeted attack
    if (request.user) {
      this.logger.error(`Potential CSRF attack against user ${request.user.email} from IP ${request.ip}`);
    }

    throw new ForbiddenException('Invalid CSRF token');
  }
}

/**
 * Decorator to skip CSRF protection for specific endpoints
 */
export const SkipCsrf = () => (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
  if (descriptor) {
    Reflect.defineMetadata('skipCsrf', true, descriptor.value);
  } else {
    Reflect.defineMetadata('skipCsrf', true, target);
  }
};