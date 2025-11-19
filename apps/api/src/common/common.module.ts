import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from './services/email.service';
import { StorageService } from './services/storage.service';
import { FormProcessorService } from './services/form-processor.service';
import { DataTransformerService } from './services/data-transformer.service';
import { SearchService } from './services/search.service';
import { PaginationService } from './services/pagination.service';
import { RcsCalculationService } from './services/rcs-calculation.service';
import { Reference, User } from '../database/entities';

/**
 * Common Module
 *
 * Provides shared services used across the application
 * All services are global to avoid repeated imports
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Reference, User]),
  ],
  providers: [
    EmailService,
    StorageService,
    FormProcessorService,
    DataTransformerService,
    SearchService,
    PaginationService,
    RcsCalculationService,
  ],
  exports: [
    EmailService,
    StorageService,
    FormProcessorService,
    DataTransformerService,
    SearchService,
    PaginationService,
    RcsCalculationService,
  ],
})
export class CommonModule {}
