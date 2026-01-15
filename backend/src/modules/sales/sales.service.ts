import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
import { StockEntryType } from '../stock-entries/entities/stock-entry.entity';
import { CustomersService } from '../customers/customers.service';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(SaleItem)
    private saleItemRepository: Repository<SaleItem>,
    @InjectRepository(SalePayment)
    private paymentRepository: Repository<SalePayment>,
    private dataSource: DataSource,
    private stockSessionsService: StockSessionsService,
    private productsService: ProductsService,
    private stockEntriesService: StockEntriesService,
    private customersService: CustomersService,
  ) {}

  async create(createSaleDto: CreateSaleDto, userId: number): Promise<Sale> {
    // Verify session exists and is open
    const session = await this.stockSessionsService.findOne(createSaleDto.sessionId);
    if (session.status !== SessionStatus.OPEN) {
      throw new BadRequestException('Cannot create sale for a closed session');
    }

    if (!createSaleDto.items || createSaleDto.items.length === 0) {
      throw new BadRequestException('Sale must have at least one item');
    }

    // Validate credit sales require customer
    if (createSaleDto.paymentMethod === PaymentMethod.CREDIT) {
      if (!createSaleDto.customerId) {
        throw new BadRequestException('Customer is required for credit sales');
      }
      const customer = await this.customersService.findOne(createSaleDto.customerId);
      if (customer.type !== 'CREDIT') {
        throw new BadRequestException('Customer must be a credit customer for credit sales');
      }
      // Check credit limit
      const outstandingBalance = await this.customersService.getOutstandingBalance(customer.id);
      if (customer.creditLimit && outstandingBalance >= customer.creditLimit) {
        throw new BadRequestException(`Customer has reached credit limit of ${customer.creditLimit}`);
      }
    }

    // Generate sale number
    const saleNumber = await this.generateSaleNumber();

    // Calculate totals and validate stock
    let totalAmount = 0;
    const itemsToCreate: Partial<SaleItem>[] = [];

    for (const itemDto of createSaleDto.items) {
      const product = await this.productsService.findOne(itemDto.productId);
      const unitPrice = itemDto.unitPrice || product.defaultPrice;
      const itemTotal = itemDto.quantity * unitPrice;
      totalAmount += itemTotal;

      // Check available stock
      const availableStock = await this.getAvailableStock(createSaleDto.sessionId, itemDto.productId);
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
    }

    // Create sale and items in a transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const sale = queryRunner.manager.create(Sale, {
        sessionId: createSaleDto.sessionId,
        saleNumber,
        totalAmount,
        customerId: createSaleDto.customerId || null,
        paymentMethod: createSaleDto.paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
        soldById: userId,
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

      await queryRunner.commitTransaction();

      // Return sale with items
      return await this.findOne(savedSale.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(sessionId?: number, date?: string): Promise<Sale[]> {
    const query = this.saleRepository.createQueryBuilder('sale')
      .leftJoinAndSelect('sale.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('sale.soldBy', 'soldBy')
      .leftJoinAndSelect('sale.session', 'session');

    if (sessionId) {
      query.where('sale.sessionId = :sessionId', { sessionId });
    }

    if (date) {
      query.andWhere('DATE(sale.soldAt) = :date', { date });
    }

    return await query.orderBy('sale.soldAt', 'DESC').getMany();
  }

  async findOne(id: number): Promise<Sale> {
    const sale = await this.saleRepository.findOne({
      where: { id },
      relations: ['items', 'items.product', 'soldBy', 'session', 'payment', 'payment.receivedBy'],
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }

    return sale;
  }

  async getPaymentForSale(saleId: number): Promise<SalePayment | null> {
    const sale = await this.findOne(saleId);
    return sale.payment || null;
  }

  async update(id: number, updateSaleDto: UpdateSaleDto, userId: number): Promise<Sale> {
    const sale = await this.findOne(id);

    if (sale.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Cannot update a paid sale');
    }

    // If updating items, need to recalculate
    // For now, just update payment method if provided
    if (updateSaleDto.paymentMethod) {
      sale.paymentMethod = updateSaleDto.paymentMethod;
    }

    return await this.saleRepository.save(sale);
  }

  async remove(id: number): Promise<void> {
    const sale = await this.findOne(id);

    if (sale.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Cannot delete a paid sale');
    }

    await this.saleRepository.remove(sale);
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

  private async getAvailableStock(sessionId: number, productId: number): Promise<number> {
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

    // Get wastage
    const wastageEntries = await this.stockEntriesService.findAll(sessionId, productId, StockEntryType.WASTAGE);
    const wastage = wastageEntries.reduce((sum, entry) => sum + Number(entry.quantity), 0);

    return openingStock + incomingStock - soldStock - wastage;
  }
}

