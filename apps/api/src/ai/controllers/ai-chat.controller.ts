import { Controller, Post, Body, UseGuards, Req, Sse, MessageEvent } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AgentSessionGuard } from '../guards/agent-session.guard';
import { RateLimitByAgentGuard } from '../guards/rate-limit-by-agent.guard';
import { SecureAIChatService } from '../services/secure-ai-chat.service';
import { ChatMessageDto } from '../dto';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@ApiTags('ai/chat')
@Controller('api/v1/ai/chat')
@UseGuards(JwtAuthGuard, AgentSessionGuard, RateLimitByAgentGuard)
@ApiBearerAuth()
export class AiChatController {
  constructor(private secureAIChatService: SecureAIChatService) {}

  @Post()
  @ApiOperation({ summary: 'Send message to AI' })
  @ApiResponse({
    status: 200,
    description: 'AI response received',
    schema: {
      example: {
        message: 'Here are some tips for structuring your reference request...',
        interaction_id: '770e8400-e29b-41d4-a716-446655440002',
        tokens_used: 150,
        model_used: 'claude-3-5-sonnet-20241022',
      },
    },
  })
  async chat(@Body() dto: ChatMessageDto, @Req() req) {
    const userId = req.user.id;

    return this.secureAIChatService.chat(
      dto.agent_id,
      dto.message,
      userId,
    );
  }

  @Post('stream')
  @Sse()
  @ApiOperation({ summary: 'Stream AI response (Server-Sent Events)' })
  @ApiResponse({
    status: 200,
    description: 'AI response stream',
  })
  chatStream(@Body() dto: ChatMessageDto, @Req() req): Observable<MessageEvent> {
    const userId = req.user.id;

    return this.secureAIChatService.chatStream(
      dto.agent_id,
      dto.message,
      userId,
    ).pipe(
      map(chunk => ({
        data: chunk,
      })),
    );
  }
}
