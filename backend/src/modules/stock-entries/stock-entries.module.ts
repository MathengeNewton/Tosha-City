import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockEntriesService } from './stock-entries.service';
import { StockEntriesController } from './stock-entries.controller';
import { StockEntry } from './entities/stock-entry.entity';
import { StockSessionsModule } from '../stock-sessions/stock-sessions.module';
import { SuppliersModule } from '../suppliers/suppliers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StockEntry]),
    StockSessionsModule,
    SuppliersModule,
  ],
  controllers: [StockEntriesController],
  providers: [StockEntriesService],
  exports: [StockEntriesService],
})
export class StockEntriesModule {}

