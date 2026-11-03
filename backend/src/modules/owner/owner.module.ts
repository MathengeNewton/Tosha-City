import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { SalePayment } from '../sales/entities/sale-payment.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { StockEntry } from '../stock-entries/entities/stock-entry.entity';
import { StockSession } from '../stock-sessions/entities/stock-session.entity';
import { Product } from '../products/entities/product.entity';
import { ActivityLog } from '../activity-log/entities/activity-log.entity';
import { CustomerProductPrice } from '../customers/entities/customer-product-price.entity';
import { ReportsModule } from '../reports/reports.module';
import { OwnerDevice } from './entities/owner-device.entity';
import { OwnerNotification } from './entities/owner-notification.entity';
import { OwnerController } from './owner.controller';
import { OwnerSummaryService } from './owner-summary.service';
import { OwnerAlertsService } from './owner-alerts.service';
import { OwnerNotificationsService } from './owner-notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sale,
      SaleItem,
      SalePayment,
      Expense,
      StockEntry,
      StockSession,
      Product,
      ActivityLog,
      CustomerProductPrice,
      OwnerDevice,
      OwnerNotification,
    ]),
    ReportsModule,
  ],
  controllers: [OwnerController],
  providers: [OwnerSummaryService, OwnerAlertsService, OwnerNotificationsService],
})
export class OwnerModule {}
