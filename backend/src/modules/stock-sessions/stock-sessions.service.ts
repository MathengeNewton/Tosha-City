import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockSession, SessionStatus } from './entities/stock-session.entity';
import { OpenSessionDto } from './dto/open-session.dto';
import { Sale, PaymentStatus } from '../sales/entities/sale.entity';
import { PaymentMethod } from '../sales/entities/payment.enums';
import { StockEntry, StockEntryType } from '../stock-entries/entities/stock-entry.entity';
import { ActivityLogService } from '../activity-log/activity-log.service';

@Injectable()
export class StockSessionsService {
  constructor(
    @InjectRepository(StockSession)
    private sessionRepository: Repository<StockSession>,
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(StockEntry)
    private stockEntryRepository: Repository<StockEntry>,
    private activityLog: ActivityLogService,
  ) {}

  async openSession(openSessionDto: OpenSessionDto, userId: number): Promise<StockSession> {
    try {
      const date = openSessionDto.date ? new Date(openSessionDto.date) : new Date();
      date.setHours(0, 0, 0, 0);

      const existingOpenSession = await this.sessionRepository.findOne({
        where: { date, status: SessionStatus.OPEN },
      });

      if (existingOpenSession) {
        throw new BadRequestException('An open session already exists for this date. Please close it first or use a different date.');
      }

      const session = this.sessionRepository.create({
        date,
        openedById: userId,
        status: SessionStatus.OPEN,
      });

      const saved = await this.sessionRepository.save(session);
      await this.activityLog.log({
        userId,
        action: 'SESSION_OPENED',
        entityType: 'stock_session',
        entityId: saved.id,
        details: { date: date.toISOString().slice(0, 10) },
        success: true,
      });
      return saved;
    } catch (e: any) {
      await this.activityLog.log({
        userId,
        action: 'SESSION_OPENED',
        entityType: 'stock_session',
        entityId: null,
        details: openSessionDto ? { date: openSessionDto.date } : null,
        success: false,
        errorMessage: e?.message ?? String(e),
      });
      throw e;
    }
  }

  async update(id: number, updateDto: { date?: string }, userId?: number): Promise<StockSession> {
    try {
      const session = await this.findOne(id);
      if (session.status !== SessionStatus.OPEN) {
        throw new BadRequestException('Only open sessions can be updated');
      }
      if (updateDto.date) {
        const newDate = new Date(updateDto.date);
        newDate.setHours(0, 0, 0, 0);
        const existingSameDate = await this.sessionRepository.findOne({
          where: { date: newDate, status: SessionStatus.OPEN },
        });
        if (existingSameDate && existingSameDate.id !== id) {
          throw new BadRequestException('An open session already exists for this date');
        }
        session.date = newDate;
      }
      const saved = await this.sessionRepository.save(session);
      await this.activityLog.log({
        userId: userId ?? null,
        action: 'SESSION_UPDATED',
        entityType: 'stock_session',
        entityId: id,
        details: updateDto,
        success: true,
      });
      return saved;
    } catch (e: any) {
      await this.activityLog.log({
        userId: userId ?? null,
        action: 'SESSION_UPDATED',
        entityType: 'stock_session',
        entityId: id,
        details: updateDto,
        success: false,
        errorMessage: e?.message ?? String(e),
      });
      throw e;
    }
  }

  async remove(id: number, userId?: number): Promise<void> {
    try {
      const session = await this.findOne(id);
      const entriesCount = await this.stockEntryRepository.count({ where: { sessionId: id } });
      const salesCount = await this.saleRepository.count({ where: { sessionId: id } });
      if (entriesCount > 0 || salesCount > 0) {
        throw new BadRequestException(
          `Cannot delete session: it has ${entriesCount} stock entries and ${salesCount} sales. Remove them first or close the session.`,
        );
      }
      await this.sessionRepository.remove(session);
      await this.activityLog.log({
        userId: userId ?? null,
        action: 'SESSION_DELETED',
        entityType: 'stock_session',
        entityId: id,
        details: { date: session.date },
        success: true,
      });
    } catch (e: any) {
      await this.activityLog.log({
        userId: userId ?? null,
        action: 'SESSION_DELETED',
        entityType: 'stock_session',
        entityId: id,
        success: false,
        errorMessage: e?.message ?? String(e),
      });
      throw e;
    }
  }

