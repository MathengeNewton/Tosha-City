import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockShare } from './entities/stock-share.entity';
import { CreateStockShareDto } from './dto/create-stock-share.dto';
import { PartnersService } from '../partners/partners.service';
import { ProductsService } from '../products/products.service';
import { StockSessionsService } from '../stock-sessions/stock-sessions.service';
import { StockEntriesService } from '../stock-entries/stock-entries.service';
import { SalesService } from '../sales/sales.service';
import { StockEntryType } from '../stock-entries/entities/stock-entry.entity';
import { SessionStatus } from '../stock-sessions/entities/stock-session.entity';

@Injectable()
export class StockShareService {
  constructor(
    @InjectRepository(StockShare)
    private stockShareRepository: Repository<StockShare>,
    private partnersService: PartnersService,
    private productsService: ProductsService,
    private stockSessionsService: StockSessionsService,
    private stockEntriesService: StockEntriesService,
    private salesService: SalesService,
  ) {}

  async create(dto: CreateStockShareDto, userId: number): Promise<StockShare> {
    await this.partnersService.findOne(dto.partnerId);
    const product = await this.productsService.findOne(dto.productId);

    if (dto.sessionId) {
      const session = await this.stockSessionsService.findOne(dto.sessionId);
      if (session.status !== SessionStatus.OPEN) {
        throw new BadRequestException('Cannot record a stock share for a closed session');
      }
      const available = await this.salesService.getAvailableStock(dto.sessionId, dto.productId);
      if (available < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${product.name}. Available: ${available} ${product.unit}, Requested: ${dto.quantity} ${dto.unit}`,
        );
      }
      await this.stockEntriesService.create(
        {
          sessionId: dto.sessionId,
          productId: dto.productId,
          type: StockEntryType.PARTNER_SHARE,
          quantity: dto.quantity,
          unit: dto.unit,
          notes: dto.notes ? `Partner share: ${dto.notes}` : 'Stock share with partner',
        },
        userId,
      );
    }

    const share = this.stockShareRepository.create({
      partnerId: dto.partnerId,
      productId: dto.productId,
      sessionId: dto.sessionId ?? null,
      quantity: dto.quantity,
      unit: dto.unit,
      notes: dto.notes ?? null,
      recordedById: userId,
      paid: false,
    });
    return await this.stockShareRepository.save(share);
  }

  async findAll(partnerId?: number, paid?: boolean, sessionId?: number): Promise<StockShare[]> {
    const query = this.stockShareRepository
      .createQueryBuilder('share')
      .leftJoinAndSelect('share.partner', 'partner')
      .leftJoinAndSelect('share.product', 'product')
      .leftJoinAndSelect('share.session', 'session')
      .leftJoinAndSelect('share.recordedBy', 'recordedBy')
      .orderBy('share.recordedAt', 'DESC');
    if (partnerId != null) {
      query.andWhere('share.partnerId = :partnerId', { partnerId });
    }
    if (typeof paid === 'boolean') {
      query.andWhere('share.paid = :paid', { paid });
    }
    if (sessionId != null) {
      query.andWhere('share.sessionId = :sessionId', { sessionId });
    }
    return query.getMany();
  }

  async findOne(id: number): Promise<StockShare> {
    const share = await this.stockShareRepository.findOne({
      where: { id },
      relations: ['partner', 'product', 'session', 'recordedBy'],
    });
    if (!share) {
      throw new NotFoundException(`Stock share with ID ${id} not found`);
    }
    return share;
  }

  async markPaid(id: number): Promise<StockShare> {
    const share = await this.findOne(id);
    share.paid = true;
    share.paidAt = new Date();
    return await this.stockShareRepository.save(share);
  }
}
