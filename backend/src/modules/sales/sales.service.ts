import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Sale } from './entities/sale.entity';
import { PaymentStatus, PaymentMethod, paymentLabel } from './entities/payment.enums';
import { SaleItem } from './entities/sale-item.entity';
import { SalePayment } from './entities/sale-payment.entity';
import { AddSaleItemsDto, CreateSaleDto, CreateSaleItemDto } from './dto/create-sale.dto';
import { SaleSettingsService } from '../sale-settings/sale-settings.service';
import { Customer } from '../customers/entities/customer.entity';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { StockSessionsService } from '../stock-sessions/stock-sessions.service';
import { ProductsService } from '../products/products.service';
import { StockEntriesService } from '../stock-entries/stock-entries.service';
import { StockSession, SessionStatus } from '../stock-sessions/entities/stock-session.entity';
import { StockEntry, StockEntryType } from '../stock-entries/entities/stock-entry.entity';
import { CustomersService } from '../customers/customers.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { UserRole } from '../roles/entities/role.entity';
import { BranchCatalogScope } from '../../common/enums/branch-catalog-scope.enum';
import { BranchType } from '../branches/entities/branch.entity';
import { Product, ProductCategory, ProductSaleMode, ProductSegment } from '../products/entities/product.entity';
import { ProductionRun } from '../production/entities/production-run.entity';
import { RestaurantOrder, RestaurantOrderStatus } from '../restaurant-orders/entities/restaurant-order.entity';

// Keep in step with SMALL_COOK_* in the till's saleLines.js.
const SMALL_COOK_MAX_KG = 0.5;
const SMALL_COOK_FEE = 50;

