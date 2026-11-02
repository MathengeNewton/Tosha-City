import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Expense,
  ExpenseCategory,
  ExpensePaymentMethod,
} from './entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { StockSessionsService } from '../stock-sessions/stock-sessions.service';
import { SessionStatus } from '../stock-sessions/entities/stock-session.entity';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { UserRole } from '../roles/entities/role.entity';

type RequestUser = {
  userId: number;
  roles?: Array<{ name?: string } | string>;
};

export type ExpenseFilters = {
  sessionId?: number;
  startDate?: string;
  endDate?: string;
  category?: ExpenseCategory;
};

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
    private stockSessionsService: StockSessionsService,
    private activityLog: ActivityLogService,
  ) {}

  async create(dto: CreateExpenseDto, user: RequestUser): Promise<Expense> {
    const session = await this.stockSessionsService.findOne(dto.sessionId);
    if (session.status !== SessionStatus.OPEN) {
      throw new BadRequestException(
        'Expenses can only be added while the stock session is open.',
      );
    }

    const expense = this.expenseRepository.create({
      sessionId: dto.sessionId,
      category: dto.category,
      description: dto.description.trim(),
      amount: dto.amount,
      paymentMethod: dto.paymentMethod ?? ExpensePaymentMethod.CASH,
      receiptUrl: dto.receiptUrl || null,
      recordedById: user.userId,
    });
    const saved = await this.expenseRepository.save(expense);
    await this.activityLog.log({
      userId: user.userId,
      action: 'EXPENSE_CREATED',
      entityType: 'expense',
      entityId: saved.id,
      details: {
        sessionId: saved.sessionId,
        category: saved.category,
        amount: Number(saved.amount),
      },
      success: true,
    });
    return this.findOne(saved.id);
  }

  async update(
    id: number,
    dto: UpdateExpenseDto,
    user: RequestUser,
  ): Promise<Expense> {
    const expense = await this.findOne(id);
    await this.assertCanChange(expense, user);

    const next: Partial<Expense> = {};
    if (dto.category !== undefined) next.category = dto.category;
    if (dto.description !== undefined)
      next.description = dto.description.trim();
    if (dto.amount !== undefined) next.amount = dto.amount;
    if (dto.paymentMethod !== undefined) next.paymentMethod = dto.paymentMethod;
    if (dto.receiptUrl !== undefined) next.receiptUrl = dto.receiptUrl || null;

    await this.expenseRepository.update(id, next);
    await this.activityLog.log({
      userId: user.userId,
      action: 'EXPENSE_UPDATED',
      entityType: 'expense',
      entityId: id,
      details: { sessionId: expense.sessionId, changes: { ...next } },
      success: true,
    });
    return this.findOne(id);
  }

  async remove(id: number, user: RequestUser): Promise<void> {
    const expense = await this.findOne(id);
    await this.assertCanChange(expense, user);

    await this.expenseRepository.remove(expense);
    await this.activityLog.log({
      userId: user.userId,
      action: 'EXPENSE_DELETED',
      entityType: 'expense',
      entityId: id,
      details: {
        sessionId: expense.sessionId,
        category: expense.category,
        description: expense.description,
        amount: Number(expense.amount),
      },
      success: true,
    });
  }

  async findAll(filters: ExpenseFilters = {}): Promise<Expense[]> {
    const query = this.expenseRepository
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.recordedBy', 'recordedBy')
      .leftJoinAndSelect('expense.session', 'session')
      .orderBy('expense.recordedAt', 'DESC');

    if (filters.sessionId != null) {
      query.andWhere('expense.sessionId = :sessionId', {
        sessionId: filters.sessionId,
      });
    }
    if (filters.startDate && filters.endDate) {
      query.andWhere('session.date BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }
    if (filters.category) {
      query.andWhere('expense.category = :category', {
        category: filters.category,
      });
    }
    return query.getMany();
  }

  async findOne(id: number): Promise<Expense> {
    const expense = await this.expenseRepository.findOne({
      where: { id },
      relations: ['recordedBy', 'session'],
    });
    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }
    return expense;
  }

  /** Cashiers can fix expenses while the day is open; once the session is closed only an admin can. */
  private async assertCanChange(
    expense: Expense,
    user: RequestUser,
  ): Promise<void> {
    const session = await this.stockSessionsService.findOne(expense.sessionId);
    if (session.status === SessionStatus.OPEN) return;
    const roleNames = (user.roles ?? []).map((r) =>
      typeof r === 'string' ? r : r.name,
    );
    if (!roleNames.includes(UserRole.ADMIN)) {
      throw new ForbiddenException(
        'This session is closed. Ask an admin to correct the expense.',
      );
    }
  }
}
