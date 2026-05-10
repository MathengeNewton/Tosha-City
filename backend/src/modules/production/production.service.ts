import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProductionRun } from './entities/production-run.entity';
import { ProductionRunIngredient } from './entities/production-run-ingredient.entity';
import { CreateProductionRunDto } from './dto/create-production-run.dto';
import { RecipesService } from '../recipes/recipes.service';
import { StockSessionsService } from '../stock-sessions/stock-sessions.service';
import { SalesService } from '../sales/sales.service';
import { StockEntry, StockEntryType } from '../stock-entries/entities/stock-entry.entity';
import { BranchType } from '../branches/entities/branch.entity';
import { BranchCatalogScope } from '../../common/enums/branch-catalog-scope.enum';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { UserRole } from '../roles/entities/role.entity';

type RequestUser = {
  userId: number;
  roles?: Array<{ name?: string } | string>;
  branchId?: number | null;
};

type IngredientSnapshot = {
  recipeIngredientId: number;
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
    private readonly salesService: SalesService,
  ) {}

  private isAdmin(user?: RequestUser): boolean {
    return (user?.roles || []).some((role) =>
      typeof role === 'string' ? role === UserRole.ADMIN : role?.name === UserRole.ADMIN,
    );
  }

  private ensureBranchAccess(user: RequestUser, branchId: number) {
    if (!this.isAdmin(user) && user.branchId !== branchId) {
      throw new BadRequestException('You can only record production in your assigned branch');
    }
  }

  private validateRecipeForBranch(recipeBranchScope: BranchCatalogScope, branchType: BranchType) {
    if (recipeBranchScope === BranchCatalogScope.ALL) {
      return;
    }
    if (recipeBranchScope === BranchCatalogScope.GENERAL_BUTCHERY && branchType === BranchType.GENERAL_BUTCHERY) {
      return;
    }
    if (recipeBranchScope === BranchCatalogScope.PORK_BUTCHERY && branchType === BranchType.PORK_BUTCHERY) {
      return;
    }
    throw new BadRequestException('This recipe does not apply to the selected branch');
  }

  async create(createProductionRunDto: CreateProductionRunDto, user: RequestUser): Promise<ProductionRun> {
    const session = await this.stockSessionsService.findOne(createProductionRunDto.sessionId);
    this.ensureBranchAccess(user, session.branchId);

    const recipe = await this.recipesService.findOne(createProductionRunDto.recipeId);
    this.validateRecipeForBranch(recipe.branchScope, session.branch.type);

    const adjustmentMap = new Map(
      (createProductionRunDto.ingredientAdjustments || []).map((item) => [item.recipeIngredientId, item.actualQuantity]),
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
        estimatedQuantity: ingredient.estimatedQuantity,
        actualQuantity,
        unit: ingredient.unit,
      });
    }

    for (const [productId, requiredQuantity] of stockUsageByProduct.entries()) {
      const available = await this.salesService.getAvailableStock(session.id, productId);
      if (available < requiredQuantity) {
        const ingredientName =
          ingredientSnapshots.find((ingredient) => ingredient.productId === productId)?.ingredientName || 'ingredient';
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
        branchId: session.branchId,
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

        if (ingredient.productId) {
          const stockEntry = queryRunner.manager.create(StockEntry, {
            sessionId: session.id,
            productId: ingredient.productId,
            type: StockEntryType.PRODUCTION_USAGE,
            quantity: ingredient.actualQuantity,
            unit: ingredient.unit,
            notes: `Production usage for ${recipe.name}`,
            recordedById: user.userId,
          });
          await queryRunner.manager.save(StockEntry, stockEntry);
        }
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

  async findAll(sessionId?: number, branchId?: number): Promise<ProductionRun[]> {
    const query = this.productionRunRepository
      .createQueryBuilder('run')
      .leftJoinAndSelect('run.branch', 'branch')
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

    if (branchId) {
      query.andWhere('run.branchId = :branchId', { branchId });
    }

    return query.getMany();
  }

  async findOne(id: number): Promise<ProductionRun> {
    const run = await this.productionRunRepository.findOne({
      where: { id },
      relations: ['branch', 'session', 'recipe', 'finishedProduct', 'recordedBy', 'ingredients', 'ingredients.product'],
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
}
