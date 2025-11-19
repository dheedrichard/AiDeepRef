import { ApiProperty } from '@nestjs/swagger';

export class UploadSelfieDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  selfieImage: unknown;
}
