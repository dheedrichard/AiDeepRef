import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  sessionId?: string;
  iat?: number;
  exp?: number;
  type?: 'access' | 'refresh';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    // Ensure JWT secret is strong enough (at least 32 characters)
    if (jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    // Validate token type
    if (payload.type && payload.type !== 'access') {
      this.logger.warn(`Invalid token type used for authentication: ${payload.type}`);
      throw new UnauthorizedException('Invalid token type');
    }

    // Check token age (prevent token replay attacks)
    const tokenAge = Date.now() / 1000 - (payload.iat || 0);
    const maxTokenAge = 24 * 60 * 60; // 24 hours

    if (tokenAge > maxTokenAge) {
      this.logger.warn(`Token too old: ${tokenAge} seconds`);
      throw new UnauthorizedException('Token expired');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'role',
        'emailVerified',
        'kycCompleted',
        'isActive',
        'lastLoginAt',
        'failedLoginAttempts',
        'lockedUntil'
      ],
    });

    if (!user) {
      this.logger.warn(`User not found for JWT payload: ${payload.sub}`);
      throw new UnauthorizedException('User not found');
    }

    // Check if user account is active
    if (!user.isActive) {
      this.logger.warn(`Inactive user attempted access: ${user.email}`);
      throw new UnauthorizedException('Account is inactive');
    }

    // Check if user account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      this.logger.warn(`Locked user attempted access: ${user.email}`);
      throw new UnauthorizedException('Account is locked');
    }

    // Add request metadata for audit logging
    (req as any).user = user;
    (req as any).sessionId = payload.sessionId;

    return user;
  }
}
