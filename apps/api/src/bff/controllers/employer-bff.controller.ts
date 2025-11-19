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
import { EmployerAggregationService } from '../services/employer-aggregation.service';
import { EmployerDashboardResponseDto } from '../dto';

/**
 * Employer BFF Controller
 *
 * Provides aggregated endpoints for employer dashboard
 */
@ApiTags('bff')
@Controller('bff/employer')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmployerBffController {
  private readonly logger = new Logger(EmployerBffController.name);

  constructor(
    private readonly aggregationService: EmployerAggregationService,
  ) {}

  /**
   * Get complete employer dashboard data
   */
  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get complete employer dashboard data',
    description:
      'Returns all dashboard data in single response: stats, recently viewed, top candidates, and notifications',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
    type: EmployerDashboardResponseDto,
  })
  async getDashboard(@Req() req): Promise<EmployerDashboardResponseDto> {
    const userId = req.user.id;
    this.logger.log(`Fetching dashboard data for employer ${userId}`);

    const startTime = Date.now();
    const dashboard = await this.aggregationService.getDashboardData(userId);
    const executionTime = Date.now() - startTime;

    this.logger.log(
      `Employer dashboard data fetched in ${executionTime}ms`,
    );

    return dashboard;
  }
}
