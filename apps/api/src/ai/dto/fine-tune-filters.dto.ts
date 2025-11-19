import { IsString, IsOptional, IsDate, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FineTuneFiltersDto {
  @ApiProperty({
    description: 'Filter by session type',
    required: false,
    example: 'reference_coach',
  })
  @IsOptional()
  @IsString()
  sessionType?: string;

  @ApiProperty({
    description: 'Start date for filtering interactions',
    required: false,
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiProperty({
    description: 'End date for filtering interactions',
    required: false,
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiProperty({
    description: 'Minimum tokens per interaction',
    required: false,
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  minTokens?: number;

  @ApiProperty({
    description: 'Exclude flagged interactions',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  excludeFlagged?: boolean;
}
