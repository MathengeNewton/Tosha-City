import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockSession, SessionStatus } from './entities/stock-session.entity';
import { OpenSessionDto } from './dto/open-session.dto';
import { Sale, PaymentStatus } from '../sales/entities/sale.entity';
import { PaymentMethod } from '../sales/entities/payment.enums';
import { StockEntry, StockEntryType } from '../stock-entries/entities/stock-entry.entity';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { Branch } from '../branches/entities/branch.entity';
import { UserRole } from '../roles/entities/role.entity';

type RequestUser = {
  userId: number;
  roles?: Array<{ name?: string } | string>;
  branchId?: number | null;
};

@Injectable()
export class StockSessionsService {
  constructor(
    @InjectRepository(StockSession)
    private sessionRepository: Repository<StockSession>,
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(StockEntry)
    private stockEntryRepository: Repository<StockEntry>,
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
    private activityLog: ActivityLogService,
  ) {}

  private isAdmin(user?: RequestUser): boolean {
    return (user?.roles || []).some((role) =>
      typeof role === 'string' ? role === UserRole.ADMIN : role?.name === UserRole.ADMIN,
    );
  }

  private async resolveBranchId(user: RequestUser, requestedBranchId?: number): Promise<number> {
    if (this.isAdmin(user)) {
      const branchId = requestedBranchId ?? user.branchId ?? null;
      if (!branchId) {
        throw new BadRequestException('Branch is required for this operation');
      }
      await this.ensureBranchExists(branchId);
      return branchId;
    }

    if (!user.branchId) {
      throw new BadRequestException('Your account is not assigned to a branch');
    }

    if (requestedBranchId && requestedBranchId !== user.branchId) {
      throw new BadRequestException('You can only access records for your assigned branch');
    }

    await this.ensureBranchExists(user.branchId);
    return user.branchId;
  }

  private async ensureBranchExists(branchId: number): Promise<void> {
    const branch = await this.branchRepository.findOne({ where: { id: branchId } });
    if (!branch) {
      throw new BadRequestException('Branch not found');
    }
  }

  async openSession(openSessionDto: OpenSessionDto, user: RequestUser): Promise<StockSession> {
    try {
      const date = openSessionDto.date ? new Date(openSessionDto.date) : new Date();
      date.setHours(0, 0, 0, 0);
      const branchId = await this.resolveBranchId(user, openSessionDto.branchId);

      const existingOpenSession = await this.sessionRepository.findOne({
        where: { date, status: SessionStatus.OPEN, branchId },
      });

      if (existingOpenSession) {
        throw new BadRequestException('An open session already exists for this date. Please close it first or use a different date.');
      }

      const session = this.sessionRepository.create({
        date,
        branchId,
        openedById: user.userId,
        status: SessionStatus.OPEN,
      });

      const saved = await this.sessionRepository.save(session);
      await this.activityLog.log({
        userId: user.userId,
        action: 'SESSION_OPENED',
        entityType: 'stock_session',
        entityId: saved.id,
        details: { date: date.toISOString().slice(0, 10), branchId },
        success: true,
      });
      return saved;
    } catch (e: any) {
      await this.activityLog.log({
        userId: user.userId,
        action: 'SESSION_OPENED',
        entityType: 'stock_session',
        entityId: null,
        details: openSessionDto ? { date: openSessionDto.date, branchId: openSessionDto.branchId } : null,
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
          where: { date: newDate, status: SessionStatus.OPEN, branchId: session.branchId },
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

  async closeSession(id: number, user: RequestUser): Promise<StockSession> {
    try {
      const scopedBranchId = this.isAdmin(user)
        ? undefined
        : await this.resolveBranchId(user, undefined);
      const session = await this.findOne(id, scopedBranchId);

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
          `Cannot close session. There are ${unpaidCashMpesaSales.length} unpaid cash, M-Pesa or card sale(s). Please record payments for all non-credit sales before closing.`,
        );
      }

      session.status = SessionStatus.CLOSED;
      session.closedAt = new Date();

      const saved = await this.sessionRepository.save(session);
      await this.activityLog.log({
        userId: user.userId,
        action: 'SESSION_CLOSED',
        entityType: 'stock_session',
        entityId: id,
        details: { date: session.date },
        success: true,
      });
      return saved;
    } catch (e: any) {
      await this.activityLog.log({
        userId: user.userId,
        action: 'SESSION_CLOSED',
        entityType: 'stock_session',
        entityId: id,
        success: false,
        errorMessage: e?.message ?? String(e),
      });
      throw e;
    }
  }

  async findAll(branchId?: number): Promise<StockSession[]> {
    return await this.sessionRepository.find({
      where: branchId ? { branchId } : {},
      relations: ['openedBy'],
      order: { date: 'DESC' },
    });
  }

  async findCurrent(branchId?: number): Promise<StockSession | null> {
    return await this.sessionRepository.findOne({
      where: branchId ? { status: SessionStatus.OPEN, branchId } : { status: SessionStatus.OPEN },
      relations: ['openedBy'],
      order: { openedAt: 'DESC' },
    });
  }

  async findOne(id: number, branchId?: number): Promise<StockSession> {
    const session = await this.sessionRepository.findOne({
      where: branchId ? { id, branchId } : { id },
      relations: ['openedBy', 'stockEntries', 'sales'],
    });

    if (!session) {
      throw new NotFoundException(`Stock session with ID ${id} not found`);
    }

    return session;
  }

  async findByDate(date: Date, branchId?: number): Promise<StockSession | null> {
    const sessionDate = new Date(date);
    sessionDate.setHours(0, 0, 0, 0);

    return await this.sessionRepository.findOne({
      where: branchId ? { date: sessionDate, branchId } : { date: sessionDate },
      relations: ['openedBy', 'stockEntries', 'sales'],
    });
  }

  async findAllWithStats(
    dateFrom?: string,
    dateTo?: string,
    status?: SessionStatus,
    branchId?: number,
  ): Promise<any[]> {
    const queryBuilder = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.openedBy', 'openedBy')
      .leftJoinAndSelect('session.branch', 'branch')
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

    if (branchId) {
      queryBuilder.andWhere('session.branchId = :branchId', { branchId });
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

