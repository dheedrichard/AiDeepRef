import { IsString, IsOptional, IsObject, IsBoolean, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePromptDto {
  @ApiProperty({
    description: 'Updated system prompt',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  system_prompt?: string;

  @ApiProperty({
    description: 'Updated model preference',
    required: false,
  })
  @IsOptional()
  @IsString()
  model_preference?: string;

  @ApiProperty({
    description: 'Updated model configuration',
    required: false,
  })
  @IsOptional()
  @IsObject()
  model_config?: Record<string, any>;

  @ApiProperty({
    description: 'Whether this prompt is active',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({
    description: 'Admin notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
