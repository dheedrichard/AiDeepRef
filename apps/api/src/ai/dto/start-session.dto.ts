import { IsString, IsIn, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartSessionDto {
  @ApiProperty({
    description: 'Type of AI session to start',
    enum: ['reference_coach', 'verification', 'authenticity', 'intelligence'],
    example: 'reference_coach',
  })
  @IsString()
  @IsIn(['reference_coach', 'verification', 'authenticity', 'intelligence'])
  session_type: string;

  @ApiProperty({
    description: 'Optional metadata for the session',
    required: false,
    example: { context: 'job_application', role: 'software_engineer' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
