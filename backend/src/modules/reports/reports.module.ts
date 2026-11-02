import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Sale } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { StockEntry } from '../stock-entries/entities/stock-entry.entity';
import { Product } from '../products/entities/product.entity';
import { StockShare } from '../stock-share/entities/stock-share.entity';
import { StockSession } from '../stock-sessions/entities/stock-session.entity';
import { ReconciliationService } from './reconciliation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sale,
      SaleItem,
      StockEntry,
      Product,
      StockShare,
      StockSession,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, ReconciliationService],
  exports: [ReportsService, ReconciliationService],
})
export class ReportsModule {}
