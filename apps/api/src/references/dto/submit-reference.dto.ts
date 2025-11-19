import { IsEnum, IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReferenceFormat } from '../../database/entities';

export class SubmitReferenceDto {
  @ApiProperty({ enum: ReferenceFormat, example: ReferenceFormat.VIDEO })
  @IsEnum(ReferenceFormat)
  format: ReferenceFormat;

  @ApiProperty({
    description: 'Content can be a URL or text',
    example: 'https://storage.example.com/video.mp4',
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];
}
