import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { MfaSettings, MfaChallenge, TrustedDevice } from './entities';
import { MfaService, TrustedDeviceService, EmailMfaService } from './services';
import { MfaController } from './controllers/mfa.controller';
import { MfaVerifiedGuard, MfaRateLimitGuard } from './guards';
import { User } from '../database/entities/user.entity';
import { EmailService } from '../common/services/email.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MfaSettings,
      MfaChallenge,
      TrustedDevice,
      User,
    ]),
    ThrottlerModule.forRoot([{
      ttl: 900000, // 15 minutes
      limit: 5, // 5 requests
    }]),
  ],
  controllers: [MfaController],
  providers: [
    MfaService,
    TrustedDeviceService,
    EmailMfaService,
    MfaVerifiedGuard,
    MfaRateLimitGuard,
    EmailService,
  ],
  exports: [
    MfaService,
    TrustedDeviceService,
    EmailMfaService,
    MfaVerifiedGuard,
    MfaRateLimitGuard,
  ],
})
export class MfaModule {}
