import { Module } from '@nestjs/common';
import { ReferrersController } from './referrers.controller';
import { ReferrersService } from './referrers.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ReferrersController],
  providers: [ReferrersService],
})
export class ReferrersModule {}
