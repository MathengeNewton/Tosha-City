import { BadRequestException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProductionRun } from './entities/production-run.entity';
import { ProductionRunIngredient } from './entities/production-run-ingredient.entity';
import { CreateProductionRunDto } from './dto/create-production-run.dto';
import { RecipesService } from '../recipes/recipes.service';
import { StockSessionsService } from '../stock-sessions/stock-sessions.service';
import { SalesService } from '../sales/sales.service';
import { StockEntry, StockEntryType } from '../stock-entries/entities/stock-entry.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { ProductsService } from '../products/products.service';
import { ProductCategory } from '../products/entities/product.entity';

type RequestUser = {
  userId: number;
  roles?: Array<{ name?: string } | string>;
};

type IngredientSnapshot = {
  recipeIngredientId: number | null;
  productId: number | null;
  ingredientName: string;
  estimatedQuantity: number;
  actualQuantity: number;
  unit: string;
};

@Injectable()
export class ProductionService {
  constructor(
    @InjectRepository(ProductionRun)
    private readonly productionRunRepository: Repository<ProductionRun>,
    @InjectRepository(ProductionRunIngredient)
    private readonly productionRunIngredientRepository: Repository<ProductionRunIngredient>,
    @InjectRepository(StockEntry)
    private readonly stockEntryRepository: Repository<StockEntry>,
    @InjectRepository(SaleItem)
    private readonly saleItemRepository: Repository<SaleItem>,
    private readonly dataSource: DataSource,
    private readonly recipesService: RecipesService,
    private readonly stockSessionsService: StockSessionsService,
    @Inject(forwardRef(() => SalesService))
    private readonly salesService: SalesService,
    private readonly productsService: ProductsService,
  ) {}

