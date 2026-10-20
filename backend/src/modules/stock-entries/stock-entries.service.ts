import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
  ) {}

  async create(
    createEntryDto: CreateStockEntryDto,
    userId: number,
    options: { partnerId?: number } = {},
  ): Promise<StockEntry> {
    if (createEntryDto.type === StockEntryType.BYPRODUCT_SALE) {
      throw new BadRequestException('BYPRODUCT_SALE entries are created automatically by the system.');
    }
    // Verify session exists and is open (for opening/incoming entries)
    const session = await this.stockSessionsService.findOne(createEntryDto.sessionId);

    if (createEntryDto.type === StockEntryType.OPENING || createEntryDto.type === StockEntryType.INCOMING) {
      if (session.status !== SessionStatus.OPEN) {
        throw new BadRequestException('Cannot add opening/incoming stock to a closed session');
      }
    }

    if (
      createEntryDto.type === StockEntryType.CLOSING ||
      createEntryDto.type === StockEntryType.PARTNER_SHARE
    ) {
      if (session.status !== SessionStatus.OPEN) {
        throw new BadRequestException('Cannot add closing or partner share to a closed session');
      }
    }
    // WASTAGE: allowed on OPEN or CLOSED (record after session close when needed).

    // Validate supplier for incoming stock (stock received from a partner carries the partner instead)
    if (createEntryDto.type === StockEntryType.INCOMING && !options.partnerId) {
      if (!createEntryDto.supplierId) {
        throw new BadRequestException('Supplier is required for incoming stock');
      }
      await this.suppliersService.findOne(createEntryDto.supplierId);
    }

    try {
      const entry = this.entryRepository.create({
        ...createEntryDto,
        partnerId: options.partnerId ?? null,
        recordedById: userId,
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
      .leftJoinAndSelect('entry.supplier', 'supplier')
      .leftJoinAndSelect('entry.partner', 'partner');

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
      relations: ['product', 'session', 'recordedBy', 'supplier', 'partner'],
    });

    if (!entry) {
      throw new NotFoundException(`Stock entry with ID ${id} not found`);
    }

    return entry;
  }

  async update(id: number, updateEntryDto: UpdateStockEntryDto, userId: number): Promise<StockEntry> {
    try {
      const entry = await this.findOne(id);

      if (updateEntryDto.type != null && updateEntryDto.type !== entry.type) {
        throw new BadRequestException('Cannot change stock entry type');
      }

      if (entry.partnerId != null) {
        throw new BadRequestException('This entry was recorded through Stock Share and cannot be edited here.');
      }

      const session = await this.stockSessionsService.findOne(entry.sessionId);
      const isWastage = entry.type === StockEntryType.WASTAGE;

      if (!isWastage && session.status === SessionStatus.CLOSED) {
        throw new BadRequestException('Cannot update stock entry in a closed session');
      }

      const salesCount = await this.saleRepository.count({ where: { sessionId: entry.sessionId } });
      if (!isWastage && salesCount > 0) {
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

  /** Only StockShareService may call this; it has already validated session status and stock levels. */
  async syncStockShareEntry(
    id: number,
    changes: Pick<StockEntry, 'type' | 'productId' | 'quantity' | 'unit' | 'notes' | 'partnerId'>,
    userId: number,
  ): Promise<StockEntry> {
    const entry = await this.findOne(id);
    await this.entryRepository.update(id, changes);
    await this.activityLog.log({
      userId,
      action: 'STOCK_ENTRY_UPDATED',
      entityType: 'stock_entry',
      entityId: id,
      details: { sessionId: entry.sessionId, source: 'stock_share', from: entry.type, ...changes },
      success: true,
    });
    return this.findOne(id);
  }

  async remove(id: number, userId?: number): Promise<void> {
    try {
      const entry = await this.findOne(id);

      if (entry.partnerId != null) {
        throw new BadRequestException('This entry was recorded through Stock Share and cannot be deleted here.');
      }

      const session = await this.stockSessionsService.findOne(entry.sessionId);
      const isWastage = entry.type === StockEntryType.WASTAGE;

      if (!isWastage && session.status === SessionStatus.CLOSED) {
        throw new BadRequestException('Cannot delete stock entry in a closed session');
      }

      const salesCount = await this.saleRepository.count({ where: { sessionId: entry.sessionId } });
      if (!isWastage && salesCount > 0) {
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

