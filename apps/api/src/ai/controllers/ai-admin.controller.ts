import { Controller, Post, Get, Put, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PromptManagerService } from '../services/prompt-manager.service';
import { InteractionLoggerService } from '../services/interaction-logger.service';
import { CreatePromptDto, UpdatePromptDto, FineTuneFiltersDto } from '../dto';

@ApiTags('ai/admin')
@Controller('api/v1/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AiAdminController {
  constructor(
    private promptManager: PromptManagerService,
    private interactionLogger: InteractionLoggerService,
  ) {}

  @Get('prompts')
  @Roles('admin')
  @ApiOperation({ summary: 'List all prompts (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Prompts retrieved (system prompts are encrypted)',
  })
  async listPrompts(@Query('sessionType') sessionType?: string) {
    return this.promptManager.listPrompts(sessionType);
  }

  @Post('prompts')
  @Roles('admin')
  @ApiOperation({ summary: 'Create new prompt (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Prompt created successfully',
  })
  async createPrompt(@Body() dto: CreatePromptDto) {
    return this.promptManager.createPrompt(dto);
  }

  @Put('prompts/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update prompt (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Prompt updated successfully',
  })
  async updatePrompt(@Param('id') id: string, @Body() dto: UpdatePromptDto) {
    return this.promptManager.updatePrompt(id, dto);
  }

  @Get('analytics/usage')
  @Roles('admin')
  @ApiOperation({ summary: 'Get usage analytics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Usage analytics retrieved',
  })
  async getUsageAnalytics(@Query('sessionId') sessionId: string) {
    return this.interactionLogger.getInteractionStats(sessionId);
  }

  @Post('finetune/export')
  @Roles('admin')
  @ApiOperation({ summary: 'Export interactions for fine-tuning (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Fine-tune export created',
  })
  async exportForFineTuning(@Body() dto: FineTuneFiltersDto, @Req() req) {
    const userId = req.user.id;

    return this.interactionLogger.exportForFineTuning(
      {
        sessionType: dto.sessionType,
        startDate: dto.startDate,
        endDate: dto.endDate,
        minTokens: dto.minTokens,
        excludeFlagged: dto.excludeFlagged,
      },
      userId,
    );
  }
}
