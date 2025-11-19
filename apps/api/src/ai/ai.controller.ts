import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { VerifyAuthenticityDto } from './dto/verify-authenticity.dto';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';

@ApiTags('ai')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('verify-authenticity')
  @ApiOperation({ summary: 'Verify media authenticity' })
  @ApiResponse({ status: 200, description: 'Authenticity verification completed' })
  verifyAuthenticity(@Body() dto: VerifyAuthenticityDto) {
    return this.aiService.verifyAuthenticity(dto);
  }

  @Post('generate-questions')
  @ApiOperation({ summary: 'Generate contextual questions' })
  @ApiResponse({ status: 200, description: 'Questions generated successfully' })
  generateQuestions(@Body() dto: GenerateQuestionsDto) {
    return this.aiService.generateQuestions(dto);
  }
}
