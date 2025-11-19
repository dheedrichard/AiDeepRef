import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Sanitize input to prevent prompt injection
 */
function sanitizeInput(value: string): string {
  if (typeof value !== 'string') {
    return value;
  }

  return value
    .replace(/\{system\}/gi, '')
    .replace(/\{prompt\}/gi, '')
    .replace(/\{instruction\}/gi, '')
    .replace(/\{assistant\}/gi, '')
    .replace(/<\|system\|>/gi, '')
    .replace(/<\|im_start\|>/gi, '')
    .replace(/<\|im_end\|>/gi, '')
    .trim();
}

export class ChatMessageDto {
  @ApiProperty({
    description: 'Agent ID for the session',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsUUID()
  agent_id: string;

  @ApiProperty({
    description: 'User message to send to the AI',
    example: 'How should I structure my reference request?',
    minLength: 1,
    maxLength: 5000,
  })
  @IsString()
  @MinLength(1, { message: 'Message cannot be empty' })
  @MaxLength(5000, { message: 'Message too long (max 5000 characters)' })
  @Transform(({ value }) => sanitizeInput(value))
  message: string;
}
