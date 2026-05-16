import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ProductionService } from './production.service';
import { ProductionRun } from './entities/production-run.entity';
import { ProductionRunIngredient } from './entities/production-run-ingredient.entity';
import { StockEntry } from '../stock-entries/entities/stock-entry.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { RecipesService } from '../recipes/recipes.service';
import { StockSessionsService } from '../stock-sessions/stock-sessions.service';
import { SalesService } from '../sales/sales.service';
import { ProductsService } from '../products/products.service';
import { ProductCategory } from '../products/entities/product.entity';

describe('ProductionService', () => {
  let service: ProductionService;
  let salesService: { getAvailableStock: jest.Mock };
  let productsService: { findOne: jest.Mock };
  let recipesService: { findOne: jest.Mock };
  let stockSessionsService: { findOne: jest.Mock };

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
  };

  beforeEach(async () => {
    salesService = { getAvailableStock: jest.fn().mockResolvedValue(100) };
    productsService = { findOne: jest.fn() };
    recipesService = { findOne: jest.fn() };
    stockSessionsService = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionService,
        {
          provide: getRepositoryToken(ProductionRun),
          useValue: { createQueryBuilder: jest.fn(() => mockQueryBuilder) },
        },
        { provide: getRepositoryToken(ProductionRunIngredient), useValue: {} },
        { provide: getRepositoryToken(StockEntry), useValue: {} },
        {
          provide: getRepositoryToken(SaleItem),
          useValue: { createQueryBuilder: jest.fn(() => mockQueryBuilder) },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(),
          },
        },
        { provide: RecipesService, useValue: recipesService },
        { provide: StockSessionsService, useValue: stockSessionsService },
        { provide: SalesService, useValue: salesService },
        { provide: ProductsService, useValue: productsService },
      ],
    }).compile();

    service = module.get(ProductionService);
    jest.clearAllMocks();
  });

  describe('getProducedAvailability', () => {
    it('returns produced minus sold for the session', async () => {
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ total: '50' })
        .mockResolvedValueOnce({ total: '12' });

      const available = await service.getProducedAvailability(1, 9);

      expect(available).toBe(38);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('returns zero when nothing was produced', async () => {
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ total: null })
        .mockResolvedValueOnce({ total: '0' });

      const available = await service.getProducedAvailability(1, 9);
      expect(available).toBe(0);
    });
  });

  describe('create with ad-hoc ingredients', () => {
    const user = { userId: 1, roles: [{ name: 'cashier' }] };

    beforeEach(() => {
      stockSessionsService.findOne.mockResolvedValue({ id: 10 });
      recipesService.findOne.mockResolvedValue({
        id: 5,
        finishedProductId: 99,
        expectedOutputQuantity: 40,
        name: 'Mutura',
        ingredients: [
          {
            id: 1,
            productId: 20,
            ingredientName: 'Beef',
            estimatedQuantity: 2,
            unit: 'kg',
          },
        ],
      });
    });

    it('rejects production items used as ad-hoc ingredients', async () => {
      productsService.findOne.mockResolvedValue({
        id: 30,
        name: 'Mutura portion',
        category: ProductCategory.PRODUCTION_ITEM,
        unit: 'portion',
      });

      await expect(
        service.create(
          {
            recipeId: 5,
            sessionId: 10,
            actualOutputQuantity: 40,
            adHocIngredients: [{ productId: 30, actualQuantity: 1 }],
          },
          user,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('fails when combined recipe and ad-hoc usage exceeds session stock', async () => {
      productsService.findOne.mockResolvedValue({
        id: 21,
        name: 'Extra beef',
        category: ProductCategory.RAW_STOCK,
        unit: 'kg',
      });
      salesService.getAvailableStock.mockImplementation(async (_sessionId, productId) => {
        if (productId === 20) return 2;
        if (productId === 21) return 0.5;
        return 0;
      });

      await expect(
        service.create(
          {
            recipeId: 5,
            sessionId: 10,
            actualOutputQuantity: 40,
            ingredientAdjustments: [{ recipeIngredientId: 1, actualQuantity: 2 }],
            adHocIngredients: [{ productId: 21, actualQuantity: 1 }],
          },
          user,
        ),
      ).rejects.toThrow(/Insufficient stock/);
    });
  });
});
