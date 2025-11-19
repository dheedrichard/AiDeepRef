import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SentryService } from '../sentry.service';

export interface RequestUser {
  id: string;
  email?: string;
  username?: string;
  role?: string;
  kycStatus?: string;
  mfaEnabled?: boolean;
}

@Injectable()
export class UserContextInterceptor implements NestInterceptor {
  constructor(private readonly sentryService: SentryService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;

    // Set user context if authenticated
    if (user) {
      this.sentryService.setUser({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      });

      // Add custom tags for user attributes
      if (user.role) {
        this.sentryService.setTag('user.role', user.role);
      }

      if (user.kycStatus) {
        this.sentryService.setTag('user.kyc_status', user.kycStatus);
      }

      if (user.mfaEnabled !== undefined) {
        this.sentryService.setTag('user.mfa_enabled', user.mfaEnabled.toString());
      }

      // Add breadcrumb for authenticated request
      this.sentryService.addBreadcrumb({
        message: `Authenticated request from user ${user.id}`,
        category: 'auth',
        level: 'info',
        data: {
          userId: user.id,
          role: user.role,
        },
      });
    }

    return next.handle().pipe(
      tap(() => {
        // Clear user context after request
        // This ensures context doesn't leak between requests
        this.sentryService.setUser(null);
      })
    );
  }
}
