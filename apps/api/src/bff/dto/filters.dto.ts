import { IsOptional, IsString, IsNumber, IsEnum, IsArray, Min, Max, IsDate, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ReferenceFormat, ReferenceStatus } from '../../database/entities';

/**
 * Server-side library filters
 * All filtering logic executed on backend
 */
export class LibraryFiltersDto {
  @ApiProperty({ required: false, enum: ReferenceStatus, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(ReferenceStatus, { each: true })
  status?: ReferenceStatus[];

  @ApiProperty({ required: false, enum: ReferenceFormat, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(ReferenceFormat, { each: true })
  format?: ReferenceFormat[];

  @ApiProperty({ required: false, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  rcsScoreMin?: number;

  @ApiProperty({ required: false, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  rcsScoreMax?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateFrom?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateTo?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ required: false, default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({ required: false, enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiProperty({ required: false, default: 1, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

/**
 * Search filters with full-text search
 */
export class SearchFiltersDto extends LibraryFiltersDto {
  @ApiProperty({ required: true })
  @IsString()
  query: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  fuzzy?: boolean = false;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  minRelevance?: number = 0.3;
}

/**
 * Bundle filters
 */
export class BundleFiltersDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  createdAfter?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minReferences?: number;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}
