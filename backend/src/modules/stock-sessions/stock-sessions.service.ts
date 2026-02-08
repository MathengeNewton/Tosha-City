import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockSession, SessionStatus } from './entities/stock-session.entity';
import { OpenSessionDto } from './dto/open-session.dto';
import { Sale, PaymentStatus } from '../sales/entities/sale.entity';
import { PaymentMethod } from '../sales/entities/payment.enums';
import { StockEntry, StockEntryType } from '../stock-entries/entities/stock-entry.entity';

@Injectable()
export class StockSessionsService {
  constructor(
    @InjectRepository(StockSession)
    private sessionRepository: Repository<StockSession>,
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(StockEntry)
    private stockEntryRepository: Repository<StockEntry>,
  ) {}

  async openSession(openSessionDto: OpenSessionDto, userId: number): Promise<StockSession> {
    const date = openSessionDto.date ? new Date(openSessionDto.date) : new Date();
    // Set time to start of day
    date.setHours(0, 0, 0, 0);

    // Only check if there's an OPEN session - allow multiple sessions per day
    // Only prevent opening if there's already an open session
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

    return await this.sessionRepository.save(session);
  }

  async closeSession(id: number, userId: number): Promise<StockSession> {
    const session = await this.findOne(id);

    if (session.status === SessionStatus.CLOSED) {
      throw new BadRequestException('Session is already closed');
    }

          // Check if there are unpaid cash/mpesa sales (credit sales can remain unpaid)
          const unpaidNonCreditSales = await this.saleRepository.find({
            where: {
              sessionId: id,
              paymentStatus: PaymentStatus.PENDING,
            },
          });

          // Filter out credit sales
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

    return await this.sessionRepository.save(session);
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

