import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockShare, ShareDirection } from './entities/stock-share.entity';
import { CreateStockShareDto } from './dto/create-stock-share.dto';
import { UpdateStockShareDto } from './dto/update-stock-share.dto';
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
    const direction = dto.direction ?? ShareDirection.OUTGOING;
    const partner = await this.partnersService.findOne(dto.partnerId);
    const product = await this.productsService.findOne(dto.productId);

    if (direction === ShareDirection.INCOMING && !dto.sessionId) {
      throw new BadRequestException(
        'Open a stock session before recording meat received from a partner, so it can be logged as incoming stock.',
      );
    }

    let stockEntryId: number | null = null;
    if (dto.sessionId) {
      const session = await this.stockSessionsService.findOne(dto.sessionId);
      if (session.status !== SessionStatus.OPEN) {
        throw new BadRequestException('Cannot record a stock share for a closed session');
      }

      if (direction === ShareDirection.INCOMING) {
        const entry = await this.stockEntriesService.create(
          {
            sessionId: dto.sessionId,
            productId: dto.productId,
            type: StockEntryType.INCOMING,
            quantity: dto.quantity,
            unit: dto.unit,
            notes: this.entryNotes(direction, partner.name, dto.notes),
          },
          userId,
          { partnerId: partner.id },
        );
        stockEntryId = entry.id;
      } else {
        const available = await this.salesService.getAvailableStock(dto.sessionId, dto.productId);
        if (available < dto.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name}. Available: ${available} ${product.unit}, Requested: ${dto.quantity} ${dto.unit}`,
          );
        }
        const entry = await this.stockEntriesService.create(
          {
            sessionId: dto.sessionId,
            productId: dto.productId,
            type: StockEntryType.PARTNER_SHARE,
            quantity: dto.quantity,
            unit: dto.unit,
            notes: this.entryNotes(direction, partner.name, dto.notes),
          },
          userId,
        );
        stockEntryId = entry.id;
      }
    }

    const share = this.stockShareRepository.create({
      direction,
      partnerId: dto.partnerId,
      productId: dto.productId,
      sessionId: dto.sessionId ?? null,
      stockEntryId,
      quantity: dto.quantity,
      unit: dto.unit,
      notes: dto.notes ?? null,
      recordedById: userId,
      paid: false,
    });
    return await this.stockShareRepository.save(share);
  }

  async update(id: number, dto: UpdateStockShareDto, userId: number): Promise<StockShare> {
    const share = await this.findOne(id);
    const next = {
      direction: dto.direction ?? share.direction,
      partnerId: dto.partnerId ?? share.partnerId,
      productId: dto.productId ?? share.productId,
      quantity: dto.quantity ?? Number(share.quantity),
      unit: dto.unit ?? share.unit,
      notes: dto.notes !== undefined ? dto.notes.trim() || null : share.notes,
    };
    const partner = await this.partnersService.findOne(next.partnerId);
    await this.productsService.findOne(next.productId);

    const stockChanged =
      next.direction !== share.direction ||
      next.productId !== share.productId ||
      next.quantity !== Number(share.quantity);

    if (!share.sessionId) {
      if (next.direction === ShareDirection.INCOMING) {
        throw new BadRequestException(
          'This share has no stock session, so it cannot be changed to received. Record a new received share instead.',
        );
      }
    } else if (stockChanged) {
      const session = await this.stockSessionsService.findOne(share.sessionId);
      if (session.status !== SessionStatus.OPEN) {
        throw new BadRequestException(
          'This share belongs to a closed session. Only the partner and notes can be changed.',
        );
      }
      if (!share.stockEntryId) {
        throw new BadRequestException(
          'This share was recorded before stock links were tracked. Only the partner and notes can be changed.',
        );
      }
      await this.assertStockAfterEdit(share, next);
    }

    if (share.stockEntryId) {
      await this.stockEntriesService.syncStockShareEntry(
        share.stockEntryId,
        {
          type: next.direction === ShareDirection.INCOMING ? StockEntryType.INCOMING : StockEntryType.PARTNER_SHARE,
          productId: next.productId,
          quantity: next.quantity,
          unit: next.unit,
          notes: this.entryNotes(next.direction, partner.name, next.notes),
          partnerId: next.direction === ShareDirection.INCOMING ? partner.id : null,
        },
        userId,
      );
    }

    await this.stockShareRepository.update(id, next);
    return this.findOne(id);
  }

  /** Rejects edits that would push a product's available session stock below zero. */
  private async assertStockAfterEdit(
    share: StockShare,
    next: { direction: ShareDirection; productId: number; quantity: number },
  ): Promise<void> {
    const effect = (direction: ShareDirection, qty: number) =>
      direction === ShareDirection.INCOMING ? qty : -qty;

    for (const productId of new Set([share.productId, next.productId])) {
      let delta = 0;
      if (productId === share.productId) delta -= effect(share.direction, Number(share.quantity));
      if (productId === next.productId) delta += effect(next.direction, next.quantity);
      if (delta >= 0) continue;

      const available = await this.salesService.getAvailableStock(share.sessionId!, productId);
      if (available + delta < -0.0001) {
        const product = await this.productsService.findOne(productId);
        throw new BadRequestException(
          `Not enough ${product.name} in stock for this change. Available: ${available} ${product.unit}, change needs: ${-delta} ${product.unit}`,
        );
      }
    }
  }

  private entryNotes(direction: ShareDirection, partnerName: string, notes?: string | null): string {
    if (direction === ShareDirection.INCOMING) {
      return notes ? `Received from partner ${partnerName}: ${notes}` : `Received from partner ${partnerName}`;
    }
    return notes ? `Partner share: ${notes}` : 'Stock share with partner';
  }

  async findAll(
    partnerId?: number,
    paid?: boolean,
    sessionId?: number,
    direction?: ShareDirection,
  ): Promise<StockShare[]> {
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
    if (direction) {
      query.andWhere('share.direction = :direction', { direction });
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
