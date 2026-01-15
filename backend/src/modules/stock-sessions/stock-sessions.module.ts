import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockSessionsService } from './stock-sessions.service';
import { StockSessionsController } from './stock-sessions.controller';
import { StockSession } from './entities/stock-session.entity';
import { Sale } from '../sales/entities/sale.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StockSession, Sale])],
  controllers: [StockSessionsController],
  providers: [StockSessionsService],
  exports: [StockSessionsService],
})
export class StockSessionsModule {}

