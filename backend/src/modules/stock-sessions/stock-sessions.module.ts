import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockSessionsService } from './stock-sessions.service';
import { StockSessionsController } from './stock-sessions.controller';
import { StockSession } from './entities/stock-session.entity';
import { Sale } from '../sales/entities/sale.entity';
import { StockEntry } from '../stock-entries/entities/stock-entry.entity';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { Branch } from '../branches/entities/branch.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([StockSession, Sale, StockEntry, Branch]),
    ActivityLogModule,
  ],
  controllers: [StockSessionsController],
  providers: [StockSessionsService],
  exports: [StockSessionsService],
})
export class StockSessionsModule {}

