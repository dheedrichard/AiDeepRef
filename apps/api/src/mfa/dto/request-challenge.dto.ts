import { IsEnum, IsUUID } from 'class-validator';
import { ChallengeType } from '../entities/mfa-challenge.entity';

export class RequestChallengeDto {
  @IsUUID()
  userId: string;

  @IsEnum(ChallengeType)
  type: ChallengeType;
}

export class RequestChallengeResponseDto {
  challengeId: string;
  expiresAt: Date;
  method: ChallengeType;
  message?: string;
}
