import { IsUrl, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum MediaType {
  VIDEO = 'video',
  AUDIO = 'audio',
}

export class VerifyAuthenticityDto {
  @ApiProperty({ example: 'https://storage.example.com/video.mp4' })
  @IsUrl()
  mediaUrl: string;

  @ApiProperty({ enum: MediaType, example: MediaType.VIDEO })
  @IsEnum(MediaType)
  mediaType: MediaType;
}
