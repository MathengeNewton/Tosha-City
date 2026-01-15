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
import { SeedService } from './core/seed/seed.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { ProductsModule } from './modules/products/products.module';
import { StockSessionsModule } from './modules/stock-sessions/stock-sessions.module';
import { StockEntriesModule } from './modules/stock-entries/stock-entries.module';
import { SalesModule } from './modules/sales/sales.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { CustomersModule } from './modules/customers/customers.module';
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
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const config = configService.get('app');
        console.log('JWT Config:', {
          hasSecret: !!config?.jwt?.secret,
          expiresIn: config?.jwt?.expiresIn,
        });
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
    StockSessionsModule,
    StockEntriesModule,
    SalesModule,
    UploadsModule,
    ReportsModule,
    SuppliersModule,
    CustomersModule,
  ],
  controllers: [AppController],
  providers: [AppService, SeedService],
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
