import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Reference, Bundle, KYCDocument } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([User, Reference, Bundle, KYCDocument])],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
