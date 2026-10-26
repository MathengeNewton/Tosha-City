import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DEFAULT_TABLES, SaleSettings } from './entities/sale-settings.entity';
import { UpdateSaleSettingsDto } from './dto/update-sale-settings.dto';

@Injectable()
export class SaleSettingsService {
  constructor(
    @InjectRepository(SaleSettings)
    private readonly settingsRepository: Repository<SaleSettings>,
  ) {}

  async get(): Promise<SaleSettings> {
    const [existing] = await this.settingsRepository.find({ order: { id: 'ASC' }, take: 1 });
    if (existing) return existing;
    return this.settingsRepository.save(
      this.settingsRepository.create({
        cookingFeePerKg: 100,
        tables: DEFAULT_TABLES,
        receiptLocation: 'Nairobi-Nakuru Highway @ Kayole Adams',
        receiptPhone: '0746315595',
        paybillNumber: '222111',
        paybillAccount: '2783009',
      }),
    );
  }

  async update(dto: UpdateSaleSettingsDto): Promise<SaleSettings> {
    const settings = await this.get();
    if (dto.tables) {
      dto.tables = [...new Set(dto.tables.map((t) => t.trim()).filter(Boolean))];
    }
    Object.assign(settings, dto);
    return this.settingsRepository.save(settings);
  }

  async cookingFeePerKg(): Promise<number> {
    const settings = await this.get();
    return Number(settings.cookingFeePerKg);
  }
}
