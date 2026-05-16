import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './core/config/database.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { User } from './modules/users/entities/user.entity';
import { Role } from './modules/roles/entities/role.entity';
import { Product } from './modules/products/entities/product.entity';
import { StockSession } from './modules/stock-sessions/entities/stock-session.entity';
import { StockEntry } from './modules/stock-entries/entities/stock-entry.entity';
import { Sale } from './modules/sales/entities/sale.entity';
import { SaleItem } from './modules/sales/entities/sale-item.entity';
import { SalePayment } from './modules/sales/entities/sale-payment.entity';
import { Supplier } from './modules/suppliers/entities/supplier.entity';
import { Customer } from './modules/customers/entities/customer.entity';
import { ActivityLog } from './modules/activity-log/entities/activity-log.entity';
import { Partner } from './modules/partners/entities/partner.entity';
import { StockShare } from './modules/stock-share/entities/stock-share.entity';
import { Recipe } from './modules/recipes/entities/recipe.entity';
import { RecipeIngredient } from './modules/recipes/entities/recipe-ingredient.entity';
import { ProductionRun } from './modules/production/entities/production-run.entity';
import { ProductionRunIngredient } from './modules/production/entities/production-run-ingredient.entity';
import { SeedModule } from './core/seed/seed.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { ProductsModule } from './modules/products/products.module';
import { RecipesModule } from './modules/recipes/recipes.module';
import { StockSessionsModule } from './modules/stock-sessions/stock-sessions.module';
import { StockEntriesModule } from './modules/stock-entries/stock-entries.module';
import { SalesModule } from './modules/sales/sales.module';
import { ProductionModule } from './modules/production/production.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ActivityLogModule } from './modules/activity-log/activity-log.module';
import { PartnersModule } from './modules/partners/partners.module';
import { StockShareModule } from './modules/stock-share/stock-share.module';
import AppConfig from './core/config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, AppConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return configService.get<TypeOrmModuleOptions>('database')!;
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      User,
      Role,
      Product,
      StockSession,
      StockEntry,
      Sale,
      SaleItem,
      SalePayment,
      Supplier,
      Customer,
      ActivityLog,
      Partner,
      StockShare,
      Recipe,
      RecipeIngredient,
      ProductionRun,
      ProductionRunIngredient,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const config = configService.get('app');
        return {
          secret: config?.jwt?.secret || 'fallback_secret_key',
          signOptions: {
            expiresIn: config?.jwt?.expiresIn || '1d',
          },
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    ProductsModule,
    RecipesModule,
    StockSessionsModule,
    StockEntriesModule,
    SalesModule,
    ProductionModule,
    UploadsModule,
    ReportsModule,
    SuppliersModule,
    CustomersModule,
    ActivityLogModule,
    PartnersModule,
    StockShareModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  constructor(private configService: ConfigService) {
    const appConfig = this.configService.get('app');
    console.log('App Config:', {
      hasJwtConfig: !!appConfig?.jwt,
      hasSecret: !!appConfig?.jwt?.secret,
    });
  }
}
