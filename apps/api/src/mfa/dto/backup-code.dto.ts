import { IsString, Length } from 'class-validator';

export class UseBackupCodeDto {
  @IsString()
  @Length(8, 8)
  code: string;
}

export class GenerateBackupCodesResponseDto {
  backupCodes: string[];
  message: string;
}
