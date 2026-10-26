import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockEntry, StockEntryType } from './entities/stock-entry.entity';
import { CreateStockEntryDto } from './dto/create-stock-entry.dto';
import { UpdateStockEntryDto } from './dto/update-stock-entry.dto';
import { StockSessionsService } from '../stock-sessions/stock-sessions.service';
import { SessionStatus } from '../stock-sessions/entities/stock-session.entity';
import { SuppliersService } from '../suppliers/suppliers.service';
import { Sale } from '../sales/entities/sale.entity';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { ProductsService } from '../products/products.service';
import { ProductSegment } from '../products/entities/product.entity';
import { SalesService } from '../sales/sales.service';

@Injectable()
export class StockEntriesService {
  constructor(
    @InjectRepository(StockEntry)
    private entryRepository: Repository<StockEntry>,
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    private stockSessionsService: StockSessionsService,
    private suppliersService: SuppliersService,
    private activityLog: ActivityLogService,
    private productsService: ProductsService,
    @Inject(forwardRef(() => SalesService))
    private salesService: SalesService,
  ) {}

  async create(createEntryDto: CreateStockEntryDto, userId: number, isAdmin = false): Promise<StockEntry> {
    if (
      createEntryDto.type === StockEntryType.BYPRODUCT_SALE ||
      createEntryDto.type === StockEntryType.PRODUCTION_USAGE
    ) {
      throw new BadRequestException(`${createEntryDto.type} entries are created automatically by the system.`);
    }
    // Verify session exists and is open (for opening/incoming entries)
    const session = await this.stockSessionsService.findOne(createEntryDto.sessionId);

    const quantity = Number(createEntryDto.quantity);
    if (createEntryDto.type === StockEntryType.ADJUSTMENT) {
      if (!isAdmin) {
        throw new ForbiddenException('Only an admin can adjust stock');
      }
      if (session.status !== SessionStatus.OPEN) {
        throw new BadRequestException('Cannot adjust stock in a closed session');
      }
      if (!Number.isFinite(quantity) || quantity === 0) {
        throw new BadRequestException('Adjustment quantity must be a non-zero number');
      }
      if (!createEntryDto.notes?.trim()) {
        throw new BadRequestException('Give a reason for the stock adjustment');
      }
    } else if (!Number.isFinite(quantity) || quantity < 0) {
      throw new BadRequestException('Quantity cannot be negative');
    }

    if (createEntryDto.type === StockEntryType.WASTAGE && !isAdmin && !createEntryDto.photoUrl) {
      throw new BadRequestException('Photo evidence is required for wastage entries');
    }

    if (createEntryDto.type === StockEntryType.OPENING || createEntryDto.type === StockEntryType.INCOMING) {
      if (session.status !== SessionStatus.OPEN) {
        throw new BadRequestException('Cannot add opening/incoming stock to a closed session');
      }
    }

    if (
      createEntryDto.type === StockEntryType.CLOSING ||
      createEntryDto.type === StockEntryType.WASTAGE ||
      createEntryDto.type === StockEntryType.PARTNER_SHARE ||
      createEntryDto.type === StockEntryType.KITCHEN_ISSUE
    ) {
      if (session.status !== SessionStatus.OPEN) {
        throw new BadRequestException('Cannot add closing/wastage/partner share/kitchen issue to a closed session');
      }
    }

    if (createEntryDto.type === StockEntryType.INCOMING && createEntryDto.supplierId != null) {
      await this.suppliersService.findOne(createEntryDto.supplierId);
    }

    if (createEntryDto.type === StockEntryType.KITCHEN_ISSUE) {
      const product = await this.productsService.findOne(createEntryDto.productId);
      if (product.segment !== ProductSegment.KITCHEN_SUPPLY) {
        throw new BadRequestException(
          'Kitchen issues are only for Kitchen inputs products (segment KITCHEN_SUPPLY).',
        );
      }
      const qty = Number(createEntryDto.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new BadRequestException('Quantity must be greater than 0');
      }
      const available = await this.salesService.getAvailableStock(
        createEntryDto.sessionId,
        createEntryDto.productId,
      );
      if (qty > available + 1e-6) {
        throw new BadRequestException(
          `Cannot issue ${qty} ${product.unit}: only ${available} ${product.unit} available in this session`,
        );
      }
    }

    try {
      const entry = this.entryRepository.create({
        ...createEntryDto,
        notes: createEntryDto.notes?.trim() || null,
        recordedById: userId,
        saleId: null,
      });

      const saved = await this.entryRepository.save(entry);
      await this.activityLog.log({
        userId,
        action: 'STOCK_ENTRY_CREATED',
        entityType: 'stock_entry',
        entityId: saved.id,
        details: { sessionId: createEntryDto.sessionId, type: createEntryDto.type, productId: createEntryDto.productId, quantity: createEntryDto.quantity },
        success: true,
      });
      return saved;
    } catch (e: any) {
      await this.activityLog.log({
        userId,
        action: 'STOCK_ENTRY_CREATED',
        entityType: 'stock_entry',
        entityId: null,
        details: { sessionId: createEntryDto.sessionId, type: createEntryDto.type },
        success: false,
        errorMessage: e?.message ?? String(e),
      });
      throw e;
    }
  }

