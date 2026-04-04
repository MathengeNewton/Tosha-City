import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { SalePayment } from './entities/sale-payment.entity';
import { StockEntry } from '../stock-entries/entities/stock-entry.entity';
import { ProductionRun } from '../production/entities/production-run.entity';
import { RestaurantOrder } from '../restaurant-orders/entities/restaurant-order.entity';
import { StockSessionsModule } from '../stock-sessions/stock-sessions.module';
import { ProductsModule } from '../products/products.module';
import { StockEntriesModule } from '../stock-entries/stock-entries.module';
import { CustomersModule } from '../customers/customers.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { ProductionModule } from '../production/production.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, SaleItem, SalePayment, StockEntry, ProductionRun, RestaurantOrder]),
    StockSessionsModule,
    ProductsModule,
    StockEntriesModule,
    CustomersModule,
    ActivityLogModule,
    forwardRef(() => ProductionModule),
  ],
  controllers: [SalesController, PaymentsController],
  providers: [SalesService, PaymentsService],
  exports: [SalesService, PaymentsService],
})
export class SalesModule {}

