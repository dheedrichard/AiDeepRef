import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MagicLinkDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;
}
