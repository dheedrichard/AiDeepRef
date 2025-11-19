import {
  Controller,
  Get,
  Req,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ReferrerAggregationService } from '../services/referrer-aggregation.service';
import { ReferrerDashboardResponseDto } from '../dto';

/**
 * Referrer BFF Controller
 *
 * Provides aggregated endpoints for referrer dashboard
 */
@ApiTags('bff')
@Controller('bff/referrer')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReferrerBffController {
  private readonly logger = new Logger(ReferrerBffController.name);

  constructor(
    private readonly aggregationService: ReferrerAggregationService,
  ) {}

  /**
   * Get complete referrer dashboard data
   *
   * Single endpoint returns:
   * - Stats (total requests, pending, completed, avg completion time)
   * - Pending requests
   * - Completed references
   * - Notifications
   * - AI-powered insights
   */
  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get complete referrer dashboard data',
    description:
      'Returns all dashboard data in single response: stats, pending requests, completed references, notifications, and insights',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
    type: ReferrerDashboardResponseDto,
  })
  async getDashboard(@Req() req): Promise<ReferrerDashboardResponseDto> {
    const userId = req.user.id;
    this.logger.log(`Fetching dashboard data for referrer ${userId}`);

    const startTime = Date.now();
    const dashboard = await this.aggregationService.getDashboardData(userId);
    const executionTime = Date.now() - startTime;

    this.logger.log(
      `Referrer dashboard data fetched in ${executionTime}ms (replaced multiple API calls)`,
    );

    return dashboard;
  }
}
