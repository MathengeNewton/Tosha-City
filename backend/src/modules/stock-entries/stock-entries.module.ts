import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockEntriesService } from './stock-entries.service';
import { StockEntriesController } from './stock-entries.controller';
import { StockEntry } from './entities/stock-entry.entity';
import { Sale } from '../sales/entities/sale.entity';
import { StockSessionsModule } from '../stock-sessions/stock-sessions.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StockEntry, Sale]),
    StockSessionsModule,
    SuppliersModule,
    ActivityLogModule,
  ],
  controllers: [StockEntriesController],
  providers: [StockEntriesService],
  exports: [StockEntriesService],
})
export class StockEntriesModule {}

