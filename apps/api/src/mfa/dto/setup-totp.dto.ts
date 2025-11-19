import { IsEnum, IsOptional } from 'class-validator';
import { MfaMethod } from '../entities/mfa-settings.entity';

export class SetupTotpDto {
  @IsEnum(MfaMethod)
  @IsOptional()
  method?: MfaMethod = MfaMethod.TOTP;
}

export class SetupTotpResponseDto {
  secret: string;
  qrCodeUrl: string;
  backupCodes?: string[];
}
