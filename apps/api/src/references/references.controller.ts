import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReferencesService } from './references.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SubmitReferenceDto } from './dto/submit-reference.dto';

@ApiTags('references')
@Controller('references')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReferencesController {
  constructor(private readonly referencesService: ReferencesService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get reference details' })
  @ApiResponse({ status: 200, description: 'Reference retrieved successfully' })
  getReference(@Param('id') id: string) {
    return this.referencesService.getReference(id);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit reference response' })
  @ApiResponse({ status: 201, description: 'Reference submitted successfully' })
  submitReference(@Param('id') id: string, @Body() dto: SubmitReferenceDto) {
    return this.referencesService.submitReference(id, dto);
  }
}
