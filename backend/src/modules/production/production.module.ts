import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionRun } from './entities/production-run.entity';
import { ProductionRunIngredient } from './entities/production-run-ingredient.entity';
import { StockEntry } from '../stock-entries/entities/stock-entry.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { ProductionService } from './production.service';
import { ProductionController } from './production.controller';
import { RecipesModule } from '../recipes/recipes.module';
import { StockSessionsModule } from '../stock-sessions/stock-sessions.module';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductionRun, ProductionRunIngredient, StockEntry, SaleItem]),
    RecipesModule,
    StockSessionsModule,
    forwardRef(() => SalesModule),
  ],
  controllers: [ProductionController],
  providers: [ProductionService],
  exports: [ProductionService],
})
export class ProductionModule {}