type RequestUser = {
  userId: number;
  roles?: Array<{ name?: string } | string>;
  branchId?: number | null;
};

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(SaleItem)
    private saleItemRepository: Repository<SaleItem>,
    @InjectRepository(SalePayment)
    private paymentRepository: Repository<SalePayment>,
    @InjectRepository(StockEntry)
    private stockEntryRepository: Repository<StockEntry>,
    @InjectRepository(ProductionRun)
    private productionRunRepository: Repository<ProductionRun>,
    @InjectRepository(RestaurantOrder)
    private restaurantOrderRepository: Repository<RestaurantOrder>,
    private dataSource: DataSource,
    private stockSessionsService: StockSessionsService,
    private productsService: ProductsService,
    @Inject(forwardRef(() => StockEntriesService))
    private stockEntriesService: StockEntriesService,
    private customersService: CustomersService,
    private activityLog: ActivityLogService,
    private saleSettingsService: SaleSettingsService,
  ) {}

  private isAdmin(user?: RequestUser): boolean {
    return (user?.roles || []).some((role) =>
      typeof role === 'string' ? role === UserRole.ADMIN : role?.name === UserRole.ADMIN,
    );
  }

  private assertProductSellableAtTill(product: Product): void {
    if (product.segment === ProductSegment.KITCHEN_SUPPLY) {
      throw new BadRequestException(
        `Product "${product.name}" is a kitchen supply item and cannot be sold on the till`,
      );
    }
  }

  private assertProductAllowedForBranch(product: Product, branchType: BranchType): void {
    const scope = product.branchScope ?? BranchCatalogScope.ALL;
    if (scope === BranchCatalogScope.ALL) {
      return;
    }
    if (scope === BranchCatalogScope.GENERAL_BUTCHERY && branchType === BranchType.GENERAL_BUTCHERY) {
      return;
    }
    if (scope === BranchCatalogScope.PORK_BUTCHERY && branchType === BranchType.PORK_BUTCHERY) {
      return;
    }
    throw new BadRequestException(`Product "${product.name}" is not available at this branch type`);
  }

  private assertSaleBranchAccess(sale: Sale, user?: RequestUser): void {
    if (!user) return;
    if (this.isAdmin(user)) return;
    if (!user.branchId || sale.branchId !== user.branchId) {
      throw new ForbiddenException('You cannot access this sale');
    }
  }

  async create(createSaleDto: CreateSaleDto, user: RequestUser): Promise<Sale> {
    // Verify session exists and is open
    const session = await this.stockSessionsService.findOne(createSaleDto.sessionId);
    if (session.status !== SessionStatus.OPEN) {
      throw new BadRequestException('Cannot create sale for a closed session');
    }

    if (!this.isAdmin(user)) {
      if (!user.branchId) {
        throw new BadRequestException('Your account is not assigned to a branch');
      }
      if (session.branchId !== user.branchId) {
        throw new BadRequestException('You can only create sales in your assigned branch');
      }
    }

    if (!createSaleDto.items || createSaleDto.items.length === 0) {
      throw new BadRequestException('Sale must have at least one item');
    }

    if (createSaleDto.restaurantOrderId) {
      const order = await this.restaurantOrderRepository.findOne({
        where: { id: createSaleDto.restaurantOrderId },
        relations: ['lines', 'lines.product', 'session', 'branch'],
      });
      if (!order) {
        throw new NotFoundException('Restaurant order not found');
      }
      if (order.status !== RestaurantOrderStatus.OPEN) {
        throw new BadRequestException('Restaurant order is not open for billing');
      }
      if (order.sessionId !== createSaleDto.sessionId) {
        throw new BadRequestException('Restaurant order session does not match sale session');
      }
      if (order.branchId !== session.branchId) {
        throw new BadRequestException('Restaurant order branch does not match session');
      }
      if (!this.isAdmin(user)) {
        if (!user.branchId || order.branchId !== user.branchId) {
          throw new ForbiddenException('You cannot bill this restaurant order');
        }
      }
      this.assertRestaurantItemsMatchOrder(order, createSaleDto.items);
    }

    // Resolve customer if provided (for credit or wholesale)
    let customer: Awaited<ReturnType<CustomersService['findOne']>> | null = null;
    if (createSaleDto.customerId) {
      customer = await this.customersService.findOne(createSaleDto.customerId);
    }

    // Validate credit sales require customer
    if (createSaleDto.paymentMethod === PaymentMethod.CREDIT) {
      if (!createSaleDto.customerId || !customer) {
        throw new BadRequestException('Customer is required for credit sales');
      }
      if (customer.type !== 'CREDIT') {
        const typeLabel = String(customer.type || 'REGULAR').toLowerCase();
        throw new BadRequestException(
          `${customer.name} is a ${typeLabel} customer. Only credit customers can buy on credit; change their type to Credit under Customers.`,
        );
      }
      // Check credit limit
      const outstandingBalance = await this.customersService.getOutstandingBalance(customer.id);
      if (customer.creditLimit && outstandingBalance >= customer.creditLimit) {
        throw new BadRequestException(`Customer has reached credit limit of ${customer.creditLimit}`);
      }
    }

    const { itemsToCreate, byproductStockEntries, totalAmount } = await this.prepareSaleItems(
      session,
      createSaleDto.items,
      customer,
      user,
    );
    const tableLabel = createSaleDto.tableLabel?.trim() || null;

    // Retry logic for handling race conditions with sale number generation
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Create sale and items in a transaction
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Generate sale number inside transaction to avoid race conditions
        const saleNumber = await this.generateSaleNumberInTransaction(queryRunner);

        const sale = queryRunner.manager.create(Sale, {
          sessionId: createSaleDto.sessionId,
          saleNumber,
          totalAmount,
          customerId: createSaleDto.customerId || null,
          paymentMethod: createSaleDto.paymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          soldById: user.userId,
          branchId: session.branchId,
          restaurantOrderId: createSaleDto.restaurantOrderId ?? null,
          tableLabel,
        });

        const savedSale = await queryRunner.manager.save(Sale, sale);

        // Create sale items
        for (const item of itemsToCreate) {
          const saleItem = queryRunner.manager.create(SaleItem, {
            ...item,
            saleId: savedSale.id,
          });
          await queryRunner.manager.save(SaleItem, saleItem);
        }

        // Create stock entries for byproducts (deduct from parent product) – use BYPRODUCT_SALE so it doesn't appear as wastage
        for (const byproductEntry of byproductStockEntries) {
          const stockEntry = queryRunner.manager.create(StockEntry, {
            sessionId: createSaleDto.sessionId,
            productId: byproductEntry.productId,
            type: StockEntryType.BYPRODUCT_SALE,
            quantity: byproductEntry.quantity,
            unit: byproductEntry.unit,
            notes: 'Byproduct sale (deducted from parent stock)',
            recordedById: user.userId,
            saleId: savedSale.id,
          });
          await queryRunner.manager.save(StockEntry, stockEntry);
        }

        if (createSaleDto.restaurantOrderId) {
          await queryRunner.manager.update(
            RestaurantOrder,
            { id: createSaleDto.restaurantOrderId },
            { status: RestaurantOrderStatus.BILLED },
          );
        }

        await queryRunner.commitTransaction();

        const saleWithItems = await this.findOne(savedSale.id);
        await this.activityLog.log({
          userId: user.userId,
          action: 'SALE_CREATED',
          entityType: 'sale',
          entityId: savedSale.id,
          details: { sessionId: createSaleDto.sessionId, saleNumber: saleWithItems.saleNumber, totalAmount: totalAmount },
          success: true,
        });
        return saleWithItems;
      } catch (error: any) {
        await queryRunner.rollbackTransaction();
        await this.activityLog.log({
          userId: user.userId,
          action: 'SALE_CREATED',
          entityType: 'sale',
          entityId: null,
          details: { sessionId: createSaleDto.sessionId },
          success: false,
          errorMessage: error?.message ?? String(error),
        });
        lastError = error;

        // Check if it's a duplicate key error (PostgreSQL error code 23505)
        // If so, retry with a new sale number
        if (error?.code === '23505' && error?.constraint === 'UQ_e573deaf1d34ddc5ed48612d2d0') {
          // This is a duplicate sale number error, retry
          if (attempt < maxRetries - 1) {
            // Wait a small random amount before retrying to reduce collision probability
            await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
            continue;
          }
        }

        // If it's not a duplicate key error or we've exhausted retries, throw
        throw error;
      } finally {
        await queryRunner.release();
      }
    }

    // If we get here, all retries failed
    throw lastError;
  }

  /**
   * Prices each line, adds any kitchen cooking fee, and checks stock. Items already
   * on the sale count as sold, so this also works when adding items to an open sale.
   */
  private async prepareSaleItems(
    session: StockSession,
    items: CreateSaleItemDto[],
    customer: Customer | null,
    user: RequestUser,
  ): Promise<{
    itemsToCreate: Partial<SaleItem>[];
    byproductStockEntries: Array<{ productId: number; quantity: number; unit: string }>;
    totalAmount: number;
  }> {
    const isWholesaleSale = customer?.type === 'WHOLESALE';
    const branchType = session.branch.type;
    const openSessionIds = await this.openSessionIds();
    const pooledSessions = openSessionIds.includes(session.id) ? openSessionIds : [...openSessionIds, session.id];
    const pooledStock = await this.loadStockSnapshot(pooledSessions);
    const cookingFeePerKg = items.some((item) => item.cookInKitchen)
      ? await this.saleSettingsService.cookingFeePerKg()
      : 0;

    let totalAmount = 0;
    const itemsToCreate: Partial<SaleItem>[] = [];
    const byproductStockEntries: Array<{ productId: number; quantity: number; unit: string }> = [];
    const requestedByStockKey = new Map<string, number>();

    for (const itemDto of items) {
      const quantity = Number(itemDto.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new BadRequestException('Item quantity must be greater than 0');
      }
      const product = await this.productsService.findOne(itemDto.productId);
      this.assertProductSellableAtTill(product);
      this.assertProductAllowedForBranch(product, branchType);
      const catalogPrice = isWholesaleSale
        ? Number(product.wholesalePrice ?? product.defaultPrice)
        : Number(product.defaultPrice);
      const unitPrice =
        this.isAdmin(user) && itemDto.unitPrice != null ? Number(itemDto.unitPrice) : catalogPrice;
      const itemTotal = this.roundUpKes(quantity * unitPrice);

      let cookingFee = 0;
      if (itemDto.cookInKitchen) {
        if (product.saleMode !== ProductSaleMode.WEIGHT) {
          throw new BadRequestException(
            `Only meat sold by weight can be cooked in the kitchen ("${product.name}" is sold per ${String(product.saleMode).toLowerCase()})`,
          );
        }
        cookingFee = this.cookingFeeFor(quantity, cookingFeePerKg);
      }
      totalAmount += itemTotal + cookingFee;

      // If this is a byproduct, check parent product stock instead
      const stockProductId = product.parentProductId || itemDto.productId;
      const stockProduct = product.parentProductId
        ? await this.productsService.findOne(product.parentProductId)
        : product;

      const availableStock = this.isUniversal(product)
        ? this.universalOnHand(product, pooledStock)
        : product.category === ProductCategory.PRODUCTION_ITEM
          ? await this.getProducedAvailableStock(session.id, itemDto.productId)
          : await this.getAvailableStock(session.id, stockProductId);
      const stockKey = `${product.category === ProductCategory.PRODUCTION_ITEM ? 'p' : 's'}:${stockProductId}`;
      const requested = (requestedByStockKey.get(stockKey) || 0) + quantity;
      requestedByStockKey.set(stockKey, requested);
      if (availableStock + 1e-6 < requested) {
        throw new BadRequestException(
          `Insufficient stock for ${product.name}. Available: ${availableStock} ${product.unit}, Requested: ${requested} ${product.unit}`,
        );
      }

      itemsToCreate.push({
        productId: itemDto.productId,
        quantity,
        unitPrice,
        totalPrice: itemTotal,
        cookInKitchen: !!itemDto.cookInKitchen,
        cookingFeePerKg: itemDto.cookInKitchen ? cookingFeePerKg : null,
        cookingFee,
      });

      if (product.parentProductId) {
        byproductStockEntries.push({
          productId: product.parentProductId,
          quantity,
          unit: stockProduct.unit,
        });
      }
    }

    return { itemsToCreate, byproductStockEntries, totalAmount: this.round2(totalAmount) };
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /** Whole shillings, rounded up. Cents are snapped first so float noise like 500.0000001 stays 500. */
  private roundUpKes(value: number): number {
    return Math.ceil(this.round2(value));
  }

  /** Under half a kg is cooked for a flat 50; from half a kg up it is charged per kg. */
  private cookingFeeFor(kg: number, cookingFeePerKg: number): number {
    const weight = Math.round(kg * 1000) / 1000;
    if (weight <= 0) return 0;
    if (weight < SMALL_COOK_MAX_KG) return SMALL_COOK_FEE;
    return this.roundUpKes(weight * cookingFeePerKg);
  }

  /** Cashiers and admins can add items to an unpaid sale. Existing items cannot be removed. */
  async addItems(id: number, dto: AddSaleItemsDto, user: RequestUser): Promise<Sale> {
    const sale = await this.findOne(id, user);
    if (sale.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('This sale is paid and can no longer be edited');
    }
    if (sale.session?.status !== SessionStatus.OPEN) {
      throw new BadRequestException('Items can only be added while the stock session is open');
    }
    if (sale.restaurantOrderId) {
      throw new BadRequestException('Add items to the table order instead of the billed sale');
    }
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Add at least one item');
    }

    const session = await this.stockSessionsService.findOne(sale.sessionId);
    const { itemsToCreate, byproductStockEntries, totalAmount } = await this.prepareSaleItems(
      session,
      dto.items,
      sale.customer ?? null,
      user,
    );

    await this.dataSource.transaction(async (manager) => {
      for (const item of itemsToCreate) {
        await manager.save(SaleItem, manager.create(SaleItem, { ...item, saleId: sale.id }));
      }
      for (const entry of byproductStockEntries) {
        await manager.save(
          StockEntry,
          manager.create(StockEntry, {
            sessionId: sale.sessionId,
            productId: entry.productId,
            type: StockEntryType.BYPRODUCT_SALE,
            quantity: entry.quantity,
            unit: entry.unit,
            notes: 'Byproduct sale (deducted from parent stock)',
            recordedById: user.userId,
            saleId: sale.id,
          }),
        );
      }
      await manager.update(Sale, { id: sale.id }, { totalAmount: this.round2(Number(sale.totalAmount) + totalAmount) });
    });

    await this.activityLog.log({
      userId: user.userId,
      action: 'SALE_ITEMS_ADDED',
      entityType: 'sale',
      entityId: sale.id,
      details: { saleNumber: sale.saleNumber, items: dto.items, addedAmount: totalAmount },
      success: true,
    });
    return this.findOne(sale.id, user);
  }

  async findAll(
    sessionId?: number,
    productId?: number,
    date?: string,
    dateFrom?: string,
    dateTo?: string,
    branchId?: number,
  ): Promise<Sale[]> {
    const query = this.saleRepository.createQueryBuilder('sale')
      .leftJoinAndSelect('sale.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('sale.soldBy', 'soldBy')
      .leftJoinAndSelect('sale.session', 'session');

    if (sessionId) {
      query.where('sale.sessionId = :sessionId', { sessionId });
    }

    if (productId) {
      query.andWhere(
        'EXISTS (SELECT 1 FROM sale_item si WHERE si."saleId" = sale.id AND si."productId" = :productId)',
        { productId },
      );
    }

    // soldAt is stored as UTC without a zone; the shop works in Nairobi time.
    const saleDay = `DATE((sale.soldAt AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Nairobi')`;
    if (dateFrom || dateTo) {
      if (dateFrom) query.andWhere(`${saleDay} >= :dateFrom`, { dateFrom });
      if (dateTo) query.andWhere(`${saleDay} <= :dateTo`, { dateTo });
    } else if (date) {
      query.andWhere(`${saleDay} = :date`, { date });
    }

    if (branchId) {
      query.andWhere('sale.branchId = :branchId', { branchId });
    }

    return await query.orderBy('sale.soldAt', 'DESC').getMany();
  }

  async findOne(id: number, user?: RequestUser): Promise<Sale> {
    const sale = await this.saleRepository.findOne({
      where: { id },
      relations: [
        'items',
        'items.product',
        'soldBy',
        'session',
        'payment',
        'payment.receivedBy',
        'branch',
        'customer',
        'restaurantOrder',
      ],
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }

    this.assertSaleBranchAccess(sale, user);
    return sale;
  }

  async getPaymentForSale(saleId: number, user?: RequestUser): Promise<SalePayment | null> {
    const sale = await this.findOne(saleId, user);
    return sale.payment || null;
  }

  async generatePlainTextReceipt(saleId: number, user?: RequestUser): Promise<string> {
    const sale = await this.findOne(saleId, user);
    const width = 32;
    const center = (value: string) => {
      const text = value.slice(0, width);
      const pad = Math.max(0, Math.floor((width - text.length) / 2));
      return `${' '.repeat(pad)}${text}`;
    };
    const pair = (left: string, right: string) => {
      const gap = Math.max(1, width - left.length - right.length);
      return `${left}${' '.repeat(gap)}${right}`;
    };
    const soldAt = new Date(sale.soldAt);
    const datePart = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Nairobi',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(soldAt);
    const timePart = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Nairobi',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(soldAt);
    const settings = await this.saleSettingsService.get();
    const rule = '-'.repeat(width);
    const lines = [
      center('CUSTOMER BILL'),
      center('LAKETOWN BUTCHERY'),
      center((sale.branch?.name || 'LakeTown').toUpperCase()),
    ];
    if (settings.receiptLocation) {
      const words = settings.receiptLocation.split(/\s+/);
      let current = '';
      for (const word of words) {
        if (current && `${current} ${word}`.length > width) {
          lines.push(center(current));
          current = word;
        } else {
          current = current ? `${current} ${word}` : word;
        }
      }
      if (current) lines.push(center(current));
    }
    if (settings.receiptPhone) lines.push(center(`Tel: ${settings.receiptPhone}`));
    lines.push(rule);
    lines.push(pair('Date', datePart));
    lines.push(pair('Time', timePart));
    lines.push(pair('Served by', sale.soldBy?.username || 'Cashier'));
    const table = sale.tableLabel || sale.restaurantOrder?.tableLabel;
    if (table) lines.push(pair('Table', table));
    lines.push(pair('Customer', sale.customer?.name || 'Walk-in'));
    lines.push(pair('Ticket', sale.saleNumber));
    lines.push(rule);
    for (const item of sale.items || []) {
      const unitPrice = Number(item.unitPrice || 0);
      const totalPrice = Number(item.totalPrice || Number(item.quantity) * unitPrice);
      // Stored quantity keeps 2 decimals; weight lines were priced by amount, so derive the real weight.
      const quantity =
        item.product?.saleMode === ProductSaleMode.WEIGHT && unitPrice > 0 && totalPrice > 0
          ? Number((totalPrice / unitPrice).toFixed(3))
          : Number(item.quantity);
      const unit = item.product?.unit || '';
      lines.push(`- ${quantity} ${item.product?.name || 'Item'} ${unit}`.slice(0, width));
      lines.push(pair('', `@${this.roundUpKes(unitPrice)}  ${this.roundUpKes(totalPrice)}`).trimEnd());
      if (item.cookInKitchen && Number(item.cookingFee) > 0) {
        lines.push(`  Cooking ${quantity} kg`.slice(0, width));
        const rate =
          quantity < SMALL_COOK_MAX_KG ? 'under 1/2 kg' : `@${this.roundUpKes(Number(item.cookingFeePerKg || 0))}`;
        lines.push(pair('', `${rate}  ${this.roundUpKes(Number(item.cookingFee))}`).trimEnd());
      }
    }
    lines.push(rule);
    lines.push(pair('Total', String(this.roundUpKes(Number(sale.totalAmount)))));
    lines.push(
      pair(
        'Payment',
        sale.payment
          ? paymentLabel(sale.payment.method, sale.payment.mpesaChannel)
          : paymentLabel(sale.paymentMethod),
      ),
    );
    lines.push(pair('Status', sale.paymentStatus === PaymentStatus.PAID ? 'PAID' : 'UNPAID'));
    if (sale.payment?.reference) {
      lines.push(pair('Ref', sale.payment.reference));
    }
    if (settings.tillNumber || settings.paybillNumber) {
      lines.push(rule);
      lines.push(center('PAY VIA M-PESA'));
      if (settings.tillNumber) lines.push(pair('Buy Goods Till', settings.tillNumber));
      if (settings.paybillNumber) lines.push(pair('Paybill', settings.paybillNumber));
      if (settings.paybillNumber && settings.paybillAccount) lines.push(pair('Account No.', settings.paybillAccount));
    }
    lines.push(rule);
    lines.push(center('THANK YOU & WELCOME AGAIN.'));
    lines.push(center('Powered by mangoseasonlabs.co.ke'));
    return lines.join('\n');
  }

  async update(id: number, updateSaleDto: UpdateSaleDto, userId: number, user?: RequestUser): Promise<Sale> {
    try {
      const sale = await this.findOne(id, user);

      if (sale.paymentStatus === PaymentStatus.PAID) {
        throw new BadRequestException('Cannot update a paid sale');
      }

      if (sale.session?.status !== SessionStatus.OPEN) {
        throw new BadRequestException('Sales can only be edited while their stock session is still open');
      }

      if (updateSaleDto.paymentMethod) {
        sale.paymentMethod = updateSaleDto.paymentMethod;
      }

      const saved = await this.saleRepository.save(sale);
      await this.activityLog.log({
        userId,
        action: 'SALE_UPDATED',
        entityType: 'sale',
        entityId: id,
        details: { ...updateSaleDto } as Record<string, unknown>,
        success: true,
      });
      return saved;
    } catch (e: any) {
      await this.activityLog.log({
        userId,
        action: 'SALE_UPDATED',
        entityType: 'sale',
        entityId: id,
        details: { ...updateSaleDto } as Record<string, unknown>,
        success: false,
        errorMessage: e?.message ?? String(e),
      });
      throw e;
    }
  }

  async remove(id: number, userId?: number, user?: RequestUser): Promise<void> {
    try {
      const sale = await this.findOne(id, user);

      if (sale.paymentStatus === PaymentStatus.PAID) {
        throw new BadRequestException('Cannot delete a paid sale');
      }

      if (sale.session?.status !== SessionStatus.OPEN) {
        throw new BadRequestException('Sales can only be deleted while their stock session is still open');
      }

      // Sold quantities come back automatically once the sale items are gone; byproduct
      // deductions are separate stock entries, so remove those with the sale.
      await this.dataSource.transaction(async (manager) => {
        await manager.delete(StockEntry, { saleId: sale.id, type: StockEntryType.BYPRODUCT_SALE });
        if (sale.restaurantOrderId) {
          await manager.update(Sale, { id: sale.id }, { restaurantOrderId: null });
          await manager.update(
            RestaurantOrder,
            { id: sale.restaurantOrderId },
            { status: RestaurantOrderStatus.OPEN },
          );
        }
        await manager.delete(SaleItem, { saleId: sale.id });
        await manager.delete(Sale, { id: sale.id });
      });
      await this.activityLog.log({
        userId: userId ?? null,
        action: 'SALE_DELETED',
        entityType: 'sale',
        entityId: id,
        details: { saleNumber: sale.saleNumber },
        success: true,
      });
    } catch (e: any) {
      await this.activityLog.log({
        userId: userId ?? null,
        action: 'SALE_DELETED',
        entityType: 'sale',
        entityId: id,
        success: false,
        errorMessage: e?.message ?? String(e),
      });
      throw e;
    }
  }

  private async generateSaleNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count sales today
    const count = await this.saleRepository.count({
      where: {
        soldAt: today,
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `SALE-${year}-${sequence}`;
  }

  /**
   * Generate sale number within a transaction to avoid race conditions.
   * This method finds the highest existing sale number for the current year
   * and increments it atomically.
   */
  private async generateSaleNumberInTransaction(queryRunner: any): Promise<string> {
    const year = new Date().getFullYear();
    const yearPrefix = `SALE-${year}-`;

    // Find the highest sale number for this year
    const result = await queryRunner.manager
      .createQueryBuilder()
      .select('sale.saleNumber', 'saleNumber')
      .from(Sale, 'sale')
      .where('sale.saleNumber LIKE :pattern', { pattern: `${yearPrefix}%` })
      .orderBy('sale.saleNumber', 'DESC')
      .limit(1)
      .getRawOne();

    let nextSequence = 1;

    if (result && result.saleNumber) {
      // Extract the sequence number from the existing sale number
      const existingNumber = result.saleNumber;
      const sequencePart = existingNumber.replace(yearPrefix, '');
      const existingSequence = parseInt(sequencePart, 10);
      
      if (!isNaN(existingSequence)) {
        nextSequence = existingSequence + 1;
      }
    }

    const sequence = String(nextSequence).padStart(4, '0');
    return `${yearPrefix}${sequence}`;
  }

  async getAvailableStock(sessionId: number, productId: number): Promise<number> {
    // Get opening stock
    const openingEntries = await this.stockEntriesService.findAll(sessionId, productId, StockEntryType.OPENING);
    const openingStock = openingEntries.reduce((sum, entry) => sum + Number(entry.quantity), 0);

    // Get incoming stock
    const incomingEntries = await this.stockEntriesService.findAll(sessionId, productId, StockEntryType.INCOMING);
    const incomingStock = incomingEntries.reduce((sum, entry) => sum + Number(entry.quantity), 0);

    // Get sold stock - use direct query for efficiency
    const soldStockResult = await this.saleItemRepository
      .createQueryBuilder('item')
      .select('COALESCE(SUM(item.quantity), 0)', 'total')
      .innerJoin('item.sale', 'sale')
      .where('sale.sessionId = :sessionId', { sessionId })
      .andWhere('item.productId = :productId', { productId })
      .getRawOne();
    const soldStock = soldStockResult ? Number(soldStockResult.total) : 0;

    // Get wastage (real wastage only)
    const wastageEntries = await this.stockEntriesService.findAll(sessionId, productId, StockEntryType.WASTAGE);
    const wastage = wastageEntries.reduce((sum, entry) => sum + Number(entry.quantity), 0);

    // Get byproduct sales (deducted from this parent product)
    const byproductSaleEntries = await this.stockEntriesService.findAll(sessionId, productId, StockEntryType.BYPRODUCT_SALE);
    const byproductSaleQty = byproductSaleEntries.reduce((sum, entry) => sum + Number(entry.quantity), 0);

    // Get partner shares (deducted from available stock)
    const partnerShareEntries = await this.stockEntriesService.findAll(sessionId, productId, StockEntryType.PARTNER_SHARE);
    const partnerShareQty = partnerShareEntries.reduce((sum, entry) => sum + Number(entry.quantity), 0);

    const kitchenIssueEntries = await this.stockEntriesService.findAll(sessionId, productId, StockEntryType.KITCHEN_ISSUE);
    const kitchenIssueQty = kitchenIssueEntries.reduce((sum, entry) => sum + Number(entry.quantity), 0);

    const productionUsageEntries = await this.stockEntriesService.findAll(sessionId, productId, StockEntryType.PRODUCTION_USAGE);
    const productionUsageQty = productionUsageEntries.reduce((sum, entry) => sum + Number(entry.quantity), 0);

    const adjustmentEntries = await this.stockEntriesService.findAll(sessionId, productId, StockEntryType.ADJUSTMENT);
    const adjustmentQty = adjustmentEntries.reduce((sum, entry) => sum + Number(entry.quantity), 0);

    return (
      openingStock +
      incomingStock +
      adjustmentQty -
      soldStock -
      wastage -
      byproductSaleQty -
      partnerShareQty -
      kitchenIssueQty -
      productionUsageQty
    );
  }

  /** All-branches products can be sold from any till. Stock is the pool of every open session. */
  private isUniversal(product: Product): boolean {
    return (product.branchScope ?? BranchCatalogScope.ALL) === BranchCatalogScope.ALL;
  }

  private async openSessionIds(): Promise<number[]> {
    const rows = await this.dataSource.getRepository(StockSession).find({
      where: { status: SessionStatus.OPEN },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  private async loadStockSnapshot(sessionIds: number[]): Promise<{
    entryQty: (productId: number, type: StockEntryType) => number;
    sold: Map<number, number>;
    produced: Map<number, number>;
  }> {
    const empty = {
      entryQty: () => 0,
      sold: new Map<number, number>(),
      produced: new Map<number, number>(),
    };
    if (sessionIds.length === 0) return empty;

    const [entryRows, soldRows, producedRows] = await Promise.all([
      this.stockEntryRepository
        .createQueryBuilder('entry')
        .select('entry.productId', 'productId')
        .addSelect('entry.type', 'type')
        .addSelect('COALESCE(SUM(entry.quantity), 0)', 'total')
        .where('entry.sessionId IN (:...sessionIds)', { sessionIds })
        .groupBy('entry.productId')
        .addGroupBy('entry.type')
        .getRawMany(),
      this.saleItemRepository
        .createQueryBuilder('item')
        .select('item.productId', 'productId')
        .addSelect('COALESCE(SUM(item.quantity), 0)', 'total')
        .innerJoin('item.sale', 'sale')
        .where('sale.sessionId IN (:...sessionIds)', { sessionIds })
        .groupBy('item.productId')
        .getRawMany(),
      this.productionRunRepository
        .createQueryBuilder('run')
        .select('run.finishedProductId', 'productId')
        .addSelect('COALESCE(SUM(run.actualOutputQuantity - run.wastedQuantity), 0)', 'total')
        .where('run.sessionId IN (:...sessionIds)', { sessionIds })
        .groupBy('run.finishedProductId')
        .getRawMany(),
    ]);

    const entryTotals = new Map<string, number>();
    for (const row of entryRows) {
      const productId = Number(row.productId ?? row.productid);
      const type = String(row.type ?? '');
      const total = Number(row.total ?? 0);
      if (Number.isFinite(productId)) entryTotals.set(`${productId}:${type}`, Number.isFinite(total) ? total : 0);
    }

    return {
      entryQty: (productId, type) => entryTotals.get(`${productId}:${type}`) || 0,
      sold: this.rawQtyMap(soldRows),
      produced: this.rawQtyMap(producedRows),
    };
  }

  /** On-hand for an all-branches product, summed across the open sessions in the snapshot. */
  private universalOnHand(
    product: Product,
    snapshot: {
      entryQty: (productId: number, type: StockEntryType) => number;
      sold: Map<number, number>;
      produced: Map<number, number>;
    },
  ): number {
    const recorded = this.sessionStockOnHand(product.id, snapshot.entryQty, snapshot.sold);
    const produced =
      (snapshot.produced.get(product.id) || 0) +
      snapshot.entryQty(product.id, StockEntryType.ADJUSTMENT) -
      (snapshot.sold.get(product.id) || 0);
    return product.category === ProductCategory.PRODUCTION_ITEM ? Math.max(recorded, produced) : recorded;
  }

  /**
   * Products the till can sell right now. Branch-specific items must have quantity
   * in this session. All-branches items use stock from every open session, so a
   * cashier can sell soda recorded on the shop session.
   * Prepared branch items use production output minus sales. Everything else uses
   * opening + incoming, minus sales, wastage, byproduct sales, partner shares,
   * kitchen issues, and production use.
   */
  async getTillAvailability(sessionId: number, user: RequestUser) {
    const session = await this.stockSessionsService.findOne(sessionId);
    if (!this.isAdmin(user)) {
      if (!user.branchId || session.branchId !== user.branchId) {
        throw new ForbiddenException('You can only view stock for your branch');
      }
    }

    const products = await this.productsService.findActive();
    const sellable = products.filter((product) => {
      if (product.segment === ProductSegment.KITCHEN_SUPPLY) return false;
      if (this.isUniversal(product)) return true;
      const scope = product.branchScope;
      if (scope === BranchCatalogScope.GENERAL_BUTCHERY) {
        return session.branch?.type === BranchType.GENERAL_BUTCHERY;
      }
      if (scope === BranchCatalogScope.PORK_BUTCHERY) {
        return session.branch?.type === BranchType.PORK_BUTCHERY;
      }
      return false;
    });

    const entries = await this.stockEntriesService.findAll(sessionId);
    const soldByProduct = await this.sumSaleQuantities(sessionId);
    const producedByProduct = await this.sumProducedQuantities(sessionId);
    const openSessionIds = await this.openSessionIds();
    const pooledSessions = openSessionIds.includes(sessionId) ? openSessionIds : [...openSessionIds, sessionId];
    const pooledStock = await this.loadStockSnapshot(pooledSessions);

    const entryQty = (productId: number, type: StockEntryType) =>
      entries
        .filter((entry) => entry.productId === productId && entry.type === type)
        .reduce((sum, entry) => sum + Number(entry.quantity), 0);

    const rows = sellable
      .map((product) => {
        const available = this.isUniversal(product)
          ? this.universalOnHand(product, pooledStock)
          : product.category === ProductCategory.PRODUCTION_ITEM
            ? (producedByProduct.get(product.id) || 0) +
              entryQty(product.id, StockEntryType.ADJUSTMENT) -
              (soldByProduct.get(product.id) || 0)
            : this.sessionStockOnHand(product.parentProductId || product.id, entryQty, soldByProduct);
        return { product, available: Math.round(available * 1000) / 1000 };
      })
      .filter((row) => row.available > 0.0005)
      .sort((a, b) => a.product.name.localeCompare(b.product.name));

    return rows.map(({ product, available }) => ({
      id: product.id,
      name: product.name,
      unit: product.unit,
      defaultPrice: Number(product.defaultPrice),
      wholesalePrice: product.wholesalePrice != null ? Number(product.wholesalePrice) : null,
      saleMode: product.saleMode,
      category: product.category,
      segment: product.segment,
      salesPrompt: product.salesPrompt,
      parentProductId: product.parentProductId,
      available,
    }));
  }

  private sessionStockOnHand(
    productId: number,
    entryQty: (productId: number, type: StockEntryType) => number,
    soldByProduct: Map<number, number>,
  ): number {
    return (
      entryQty(productId, StockEntryType.OPENING) +
      entryQty(productId, StockEntryType.INCOMING) +
      entryQty(productId, StockEntryType.ADJUSTMENT) -
      (soldByProduct.get(productId) || 0) -
      entryQty(productId, StockEntryType.WASTAGE) -
      entryQty(productId, StockEntryType.BYPRODUCT_SALE) -
      entryQty(productId, StockEntryType.PARTNER_SHARE) -
      entryQty(productId, StockEntryType.KITCHEN_ISSUE) -
      entryQty(productId, StockEntryType.PRODUCTION_USAGE)
    );
  }

  private async sumSaleQuantities(sessionId: number): Promise<Map<number, number>> {
    const rows = await this.saleItemRepository
      .createQueryBuilder('item')
      .select('item.productId', 'productId')
      .addSelect('COALESCE(SUM(item.quantity), 0)', 'total')
      .innerJoin('item.sale', 'sale')
      .where('sale.sessionId = :sessionId', { sessionId })
      .groupBy('item.productId')
      .getRawMany();
    return this.rawQtyMap(rows);
  }

  private async sumProducedQuantities(sessionId: number): Promise<Map<number, number>> {
    const rows = await this.productionRunRepository
      .createQueryBuilder('run')
      .select('run.finishedProductId', 'productId')
      .addSelect('COALESCE(SUM(run.actualOutputQuantity - run.wastedQuantity), 0)', 'total')
      .where('run.sessionId = :sessionId', { sessionId })
      .groupBy('run.finishedProductId')
      .getRawMany();
    return this.rawQtyMap(rows);
  }

  private rawQtyMap(rows: Array<Record<string, unknown>>): Map<number, number> {
    const map = new Map<number, number>();
    for (const row of rows) {
      const id = Number(row.productId ?? row.productid);
      const total = Number(row.total ?? 0);
      if (Number.isFinite(id)) map.set(id, Number.isFinite(total) ? total : 0);
    }
    return map;
  }

  /** Per-session available qty for each active KITCHEN_SUPPLY product (same formula as getAvailableStock). */
  async getKitchenSupplyBalances(sessionId: number): Promise<
    Array<{ productId: number; name: string; unit: string; available: number }>
  > {
    await this.stockSessionsService.findOne(sessionId);
    const products = await this.productsService.findActive();
    const kitchen = products.filter((p) => p.segment === ProductSegment.KITCHEN_SUPPLY);
    const rows = await Promise.all(
      kitchen.map(async (p) => ({
        productId: p.id,
        name: p.name,
        unit: p.unit,
        available: await this.getAvailableStock(sessionId, p.id),
      })),
    );
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getProducedAvailableStock(sessionId: number, productId: number): Promise<number> {
    const producedResult = await this.productionRunRepository
      .createQueryBuilder('run')
      .select('COALESCE(SUM(run.actualOutputQuantity - run.wastedQuantity), 0)', 'total')
      .where('run.sessionId = :sessionId', { sessionId })
      .andWhere('run.finishedProductId = :productId', { productId })
      .getRawOne();

    const soldResult = await this.saleItemRepository
      .createQueryBuilder('item')
      .select('COALESCE(SUM(item.quantity), 0)', 'total')
      .innerJoin('item.sale', 'sale')
      .where('sale.sessionId = :sessionId', { sessionId })
      .andWhere('item.productId = :productId', { productId })
      .getRawOne();

    const adjustmentEntries = await this.stockEntriesService.findAll(sessionId, productId, StockEntryType.ADJUSTMENT);
    const adjustmentQty = adjustmentEntries.reduce((sum, entry) => sum + Number(entry.quantity), 0);

    return Number(producedResult?.total || 0) + adjustmentQty - Number(soldResult?.total || 0);
  }

  private assertRestaurantItemsMatchOrder(
    order: RestaurantOrder,
    items: { productId: number; quantity: number; unitPrice?: number }[],
  ): void {
    const lines = [...(order.lines || [])].sort((a, b) => a.productId - b.productId);
    const saleItems = [...items].sort((a, b) => a.productId - b.productId);
    if (lines.length !== saleItems.length) {
      throw new BadRequestException('Sale items do not match restaurant order lines');
    }
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const item = saleItems[i];
      if (line.productId !== item.productId || Math.abs(Number(line.quantity) - Number(item.quantity)) > 0.001) {
        throw new BadRequestException('Sale items do not match restaurant order lines');
      }
    }
  }
}

