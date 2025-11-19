import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { SeekersService } from './seekers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateReferenceRequestDto } from './dto/create-reference-request.dto';
import { UploadKycDto } from './dto/upload-kyc.dto';
import { UploadSelfieDto } from './dto/upload-selfie.dto';

@ApiTags('seekers')
@Controller('seekers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SeekersController {
  constructor(private readonly seekersService: SeekersService) {}

  @Get(':id/profile')
  @ApiOperation({ summary: 'Get seeker profile' })
  @ApiResponse({ status: 200, description: 'Seeker profile retrieved successfully' })
  getProfile(@Param('id') id: string) {
    return this.seekersService.getProfile(id);
  }

  @Post(':id/kyc/upload')
  @ApiOperation({ summary: 'Upload ID document' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'frontImage', maxCount: 1 },
      { name: 'backImage', maxCount: 1 },
    ]),
  )
  @ApiResponse({ status: 201, description: 'KYC document uploaded successfully' })
  uploadKyc(
    @Param('id') id: string,
    @Body() uploadKycDto: UploadKycDto,
    @UploadedFiles() files: { frontImage?: Express.Multer.File[]; backImage?: Express.Multer.File[] },
  ) {
    return this.seekersService.uploadKycDocument(id, uploadKycDto.documentType, files);
  }

  @Post(':id/kyc/selfie')
  @ApiOperation({ summary: 'Upload selfie for liveness check' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'selfieImage', maxCount: 1 }]))
  @ApiResponse({ status: 201, description: 'Selfie uploaded successfully' })
  uploadSelfie(
    @Param('id') id: string,
    @Body() uploadSelfieDto: UploadSelfieDto,
    @UploadedFiles() files: { selfieImage?: Express.Multer.File[] },
  ) {
    return this.seekersService.uploadSelfie(id, files);
  }

  @Get(':id/kyc/status')
  @ApiOperation({ summary: 'Get KYC verification status' })
  @ApiResponse({
    status: 200,
    description: 'KYC status retrieved successfully',
    schema: {
      properties: {
        kycStatus: { type: 'string', enum: ['pending', 'verified', 'failed'] },
      },
    },
  })
  getKycStatus(@Param('id') id: string) {
    return this.seekersService.getKycStatus(id);
  }

  @Post(':id/references/request')
  @ApiOperation({ summary: 'Create reference request' })
  @ApiResponse({ status: 201, description: 'Reference request created successfully' })
  createReferenceRequest(@Param('id') id: string, @Body() dto: CreateReferenceRequestDto) {
    return this.seekersService.createReferenceRequest(id, dto);
  }
}
