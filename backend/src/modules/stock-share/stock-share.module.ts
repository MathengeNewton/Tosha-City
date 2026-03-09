import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockShare } from './entities/stock-share.entity';
import { StockShareService } from './stock-share.service';
import { StockShareController } from './stock-share.controller';
import { PartnersModule } from '../partners/partners.module';
import { ProductsModule } from '../products/products.module';
import { StockSessionsModule } from '../stock-sessions/stock-sessions.module';
import { StockEntriesModule } from '../stock-entries/stock-entries.module';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StockShare]),
    PartnersModule,
    ProductsModule,
    StockSessionsModule,
    StockEntriesModule,
    SalesModule,
  ],
  controllers: [StockShareController],
  providers: [StockShareService],
  exports: [StockShareService],
})
export class StockShareModule {}
