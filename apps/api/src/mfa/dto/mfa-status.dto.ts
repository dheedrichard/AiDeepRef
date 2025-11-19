import { MfaMethod } from '../entities/mfa-settings.entity';

export class MfaStatusResponseDto {
  enabled: boolean;
  verified: boolean;
  method: MfaMethod | null;
  hasBackupCodes: boolean;
  trustedDevicesCount: number;
  phoneNumber?: string | null;
}
