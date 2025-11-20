/**
 * AUTH MODULE UPDATES
 * Update /home/user/AiDeepRef/apps/api/src/auth/auth.module.ts with these changes
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { MfaAuthController } from './controllers/mfa-auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { DatabaseModule } from '../database/database.module';
import { MfaModule } from '../mfa/mfa.module';

// NEW IMPORTS
import { TokenService } from './services/token.service';
import { PasswordService } from './services/password.service';
import { RefreshToken } from '../database/entities/refresh-token.entity';
import { User } from '../database/entities';

@Module({
  imports: [
    DatabaseModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET', 'your-secret-key'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION', '7d'),
        },
      }),
    }),
    MfaModule,
    // NEW: Add TypeORM entities
    TypeOrmModule.forFeature([User, RefreshToken]),
  ],
  controllers: [AuthController, MfaAuthController],
  providers: [
    AuthService,
    JwtStrategy,
    // NEW: Add new services
    TokenService,
    PasswordService,
  ],
  exports: [
    AuthService,
    // NEW: Export services for use in other modules
    TokenService,
    PasswordService,
  ],
})
export class AuthModule {}
