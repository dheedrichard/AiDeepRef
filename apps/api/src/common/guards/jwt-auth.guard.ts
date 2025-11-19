import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;

    // Log authentication attempt
    this.logger.debug(`Authentication check for ${method} ${url}`);

    // Call parent canActivate
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    // Log authentication failures
    if (err || !user) {
      const method = request.method;
      const url = request.url;
      const ip = request.ip;

      this.logger.warn(`Authentication failed for ${method} ${url} from IP: ${ip}`);

      if (info) {
        this.logger.debug(`Auth failure reason: ${info.message || info}`);
      }

      throw err || new UnauthorizedException('Authentication required');
    }

    // Add authentication metadata to request
    request.authTime = new Date();
    request.authMethod = 'jwt';

    return user;
  }
}
