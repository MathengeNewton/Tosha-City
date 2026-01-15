import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockEntry, StockEntryType } from './entities/stock-entry.entity';
import { CreateStockEntryDto } from './dto/create-stock-entry.dto';
import { UpdateStockEntryDto } from './dto/update-stock-entry.dto';
import { StockSessionsService } from '../stock-sessions/stock-sessions.service';
import { SessionStatus } from '../stock-sessions/entities/stock-session.entity';
import { SuppliersService } from '../suppliers/suppliers.service';

@Injectable()
export class StockEntriesService {
  constructor(
    @InjectRepository(StockEntry)
    private entryRepository: Repository<StockEntry>,
    private stockSessionsService: StockSessionsService,
    private suppliersService: SuppliersService,
  ) {}

  async create(createEntryDto: CreateStockEntryDto, userId: number): Promise<StockEntry> {
    // Verify session exists and is open (for opening/incoming entries)
    const session = await this.stockSessionsService.findOne(createEntryDto.sessionId);

    if (createEntryDto.type === StockEntryType.OPENING || createEntryDto.type === StockEntryType.INCOMING) {
      if (session.status !== SessionStatus.OPEN) {
        throw new BadRequestException('Cannot add opening/incoming stock to a closed session');
      }
    }

    if (createEntryDto.type === StockEntryType.CLOSING || createEntryDto.type === StockEntryType.WASTAGE) {
      if (session.status !== SessionStatus.OPEN) {
        throw new BadRequestException('Cannot add closing/wastage stock to a closed session');
      }
    }

    // Validate supplier for incoming stock
    if (createEntryDto.type === StockEntryType.INCOMING) {
      if (!createEntryDto.supplierId) {
        throw new BadRequestException('Supplier is required for incoming stock');
      }
      await this.suppliersService.findOne(createEntryDto.supplierId);
    }

    const entry = this.entryRepository.create({
      ...createEntryDto,
      recordedById: userId,
    });

    return await this.entryRepository.save(entry);
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
    const entry = await this.findOne(id);

    // Check if session is closed
    const session = await this.stockSessionsService.findOne(entry.sessionId);
    if (session.status === SessionStatus.CLOSED) {
      throw new BadRequestException('Cannot update stock entry in a closed session');
    }

    Object.assign(entry, updateEntryDto);
    return await this.entryRepository.save(entry);
  }

  async remove(id: number): Promise<void> {
    const entry = await this.findOne(id);

    // Check if session is closed
    const session = await this.stockSessionsService.findOne(entry.sessionId);
    if (session.status === SessionStatus.CLOSED) {
      throw new BadRequestException('Cannot delete stock entry in a closed session');
    }

    await this.entryRepository.remove(entry);
  }
}

