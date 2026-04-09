import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Sale } from './entities/sale.entity';
import { PaymentStatus, PaymentMethod } from './entities/payment.enums';
import { SaleItem } from './entities/sale-item.entity';
import { SalePayment } from './entities/sale-payment.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { StockSessionsService } from '../stock-sessions/stock-sessions.service';
import { ProductsService } from '../products/products.service';
import { StockEntriesService } from '../stock-entries/stock-entries.service';
import { SessionStatus } from '../stock-sessions/entities/stock-session.entity';
import { StockEntry, StockEntryType } from '../stock-entries/entities/stock-entry.entity';
import { CustomersService } from '../customers/customers.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { UserRole } from '../roles/entities/role.entity';
import { ProductCategory } from '../products/entities/product.entity';
import { ProductionRun } from '../production/entities/production-run.entity';
import { RestaurantOrder, RestaurantOrderStatus } from '../restaurant-orders/entities/restaurant-order.entity';

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
    private stockEntriesService: StockEntriesService,
    private customersService: CustomersService,
    private activityLog: ActivityLogService,
  ) {}

  private isAdmin(user?: RequestUser): boolean {
    return (user?.roles || []).some((role) =>
      typeof role === 'string' ? role === UserRole.ADMIN : role?.name === UserRole.ADMIN,
    );
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
        throw new BadRequestException('Customer must be a credit customer for credit sales');
      }
      // Check credit limit
      const outstandingBalance = await this.customersService.getOutstandingBalance(customer.id);
      if (customer.creditLimit && outstandingBalance >= customer.creditLimit) {
        throw new BadRequestException(`Customer has reached credit limit of ${customer.creditLimit}`);
      }
    }

    const isWholesaleSale = customer?.type === 'WHOLESALE';

    // Calculate totals and validate stock
    let totalAmount = 0;
    const itemsToCreate: Partial<SaleItem>[] = [];
    const byproductStockEntries: Array<{ productId: number; quantity: number; unit: string }> = [];

    for (const itemDto of createSaleDto.items) {
      const product = await this.productsService.findOne(itemDto.productId);
      const unitPrice =
        itemDto.unitPrice ??
        (isWholesaleSale ? Number(product.wholesalePrice ?? product.defaultPrice) : Number(product.defaultPrice));
      const itemTotal = itemDto.quantity * unitPrice;
      totalAmount += itemTotal;

      // If this is a byproduct, check parent product stock instead
      const stockProductId = product.parentProductId || itemDto.productId;
      const stockProduct = product.parentProductId 
        ? await this.productsService.findOne(product.parentProductId)
        : product;

      const availableStock =
        product.category === ProductCategory.PRODUCTION_ITEM
          ? await this.getProducedAvailableStock(createSaleDto.sessionId, itemDto.productId)
          : await this.getAvailableStock(createSaleDto.sessionId, stockProductId);
      if (availableStock < itemDto.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${product.name}. Available: ${availableStock} ${product.unit}, Requested: ${itemDto.quantity} ${product.unit}`,
        );
      }

      itemsToCreate.push({
        productId: itemDto.productId,
        quantity: itemDto.quantity,
        unitPrice,
        totalPrice: itemTotal,
      });

      // If this is a byproduct, record it for stock deduction
      if (product.parentProductId) {
        byproductStockEntries.push({
          productId: product.parentProductId,
          quantity: itemDto.quantity,
          unit: stockProduct.unit,
        });
      }
    }

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

    if (dateFrom && dateTo) {
      query.andWhere('DATE(sale.soldAt) >= :dateFrom', { dateFrom });
      query.andWhere('DATE(sale.soldAt) <= :dateTo', { dateTo });
    } else if (date) {
      query.andWhere('DATE(sale.soldAt) = :date', { date });
    }

    if (branchId) {
      query.andWhere('sale.branchId = :branchId', { branchId });
    }

    return await query.orderBy('sale.soldAt', 'DESC').getMany();
  }

  async findOne(id: number, user?: RequestUser): Promise<Sale> {
    const sale = await this.saleRepository.findOne({
      where: { id },
      relations: ['items', 'items.product', 'soldBy', 'session', 'payment', 'payment.receivedBy', 'branch'],
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

    if (sale.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException('Receipt can only be generated for paid sales');
    }

    // Extract sale number (remove SALE-YYYY- prefix to get just the number)
    // Example: "SALE-2026-0001" -> "00001"
    const saleNumberMatch = sale.saleNumber.match(/(\d+)$/);
    const saleNumber = saleNumberMatch ? saleNumberMatch[1].padStart(5, '0') : sale.saleNumber;

    // Format date as DD/MM/YYYY HH:MM (24-hour format)
    const soldAt = new Date(sale.soldAt);
    const day = String(soldAt.getDate()).padStart(2, '0');
    const month = String(soldAt.getMonth() + 1).padStart(2, '0');
    const year = soldAt.getFullYear();
    const hours = String(soldAt.getHours()).padStart(2, '0');
    const minutes = String(soldAt.getMinutes()).padStart(2, '0');
    const dateTimeStr = `${day}/${month}/${year} ${hours}:${minutes}`;

    // Build receipt lines
    const lines: string[] = [];
    
    // Header
    lines.push('LAKE TOWN BUTCHERY');
    lines.push('----------------------------');
    lines.push(`SALE #${saleNumber}`);
    lines.push(dateTimeStr);
    lines.push('');

    // Items
    if (sale.items && sale.items.length > 0) {
      sale.items.forEach((item) => {
        const productName = item.product?.name || 'N/A';
        const quantity = parseFloat(item.quantity.toString());
        const unit = item.product?.unit || 'kg';
        const unitPrice = parseFloat(item.unitPrice?.toString() || '0');
        const totalPrice = parseFloat(item.totalPrice?.toString() || (quantity * unitPrice).toString());
        
        // Format: "Beef 0.10kg      152.00"
        // Target width: 28 characters total
        const namePart = `${productName} ${quantity.toFixed(2)}${unit}`;
        const pricePart = totalPrice.toFixed(2);
        const targetWidth = 28;
        const padding = ' '.repeat(Math.max(1, targetWidth - namePart.length - pricePart.length));
        lines.push(`${namePart}${padding}${pricePart}`);
      });
    }

    // Separator
    lines.push('----------------------------');

    // Total - format: "TOTAL            152.00"
    const totalAmount = parseFloat(sale.totalAmount.toString());
    const totalLabel = 'TOTAL';
    const totalPriceStr = totalAmount.toFixed(2);
    const totalPadding = ' '.repeat(28 - totalLabel.length - totalPriceStr.length);
    lines.push(`${totalLabel}${totalPadding}${totalPriceStr}`);

    // Payment method
    const paymentMethod = sale.paymentMethod || 'CASH';
    lines.push(`PAYMENT: ${paymentMethod}`);

    // MPESA reference if applicable
    if (sale.payment && sale.payment.method === 'MPESA' && sale.payment.mpesaReference) {
      lines.push(`MPESA REF: ${sale.payment.mpesaReference}`);
    }

    // Footer
    lines.push('');
    lines.push('THANK YOU');

    return lines.join('\n');
  }

  async update(id: number, updateSaleDto: UpdateSaleDto, userId: number, user?: RequestUser): Promise<Sale> {
    try {
      const sale = await this.findOne(id, user);

      if (sale.paymentStatus === PaymentStatus.PAID) {
        throw new BadRequestException('Cannot update a paid sale');
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

      await this.saleRepository.remove(sale);
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

    return openingStock + incomingStock - soldStock - wastage - byproductSaleQty - partnerShareQty;
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

    return Number(producedResult?.total || 0) - Number(soldResult?.total || 0);
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

