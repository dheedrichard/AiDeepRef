import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EndSessionDto {
  @ApiProperty({
    description: 'Agent ID of the session to end',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsUUID()
  agent_id: string;
}
