import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './services/email.service';
import { StorageService } from './services/storage.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [EmailService, StorageService],
  exports: [EmailService, StorageService],
})
export class CommonModule {}
