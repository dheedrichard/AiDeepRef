import { IsString, IsArray, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBundleDto {
  @ApiProperty({ example: 'My Reference Bundle' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Collection of my professional references' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: ['ref-id-1', 'ref-id-2'] })
  @IsArray()
  @IsString({ each: true })
  referenceIds: string[];

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59Z' })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiPropertyOptional({ example: 'secure123' })
  @IsString()
  @IsOptional()
  password?: string;
}