  async create(createProductionRunDto: CreateProductionRunDto, user: RequestUser): Promise<ProductionRun> {
    const session = await this.stockSessionsService.findOne(createProductionRunDto.sessionId);
    const recipe = await this.recipesService.findOne(createProductionRunDto.recipeId);

    const adjustmentMap = new Map(
      (createProductionRunDto.ingredientAdjustments || []).map((item) => [
        item.recipeIngredientId,
        item.actualQuantity,
      ]),
    );

    const ingredientSnapshots: IngredientSnapshot[] = [];
    const stockUsageByProduct = new Map<number, number>();
    for (const ingredient of recipe.ingredients || []) {
      const actualQuantity = adjustmentMap.get(ingredient.id) ?? Number(ingredient.estimatedQuantity);
      if (actualQuantity < 0) {
        throw new BadRequestException(`Invalid actual quantity for ${ingredient.ingredientName}`);
      }

      if (ingredient.productId) {
        stockUsageByProduct.set(
          ingredient.productId,
          (stockUsageByProduct.get(ingredient.productId) || 0) + actualQuantity,
        );
      }

      ingredientSnapshots.push({
        recipeIngredientId: ingredient.id,
        productId: ingredient.productId,
        ingredientName: ingredient.ingredientName,
        estimatedQuantity: Number(ingredient.estimatedQuantity),
        actualQuantity,
        unit: ingredient.unit,
      });
    }

    for (const adHoc of createProductionRunDto.adHocIngredients || []) {
      const product = await this.productsService.findOne(adHoc.productId);
      if (product.category === ProductCategory.PRODUCTION_ITEM) {
        throw new BadRequestException(`Cannot use production item "${product.name}" as an ingredient`);
      }
      const qty = Number(adHoc.actualQuantity);
      if (qty < 0) {
        throw new BadRequestException(`Invalid quantity for ${product.name}`);
      }
      const existing = ingredientSnapshots.find((s) => s.productId === adHoc.productId);
      if (existing) {
        existing.actualQuantity += qty;
      } else {
        ingredientSnapshots.push({
          recipeIngredientId: null,
          productId: product.id,
          ingredientName: product.name,
          estimatedQuantity: 0,
          actualQuantity: qty,
          unit: product.unit,
        });
      }
      stockUsageByProduct.set(product.id, (stockUsageByProduct.get(product.id) || 0) + qty);
    }

    for (const [productId, requiredQuantity] of stockUsageByProduct.entries()) {
      const available = await this.salesService.getAvailableStock(session.id, productId);
      if (available < requiredQuantity) {
        const ingredientName =
          ingredientSnapshots.find((ingredient) => ingredient.productId === productId)?.ingredientName ||
          'ingredient';
        throw new BadRequestException(
          `Insufficient stock for ${ingredientName}. Available: ${available}, required: ${requiredQuantity}`,
        );
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const run = queryRunner.manager.create(ProductionRun, {
        sessionId: session.id,
        recipeId: recipe.id,
        finishedProductId: recipe.finishedProductId,
        expectedOutputQuantity: recipe.expectedOutputQuantity,
        actualOutputQuantity: createProductionRunDto.actualOutputQuantity,
        wastedQuantity: createProductionRunDto.wastedQuantity ?? 0,
        notes: createProductionRunDto.notes?.trim() || null,
        recordedById: user.userId,
      });

      const savedRun = await queryRunner.manager.save(ProductionRun, run);

      for (const ingredient of ingredientSnapshots) {
        const ingredientRow = queryRunner.manager.create(ProductionRunIngredient, {
          ...ingredient,
          productionRunId: savedRun.id,
        });
        await queryRunner.manager.save(ProductionRunIngredient, ingredientRow);
      }

      const stockUsageTotals = new Map<number, { quantity: number; unit: string }>();
      for (const ingredient of ingredientSnapshots) {
        if (!ingredient.productId) continue;
        const prev = stockUsageTotals.get(ingredient.productId);
        stockUsageTotals.set(ingredient.productId, {
          quantity: (prev?.quantity || 0) + Number(ingredient.actualQuantity),
          unit: ingredient.unit,
        });
      }
      for (const [productId, usage] of stockUsageTotals.entries()) {
        const stockEntry = queryRunner.manager.create(StockEntry, {
          sessionId: session.id,
          productId,
          type: StockEntryType.PRODUCTION_USAGE,
          quantity: usage.quantity,
          unit: usage.unit,
          notes: `Production usage for ${recipe.name}`,
          recordedById: user.userId,
        });
        await queryRunner.manager.save(StockEntry, stockEntry);
      }

      await queryRunner.commitTransaction();
      return this.findOne(savedRun.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(sessionId?: number): Promise<ProductionRun[]> {
    const query = this.productionRunRepository
      .createQueryBuilder('run')
      .leftJoinAndSelect('run.session', 'session')
      .leftJoinAndSelect('run.recipe', 'recipe')
      .leftJoinAndSelect('run.finishedProduct', 'finishedProduct')
      .leftJoinAndSelect('run.recordedBy', 'recordedBy')
      .leftJoinAndSelect('run.ingredients', 'ingredients')
      .leftJoinAndSelect('ingredients.product', 'ingredientProduct')
      .orderBy('run.recordedAt', 'DESC');

    if (sessionId) {
      query.andWhere('run.sessionId = :sessionId', { sessionId });
    }

    return query.getMany();
  }

  async findOne(id: number): Promise<ProductionRun> {
    const run = await this.productionRunRepository.findOne({
      where: { id },
      relations: [
        'session',
        'recipe',
        'finishedProduct',
        'recordedBy',
        'ingredients',
        'ingredients.product',
      ],
    });
    if (!run) {
      throw new NotFoundException(`Production run with ID ${id} not found`);
    }
    return run;
  }

  async getProducedAvailability(sessionId: number, finishedProductId: number): Promise<number> {
    const producedResult = await this.productionRunRepository
      .createQueryBuilder('run')
      .select('COALESCE(SUM(run.actualOutputQuantity - run.wastedQuantity), 0)', 'total')
      .where('run.sessionId = :sessionId', { sessionId })
      .andWhere('run.finishedProductId = :finishedProductId', { finishedProductId })
      .getRawOne();

    const soldResult = await this.saleItemRepository
      .createQueryBuilder('item')
      .select('COALESCE(SUM(item.quantity), 0)', 'total')
      .innerJoin('item.sale', 'sale')
      .where('sale.sessionId = :sessionId', { sessionId })
      .andWhere('item.productId = :finishedProductId', { finishedProductId })
      .getRawOne();

    return Number(producedResult?.total || 0) - Number(soldResult?.total || 0);
  }

  async getIngredientStock(sessionId: number, productId: number): Promise<number> {
    return this.salesService.getAvailableStock(sessionId, productId);
  }
}
