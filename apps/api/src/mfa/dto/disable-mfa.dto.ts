import { IsString, MinLength } from 'class-validator';

export class DisableMfaDto {
  @IsString()
  @MinLength(8)
  password: string;
}

export class DisableMfaResponseDto {
  disabled: boolean;
  message: string;
}
