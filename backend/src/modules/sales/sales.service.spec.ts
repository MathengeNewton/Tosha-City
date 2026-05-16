import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SalesService } from './sales.service';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { SalePayment } from './entities/sale-payment.entity';
import { StockEntry } from '../stock-entries/entities/stock-entry.entity';
import { StockSessionsService } from '../stock-sessions/stock-sessions.service';
import { ProductsService } from '../products/products.service';
import { StockEntriesService } from '../stock-entries/stock-entries.service';
import { CustomersService } from '../customers/customers.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { ProductionService } from '../production/production.service';
import { ProductCategory } from '../products/entities/product.entity';

describe('SalesService', () => {
  let service: SalesService;
  let productionService: { getProducedAvailability: jest.Mock };
  let productsService: { findOne: jest.Mock };

  beforeEach(async () => {
    productionService = { getProducedAvailability: jest.fn().mockResolvedValue(25) };
    productsService = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: getRepositoryToken(Sale), useValue: {} },
        { provide: getRepositoryToken(SaleItem), useValue: {} },
        { provide: getRepositoryToken(SalePayment), useValue: {} },
        { provide: getRepositoryToken(StockEntry), useValue: {} },
        { provide: DataSource, useValue: {} },
        { provide: StockSessionsService, useValue: {} },
        { provide: ProductsService, useValue: productsService },
        { provide: StockEntriesService, useValue: {} },
        { provide: CustomersService, useValue: {} },
        { provide: ActivityLogService, useValue: {} },
        { provide: ProductionService, useValue: productionService },
      ],
    }).compile();

    service = module.get(SalesService);
    jest.spyOn(service, 'getAvailableStock').mockResolvedValue(100);
  });

  describe('resolveAvailableQuantity', () => {
    it('uses produced availability for production items', async () => {
      const available = await service.resolveAvailableQuantity(3, 9, ProductCategory.PRODUCTION_ITEM);
      expect(available).toBe(25);
      expect(productionService.getProducedAvailability).toHaveBeenCalledWith(3, 9);
    });

    it('uses opening stock for raw products', async () => {
      const available = await service.resolveAvailableQuantity(3, 9, ProductCategory.RAW_STOCK);
      expect(available).toBe(100);
      expect(productionService.getProducedAvailability).not.toHaveBeenCalled();
    });
  });

  describe('getProductAvailability', () => {
    it('returns produced source for finished goods', async () => {
      productsService.findOne.mockResolvedValue({
        id: 9,
        unit: 'portion',
        category: ProductCategory.PRODUCTION_ITEM,
        parentProductId: null,
      });

      const result = await service.getProductAvailability(3, 9);
      expect(result).toEqual({ available: 25, unit: 'portion', source: 'produced' });
    });
  });
});
