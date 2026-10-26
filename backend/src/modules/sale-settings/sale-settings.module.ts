import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaleSettings } from './entities/sale-settings.entity';
import { SaleSettingsService } from './sale-settings.service';
import { SaleSettingsController } from './sale-settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SaleSettings])],
  controllers: [SaleSettingsController],
  providers: [SaleSettingsService],
  exports: [SaleSettingsService],
})
export class SaleSettingsModule {}
