import { IsString, IsOptional, IsUUID } from 'class-validator';

export class TrustDeviceDto {
  @IsString()
  @IsOptional()
  deviceName?: string;
}

export class TrustedDeviceResponseDto {
  id: string;
  deviceName: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  trustedAt: Date;
  expiresAt: Date;
  lastUsedAt: Date;
}

export class RevokeTrustedDeviceDto {
  @IsUUID()
  deviceId: string;
}