  async findAll(sessionId?: number, productId?: number, type?: StockEntryType): Promise<StockEntry[]> {
    const query = this.entryRepository.createQueryBuilder('entry')
      .leftJoinAndSelect('entry.product', 'product')
      .leftJoinAndSelect('entry.recordedBy', 'recordedBy')
      .leftJoinAndSelect('entry.session', 'session')
      .leftJoinAndSelect('entry.supplier', 'supplier');

    if (sessionId) {
      query.where('entry.sessionId = :sessionId', { sessionId });
    }

    if (productId) {
      query.andWhere('entry.productId = :productId', { productId });
    }

    if (type) {
      query.andWhere('entry.type = :type', { type });
    }

    return await query.orderBy('entry.recordedAt', 'DESC').getMany();
  }

  async findOne(id: number): Promise<StockEntry> {
    const entry = await this.entryRepository.findOne({
      where: { id },
      relations: ['product', 'session', 'recordedBy', 'supplier'],
    });

    if (!entry) {
      throw new NotFoundException(`Stock entry with ID ${id} not found`);
    }

    return entry;
  }

  async update(id: number, updateEntryDto: UpdateStockEntryDto, userId: number): Promise<StockEntry> {
    try {
      const entry = await this.findOne(id);

      const session = await this.stockSessionsService.findOne(entry.sessionId);
      if (session.status === SessionStatus.CLOSED) {
        throw new BadRequestException('Cannot update stock entry in a closed session');
      }

      const salesCount = await this.saleRepository.count({ where: { sessionId: entry.sessionId } });
      if (salesCount > 0) {
        throw new BadRequestException(
          'Cannot edit stock entries when this session has sales. Adjust or remove sales first.',
        );
      }

      Object.assign(entry, updateEntryDto);
      const saved = await this.entryRepository.save(entry);
      await this.activityLog.log({
        userId,
        action: 'STOCK_ENTRY_UPDATED',
        entityType: 'stock_entry',
        entityId: id,
        details: { sessionId: entry.sessionId, type: entry.type, ...updateEntryDto },
        success: true,
      });
      return saved;
    } catch (e: any) {
      await this.activityLog.log({
        userId,
        action: 'STOCK_ENTRY_UPDATED',
        entityType: 'stock_entry',
        entityId: id,
        details: updateEntryDto as any,
        success: false,
        errorMessage: e?.message ?? String(e),
      });
      throw e;
    }
  }

  async remove(id: number, userId?: number): Promise<void> {
    try {
      const entry = await this.findOne(id);

      const session = await this.stockSessionsService.findOne(entry.sessionId);
      if (session.status === SessionStatus.CLOSED) {
        throw new BadRequestException('Cannot delete stock entry in a closed session');
      }

      const salesCount = await this.saleRepository.count({ where: { sessionId: entry.sessionId } });
      if (salesCount > 0) {
        throw new BadRequestException(
          'Cannot delete stock entries when this session has sales. Adjust or remove sales first.',
        );
      }

      await this.entryRepository.remove(entry);
      await this.activityLog.log({
        userId: userId ?? null,
        action: 'STOCK_ENTRY_DELETED',
        entityType: 'stock_entry',
        entityId: id,
        details: { sessionId: entry.sessionId, type: entry.type },
        success: true,
      });
    } catch (e: any) {
      await this.activityLog.log({
        userId: userId ?? null,
        action: 'STOCK_ENTRY_DELETED',
        entityType: 'stock_entry',
        entityId: id,
        success: false,
        errorMessage: e?.message ?? String(e),
      });
      throw e;
    }
  }
}

