import { IsString, IsUUID, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class BulkOperationDto {
  @ApiProperty({
    description: 'Type of operation',
    example: 'analyze_reference',
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Operation data',
    example: { text: 'John is an excellent developer' },
  })
  data: any;

  @ApiProperty({
    description: 'Optional reference ID for tracking',
    required: false,
    example: 'ref-001',
  })
  @IsOptional()
  @IsString()
  reference_id?: string;
}

export class BulkBatchDto {
  @ApiProperty({
    description: 'Agent ID for the session',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsUUID()
  agent_id: string;

  @ApiProperty({
    description: 'Array of operations to process',
    type: [BulkOperationDto],
    example: [
      {
        type: 'analyze_reference',
        data: { text: 'John is excellent' },
        reference_id: 'ref-001',
      },
      {
        type: 'analyze_reference',
        data: { text: 'Sarah is outstanding' },
        reference_id: 'ref-002',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkOperationDto)
  operations: BulkOperationDto[];
}
