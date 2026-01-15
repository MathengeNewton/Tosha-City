import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { SalePayment } from './entities/sale-payment.entity';
import { StockSessionsModule } from '../stock-sessions/stock-sessions.module';
import { ProductsModule } from '../products/products.module';
import { StockEntriesModule } from '../stock-entries/stock-entries.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, SaleItem, SalePayment]),
    StockSessionsModule,
    ProductsModule,
    StockEntriesModule,
    CustomersModule,
  ],
  controllers: [SalesController, PaymentsController],
  providers: [SalesService, PaymentsService],
  exports: [SalesService, PaymentsService],
})
export class SalesModule {}

