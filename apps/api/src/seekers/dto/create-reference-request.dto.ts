import { IsEmail, IsString, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReferenceFormat } from '../../database/entities';

export class CreateReferenceRequestDto {
  @ApiProperty({ example: 'Jane Smith' })
  @IsString()
  referrerName: string;

  @ApiProperty({ example: 'jane.smith@example.com' })
  @IsEmail()
  referrerEmail: string;

  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  company: string;

  @ApiProperty({ example: 'Senior Developer' })
  @IsString()
  role: string;

  @ApiProperty({ example: ['How was their performance?', 'Would you hire them again?'] })
  @IsArray()
  @IsString({ each: true })
  questions: string[];

  @ApiProperty({
    example: [ReferenceFormat.VIDEO, ReferenceFormat.AUDIO, ReferenceFormat.TEXT],
    enum: ReferenceFormat,
    isArray: true,
  })
  @IsArray()
  allowedFormats: ReferenceFormat[];

  @ApiProperty({ example: true })
  @IsBoolean()
  allowEmployerReachback: boolean;
}
