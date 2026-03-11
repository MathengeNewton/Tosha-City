import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Sale } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { StockEntry } from '../stock-entries/entities/stock-entry.entity';
import { Product } from '../products/entities/product.entity';
import { StockShare } from '../stock-share/entities/stock-share.entity';
import { ProductionRun } from '../production/entities/production-run.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, SaleItem, StockEntry, Product, StockShare, ProductionRun]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}

