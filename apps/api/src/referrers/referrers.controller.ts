import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ReferrersService } from './referrers.service';

@ApiTags('referrers')
@Controller('referrers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReferrersController {
  constructor(private readonly referrersService: ReferrersService) {}

  // TODO: Add referrer-specific endpoints
  // - Get referrer profile
  // - Get pending reference requests
  // - Update notification preferences
}
