import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SessionManagerService } from '../services/session-manager.service';
import { StartSessionDto, EndSessionDto } from '../dto';

@ApiTags('ai/sessions')
@Controller('api/v1/ai/sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiSessionsController {
  constructor(private sessionManager: SessionManagerService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start new AI session' })
  @ApiResponse({
    status: 201,
    description: 'Session started successfully',
    schema: {
      example: {
        agent_id: '550e8400-e29b-41d4-a716-446655440000',
        session_id: '660e8400-e29b-41d4-a716-446655440001',
      },
    },
  })
  async startSession(@Body() dto: StartSessionDto, @Req() req) {
    const userId = req.user.id;

    return this.sessionManager.startSession({
      userId,
      sessionType: dto.session_type,
      metadata: dto.metadata,
    });
  }

  @Post('end')
  @ApiOperation({ summary: 'End AI session' })
  @ApiResponse({
    status: 200,
    description: 'Session ended successfully',
    schema: {
      example: {
        success: true,
        duration_minutes: 15,
      },
    },
  })
  async endSession(@Body() dto: EndSessionDto) {
    return this.sessionManager.endSession(dto.agent_id);
  }

  @Get(':agentId/history')
  @ApiOperation({ summary: 'Get session history (sanitized - no system prompts)' })
  @ApiResponse({
    status: 200,
    description: 'Session history retrieved',
    schema: {
      example: {
        messages: [
          {
            role: 'user',
            content: 'How should I structure my reference request?',
            timestamp: '2024-01-15T10:30:00Z',
          },
          {
            role: 'assistant',
            content: 'Here are some tips...',
            timestamp: '2024-01-15T10:30:02Z',
          },
        ],
      },
    },
  })
  async getHistory(@Param('agentId') agentId: string, @Req() req) {
    const userId = req.user.id;

    // Validate session ownership
    const session = await this.sessionManager.getSessionByAgentId(agentId, userId);

    // Import InteractionLoggerService to get history
    const { InteractionLoggerService } = await import('../services/interaction-logger.service');
    const interactionLogger = new InteractionLoggerService(
      null as any, // These would be injected in real usage
      null as any,
    );

    const messages = await interactionLogger.getHistory(session.id);

    return { messages };
  }

  @Get('active')
  @ApiOperation({ summary: 'Get user active sessions' })
  @ApiResponse({
    status: 200,
    description: 'Active sessions retrieved',
  })
  async getActiveSessions(@Req() req) {
    const userId = req.user.id;
    return this.sessionManager.getUserActiveSessions(userId);
  }
}
