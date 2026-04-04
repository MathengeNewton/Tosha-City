import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantOrder } from './entities/restaurant-order.entity';
import { RestaurantOrderLine } from './entities/restaurant-order-line.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Sale } from '../sales/entities/sale.entity';
import { RestaurantOrdersService } from './restaurant-orders.service';
import { RestaurantOrdersController } from './restaurant-orders.controller';
import { StockSessionsModule } from '../stock-sessions/stock-sessions.module';
import { ProductsModule } from '../products/products.module';
import { SalesModule } from '../sales/sales.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RestaurantOrder, RestaurantOrderLine, Branch, Sale]),
    StockSessionsModule,
    ProductsModule,
    SalesModule,
    UsersModule,
  ],
  controllers: [RestaurantOrdersController],
  providers: [RestaurantOrdersService],
  exports: [RestaurantOrdersService],
})
export class RestaurantOrdersModule {}
