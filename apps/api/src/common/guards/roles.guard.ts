import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../database/entities';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No roles required for this route
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // No user found (should not happen if JWT guard is properly configured)
    if (!user) {
      this.logger.error('RolesGuard called without authenticated user');
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has required role
    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      const method = request.method;
      const url = request.url;
      const userRole = user.role;
      const userEmail = user.email;

      this.logger.warn(
        `Access denied for user ${userEmail} (role: ${userRole}) to ${method} ${url}. Required roles: ${requiredRoles.join(', ')}`
      );

      // Log potential privilege escalation attempts
      if (requiredRoles.includes(UserRole.ADMIN) && userRole !== UserRole.ADMIN) {
        this.logger.error(`Potential privilege escalation attempt by ${userEmail} to admin endpoint ${url}`);
      }

      throw new ForbiddenException(
        `Access denied. Required role(s): ${requiredRoles.join(', ')}. Your role: ${userRole}`
      );
    }

    // Log successful role-based access for admin endpoints
    if (requiredRoles.includes(UserRole.ADMIN)) {
      this.logger.log(`Admin access granted to ${user.email} for ${request.method} ${request.url}`);
    }

    return true;
  }
}
