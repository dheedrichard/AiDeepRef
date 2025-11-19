import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BundlesService } from './bundles.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateBundleDto } from './dto/create-bundle.dto';
import { User } from '../database/entities';

@ApiTags('bundles')
@Controller('bundles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BundlesController {
  constructor(private readonly bundlesService: BundlesService) {}

  @Post()
  @ApiOperation({ summary: 'Create reference bundle' })
  @ApiResponse({ status: 201, description: 'Bundle created successfully' })
  createBundle(@CurrentUser() user: User, @Body() dto: CreateBundleDto) {
    return this.bundlesService.createBundle(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bundle details' })
  @ApiResponse({ status: 200, description: 'Bundle retrieved successfully' })
  getBundle(@Param('id') id: string) {
    return this.bundlesService.getBundle(id);
  }
}
