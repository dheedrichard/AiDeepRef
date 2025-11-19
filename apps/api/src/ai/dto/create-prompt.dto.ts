import { IsString, IsOptional, IsObject, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePromptDto {
  @ApiProperty({
    description: 'Session type for this prompt',
    example: 'reference_coach',
  })
  @IsString()
  session_type: string;

  @ApiProperty({
    description: 'System prompt (will be encrypted)',
    example: 'You are a professional reference coach...',
  })
  @IsString()
  @MinLength(10)
  system_prompt: string;

  @ApiProperty({
    description: 'Preferred model for this prompt',
    required: false,
    example: 'claude-3-5-sonnet-20241022',
  })
  @IsOptional()
  @IsString()
  model_preference?: string;

  @ApiProperty({
    description: 'Model configuration (temperature, max_tokens, etc)',
    required: false,
    example: { temperature: 0.7, max_tokens: 2048 },
  })
  @IsOptional()
  @IsObject()
  model_config?: Record<string, any>;

  @ApiProperty({
    description: 'Admin notes about this prompt',
    required: false,
    example: 'Updated for better reference guidance',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
