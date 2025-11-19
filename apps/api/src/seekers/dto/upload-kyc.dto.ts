import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DocumentType } from '../../database/entities/kyc-document.entity';

export class UploadKycDto {
  @ApiProperty({ enum: DocumentType, example: DocumentType.PASSPORT })
  @IsEnum(DocumentType)
  @IsNotEmpty()
  documentType: DocumentType;

  // Note: File uploads will be handled by multer middleware
  // These properties are for documentation purposes
  @ApiProperty({ type: 'string', format: 'binary' })
  frontImage: unknown;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  backImage?: unknown;
}
