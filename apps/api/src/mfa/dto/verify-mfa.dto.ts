import { IsString, IsUUID, IsBoolean, IsOptional, Length, Matches } from 'class-validator';

export class VerifyMfaDto {
  @IsUUID()
  challengeId: string;

  @IsString()
  @Length(6, 8)
  @Matches(/^[0-9A-Za-z]{6,8}$/, { message: 'Invalid code format' })
  code: string;

  @IsBoolean()
  @IsOptional()
  trustDevice?: boolean = false;

  @IsString()
  @IsOptional()
  deviceName?: string;
}

export class VerifyMfaResponseDto {
  verified: boolean;
  accessToken?: string;
  refreshToken?: string;
  deviceTrusted?: boolean;
}
