import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AgentSessionGuard } from '../guards/agent-session.guard';
import { BulkProcessorService } from '../services/bulk-processor.service';
import { BulkBatchDto } from '../dto';

@ApiTags('ai/batch')
@Controller('api/v1/ai/batch')
@UseGuards(JwtAuthGuard, AgentSessionGuard)
@ApiBearerAuth()
export class AiBatchController {
  constructor(private bulkProcessor: BulkProcessorService) {}

  @Post()
  @ApiOperation({ summary: 'Process batch operations with prompt caching' })
  @ApiResponse({
    status: 200,
    description: 'Batch processed successfully',
    schema: {
      example: {
        results: [
          {
            reference_id: 'ref-001',
            success: true,
            response: 'Analysis result...',
          },
          {
            reference_id: 'ref-002',
            success: true,
            response: 'Analysis result...',
          },
        ],
        total_tokens: 450,
        total_latency_ms: 2500,
        cache_hits: 1,
      },
    },
  })
  async processBatch(@Body() dto: BulkBatchDto, @Req() req) {
    const userId = req.user.id;

    return this.bulkProcessor.processBatch(
      dto.agent_id,
      userId,
      dto.operations,
    );
  }
}