  async closeSession(id: number, userId: number): Promise<StockSession> {
    try {
      const session = await this.findOne(id);

      if (session.status === SessionStatus.CLOSED) {
        throw new BadRequestException('Session is already closed');
      }

      const unpaidNonCreditSales = await this.saleRepository.find({
        where: {
          sessionId: id,
          paymentStatus: PaymentStatus.PENDING,
        },
      });

      const unpaidCashMpesaSales = unpaidNonCreditSales.filter(
        sale => sale.paymentMethod !== PaymentMethod.CREDIT,
      );

      if (unpaidCashMpesaSales.length > 0) {
        throw new BadRequestException(
          `Cannot close session. There are ${unpaidCashMpesaSales.length} unpaid cash/mpesa sale(s). Please record payments for all non-credit sales before closing.`,
        );
      }

      session.status = SessionStatus.CLOSED;
      session.closedAt = new Date();

      const saved = await this.sessionRepository.save(session);
      await this.activityLog.log({
        userId,
        action: 'SESSION_CLOSED',
        entityType: 'stock_session',
        entityId: id,
        details: { date: session.date },
        success: true,
      });
      return saved;
    } catch (e: any) {
      await this.activityLog.log({
        userId,
        action: 'SESSION_CLOSED',
        entityType: 'stock_session',
        entityId: id,
        success: false,
        errorMessage: e?.message ?? String(e),
      });
      throw e;
    }
  }

  async findAll(): Promise<StockSession[]> {
    return await this.sessionRepository.find({
      relations: ['openedBy'],
      order: { date: 'DESC' },
    });
  }

  async findCurrent(): Promise<StockSession | null> {
    // Find the most recent open session (regardless of date)
    return await this.sessionRepository.findOne({
      where: { status: SessionStatus.OPEN },
      relations: ['openedBy'],
      order: { openedAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<StockSession> {
    const session = await this.sessionRepository.findOne({
      where: { id },
      relations: ['openedBy', 'stockEntries', 'sales'],
    });

    if (!session) {
      throw new NotFoundException(`Stock session with ID ${id} not found`);
    }

    return session;
  }

  async findByDate(date: Date): Promise<StockSession | null> {
    const sessionDate = new Date(date);
    sessionDate.setHours(0, 0, 0, 0);

    return await this.sessionRepository.findOne({
      where: { date: sessionDate },
      relations: ['openedBy', 'stockEntries', 'sales'],
    });
  }

  async findAllWithStats(
    dateFrom?: string,
    dateTo?: string,
    status?: SessionStatus,
  ): Promise<any[]> {
    const queryBuilder = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.openedBy', 'openedBy')
      .orderBy('session.date', 'DESC');

    // Apply filters
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      queryBuilder.andWhere('session.date >= :dateFrom', { dateFrom: fromDate });
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('session.date <= :dateTo', { dateTo: toDate });
    }

    if (status) {
      queryBuilder.andWhere('session.status = :status', { status });
    }

    const sessions = await queryBuilder.getMany();

    // Get statistics for each session
    const sessionsWithStats = await Promise.all(
      sessions.map(async (session) => {
        // Count opening stock entries
        const openingCount = await this.stockEntryRepository.count({
          where: {
            sessionId: session.id,
            type: StockEntryType.OPENING,
          },
        });

        // Count incoming stock entries
        const incomingCount = await this.stockEntryRepository.count({
          where: {
            sessionId: session.id,
            type: StockEntryType.INCOMING,
          },
        });

        // Count sales
        const salesCount = await this.saleRepository.count({
          where: {
            sessionId: session.id,
          },
        });

        // Calculate total revenue (sum of paid sales)
        const paidSales = await this.saleRepository.find({
          where: {
            sessionId: session.id,
            paymentStatus: PaymentStatus.PAID,
          },
        });

        const totalRevenue = paidSales.reduce(
          (sum, sale) => sum + parseFloat(sale.totalAmount.toString()),
          0,
        );

        return {
          ...session,
          stats: {
            openingStockCount: openingCount,
            incomingStockCount: incomingCount,
            salesCount,
            totalRevenue,
          },
        };
      }),
    );

    return sessionsWithStats;
  }
}

