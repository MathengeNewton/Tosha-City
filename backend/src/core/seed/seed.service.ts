import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../modules/roles/entities/role.entity';
import { User } from '../../modules/users/entities/user.entity';
import { UserRole } from '../../modules/roles/entities/role.entity';
import { Branch, BranchType } from '../../modules/branches/entities/branch.entity';
import { Product, ProductCategory, ProductSaleMode, ProductSegment } from '../../modules/products/entities/product.entity';
import { BranchCatalogScope } from '../../common/enums/branch-catalog-scope.enum';
import { StockSession, SessionStatus } from '../../modules/stock-sessions/entities/stock-session.entity';
import { StockEntry, StockEntryType } from '../../modules/stock-entries/entities/stock-entry.entity';
import { Sale } from '../../modules/sales/entities/sale.entity';
import { Recipe } from '../../modules/recipes/entities/recipe.entity';
import { RecipeIngredient } from '../../modules/recipes/entities/recipe-ingredient.entity';
import { ProductionRun } from '../../modules/production/entities/production-run.entity';
import { ProductionRunIngredient } from '../../modules/production/entities/production-run-ingredient.entity';
import * as bcrypt from 'bcryptjs';

const DEMO_NOTE = 'local-demo-day';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(StockSession) private readonly sessionRepo: Repository<StockSession>,
    @InjectRepository(StockEntry) private readonly entryRepo: Repository<StockEntry>,
    @InjectRepository(Sale) private readonly saleRepo: Repository<Sale>,
    @InjectRepository(Recipe) private readonly recipeRepo: Repository<Recipe>,
    @InjectRepository(RecipeIngredient) private readonly recipeIngredientRepo: Repository<RecipeIngredient>,
    @InjectRepository(ProductionRun) private readonly productionRunRepo: Repository<ProductionRun>,
    @InjectRepository(ProductionRunIngredient) private readonly productionIngredientRepo: Repository<ProductionRunIngredient>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedRoles();
    await this.seedAdminUser();
    if (process.env.SEED_DEMO_DAY === 'true') {
      await this.seedDemoDay();
    }
  }

  private async seedRoles() {
    const roles = Object.values(UserRole);
    for (const name of roles) {
      const exists = await this.roleRepo.findOne({ where: { name } });
      if (!exists) {
        await this.roleRepo.save(this.roleRepo.create({ name }));
        this.logger.log(`Seeded role: ${name}`);
      }
    }
  }

  private async seedAdminUser() {
    const adminExists = await this.userRepo.findOne({
      where: { username: 'admin' },
    });
    if (!adminExists) {
      const adminRole = await this.roleRepo.findOne({
        where: { name: UserRole.ADMIN },
      });
      if (!adminRole) {
        throw new Error('Admin role not found! Did you seed roles first?');
      }
      
      const user = this.userRepo.create({
        username: 'admin',
        email: 'admin@laketown.co.ke',
        password: await bcrypt.hash('admin123', 10),
        roles: [adminRole],
      });
      await this.userRepo.save(user);
      this.logger.log('Seeded admin user');
    }
  }

  /** One open day for the local pork till: stock on hand plus production the cashier can sell. */
  private async seedDemoDay() {
    const branch = await this.branchRepo.findOne({ where: { type: BranchType.PORK_BUTCHERY, isActive: true } });
    if (!branch) {
      this.logger.warn('Demo day skipped: no active pork branch');
      return;
    }

    const opener =
      (await this.userRepo.findOne({ where: { branchId: branch.id } })) ||
      (await this.userRepo.findOne({ where: { username: 'admin' } }));
    if (!opener) {
      this.logger.warn('Demo day skipped: no user to open the session');
      return;
    }

    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());
    const openSessions = await this.sessionRepo.find({
      where: { branchId: branch.id, status: SessionStatus.OPEN },
      order: { openedAt: 'DESC' },
    });

    const already = await this.entryRepo
      .createQueryBuilder('entry')
      .innerJoin('entry.session', 'session')
      .where('session.branchId = :branchId', { branchId: branch.id })
      .andWhere('session.date = :today', { today })
      .andWhere('entry.notes = :notes', { notes: DEMO_NOTE })
      .getCount();
    if (already > 0) {
      this.logger.log(`Demo day already present for ${today}`);
      return;
    }

    for (const session of openSessions) {
      if (this.dayKey(session.date) === today) continue;
      const [entries, sales] = await Promise.all([
        this.entryRepo.count({ where: { sessionId: session.id } }),
        this.saleRepo.count({ where: { sessionId: session.id } }),
      ]);
      if (entries === 0 && sales === 0) {
        session.status = SessionStatus.CLOSED;
        session.closedAt = new Date();
        await this.sessionRepo.save(session);
        this.logger.log(`Closed empty session ${session.id} so today can be the open till`);
      }
    }

    let session = openSessions.find((row) => this.dayKey(row.date) === today && row.status === SessionStatus.OPEN);
    if (!session) {
      session = await this.sessionRepo.save(
        this.sessionRepo.create({
          date: today,
          branchId: branch.id,
          openedById: opener.id,
          status: SessionStatus.OPEN,
        }),
      );
    }

    const ugali = await this.upsertProduct({
      name: 'ugali',
      unit: 'portion',
      defaultPrice: 50,
      wholesalePrice: 50,
      category: ProductCategory.PRODUCTION_ITEM,
      saleMode: ProductSaleMode.PORTION,
      segment: ProductSegment.PREPARED,
      branchScope: BranchCatalogScope.PORK_BUTCHERY,
      salesPrompt: 'Number of portions',
      isActive: true,
    });
    const pork = await this.upsertProduct({
      name: 'Pork',
      unit: 'kg',
      defaultPrice: 680,
      wholesalePrice: 620,
      category: ProductCategory.RAW_STOCK,
      saleMode: ProductSaleMode.WEIGHT,
      segment: ProductSegment.MEAT,
      branchScope: BranchCatalogScope.PORK_BUTCHERY,
      salesPrompt: null,
      isActive: true,
    });
    const maize = await this.upsertProduct({
      name: 'Maize flour',
      unit: 'kg',
      defaultPrice: 120,
      wholesalePrice: null,
      category: ProductCategory.RAW_STOCK,
      saleMode: ProductSaleMode.WEIGHT,
      segment: ProductSegment.KITCHEN_SUPPLY,
      branchScope: BranchCatalogScope.PORK_BUTCHERY,
      salesPrompt: null,
      isActive: true,
    });
    const friedPork = await this.upsertProduct({
      name: 'Fried pork',
      unit: 'portion',
      defaultPrice: 200,
      wholesalePrice: 180,
      category: ProductCategory.PRODUCTION_ITEM,
      saleMode: ProductSaleMode.PORTION,
      segment: ProductSegment.PREPARED,
      branchScope: BranchCatalogScope.PORK_BUTCHERY,
      salesPrompt: 'Number of portions',
      isActive: true,
    });

    await this.entryRepo.save([
      this.opening(session.id, pork, 18.5, opener.id),
      this.opening(session.id, maize, 8, opener.id),
    ]);

    const ugaliRecipe = await this.ensureRecipe({
      name: 'Ugali batch',
      finishedProductId: ugali.id,
      expectedOutputQuantity: 48,
      outputUnit: 'portion',
      notes: DEMO_NOTE,
      ingredients: [{ product: maize, ingredientName: 'Maize flour', estimatedQuantity: 3.5, unit: 'kg' }],
    });
    const friedRecipe = await this.ensureRecipe({
      name: 'Fried pork batch',
      finishedProductId: friedPork.id,
      expectedOutputQuantity: 24,
      outputUnit: 'portion',
      notes: DEMO_NOTE,
      ingredients: [{ product: pork, ingredientName: 'Pork', estimatedQuantity: 6, unit: 'kg' }],
    });

    await this.recordRun(session, ugaliRecipe, ugali.id, branch.id, opener.id, 48, 3);
    await this.recordRun(session, friedRecipe, friedPork.id, branch.id, opener.id, 24, 1);

    this.logger.log(
      `Seeded ${today} for ${branch.name}: Pork 12.5 kg left, ugali 45 portions, fried pork 23 portions`,
    );
  }

  private dayKey(value: Date | string): string {
    if (typeof value === 'string') return value.slice(0, 10);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(value);
  }

  private opening(sessionId: number, product: Product, quantity: number, recordedById: number): StockEntry {
    return this.entryRepo.create({
      sessionId,
      productId: product.id,
      type: StockEntryType.OPENING,
      quantity,
      unit: product.unit,
      notes: DEMO_NOTE,
      recordedById,
    });
  }

  private async upsertProduct(spec: {
    name: string;
    unit: string;
    defaultPrice: number;
    wholesalePrice: number | null;
    category: ProductCategory;
    saleMode: ProductSaleMode;
    segment: ProductSegment;
    branchScope: BranchCatalogScope;
    salesPrompt: string | null;
    isActive: boolean;
  }): Promise<Product> {
    const existing = await this.productRepo.findOne({ where: { name: spec.name } });
    if (!existing) {
      return this.productRepo.save(this.productRepo.create(spec));
    }
    Object.assign(existing, spec);
    return this.productRepo.save(existing);
  }

  private async ensureRecipe(spec: {
    name: string;
    finishedProductId: number;
    expectedOutputQuantity: number;
    outputUnit: string;
    notes: string;
    ingredients: Array<{ product: Product; ingredientName: string; estimatedQuantity: number; unit: string }>;
  }): Promise<Recipe> {
    let recipe = await this.recipeRepo.findOne({ where: { name: spec.name }, relations: ['ingredients'] });
    if (!recipe) {
      recipe = await this.recipeRepo.save(
        this.recipeRepo.create({
          name: spec.name,
          branchScope: BranchCatalogScope.PORK_BUTCHERY,
          finishedProductId: spec.finishedProductId,
          expectedOutputQuantity: spec.expectedOutputQuantity,
          outputUnit: spec.outputUnit,
          notes: spec.notes,
          isActive: true,
        }),
      );
      recipe.ingredients = [];
    }
    if (!recipe.ingredients?.length) {
      recipe.ingredients = [];
      for (const [index, ingredient] of spec.ingredients.entries()) {
        const saved = await this.recipeIngredientRepo.save(
          this.recipeIngredientRepo.create({
            recipeId: recipe.id,
            productId: ingredient.product.id,
            ingredientName: ingredient.ingredientName,
            estimatedQuantity: ingredient.estimatedQuantity,
            unit: ingredient.unit,
            sortOrder: index,
          }),
        );
        recipe.ingredients.push(saved);
      }
    }
    return recipe;
  }

  private async recordRun(
    session: StockSession,
    recipe: Recipe,
    finishedProductId: number,
    branchId: number,
    recordedById: number,
    actualOutputQuantity: number,
    wastedQuantity: number,
  ) {
    const run = await this.productionRunRepo.save(
      this.productionRunRepo.create({
        branchId,
        sessionId: session.id,
        recipeId: recipe.id,
        finishedProductId,
        expectedOutputQuantity: recipe.expectedOutputQuantity,
        actualOutputQuantity,
        wastedQuantity,
        notes: DEMO_NOTE,
        recordedById,
      }),
    );

    for (const ingredient of recipe.ingredients || []) {
      await this.productionIngredientRepo.save(
        this.productionIngredientRepo.create({
          productionRunId: run.id,
          recipeIngredientId: ingredient.id,
          productId: ingredient.productId,
          ingredientName: ingredient.ingredientName,
          estimatedQuantity: ingredient.estimatedQuantity,
          actualQuantity: ingredient.estimatedQuantity,
          unit: ingredient.unit,
        }),
      );
      if (ingredient.productId) {
        await this.entryRepo.save(
          this.entryRepo.create({
            sessionId: session.id,
            productId: ingredient.productId,
            type: StockEntryType.PRODUCTION_USAGE,
            quantity: ingredient.estimatedQuantity,
            unit: ingredient.unit,
            notes: DEMO_NOTE,
            recordedById,
          }),
        );
      }
    }
  }
}
