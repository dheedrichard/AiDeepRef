import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeekerBffController } from './controllers/seeker-bff.controller';
import { ReferrerBffController } from './controllers/referrer-bff.controller';
import { EmployerBffController } from './controllers/employer-bff.controller';
import { SeekerAggregationService } from './services/seeker-aggregation.service';
import { ReferrerAggregationService } from './services/referrer-aggregation.service';
import { EmployerAggregationService } from './services/employer-aggregation.service';
import { Reference, User, Bundle } from '../database/entities';
import { ReferencesModule } from '../references/references.module';
import { BundlesModule } from '../bundles/bundles.module';
import { AiModule } from '../ai/ai.module';
import { CommonModule } from '../common/common.module';

/**
 * Backend-for-Frontend (BFF) Module
 *
 * Purpose: Aggregate multiple API calls into single endpoints,
 * reducing client-side orchestration and network overhead.
 *
 * Benefits:
 * - Single endpoint returns all dashboard data (instead of 5+ separate calls)
 * - Server-side parallel data fetching
 * - Server-side data enrichment and computation
 * - Reduced network latency
 * - Simplified client code
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Reference, User, Bundle]),
    ReferencesModule,
    BundlesModule,
    AiModule,
    CommonModule,
  ],
  controllers: [
    SeekerBffController,
    ReferrerBffController,
    EmployerBffController,
  ],
  providers: [
    SeekerAggregationService,
    ReferrerAggregationService,
    EmployerAggregationService,
  ],
  exports: [
    SeekerAggregationService,
    ReferrerAggregationService,
    EmployerAggregationService,
  ],
})
export class BffModule {}
