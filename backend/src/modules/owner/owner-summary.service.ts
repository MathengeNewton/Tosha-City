import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Sale } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { SalePayment } from '../sales/entities/sale-payment.entity';
import { PaymentMethod, PaymentStatus } from '../sales/entities/payment.enums';
import { Expense, ExpensePaymentMethod } from '../expenses/entities/expense.entity';
import { StockEntry, StockEntryType } from '../stock-entries/entities/stock-entry.entity';
import { StockSession } from '../stock-sessions/entities/stock-session.entity';
import {
  Product,
  ProductCategory,
  ProductSegment,
} from '../products/entities/product.entity';
import { ReconciliationService } from '../reports/reconciliation.service';
import { addDaysYmd, parseYmdToDate, todayYmdInAppTz } from '../../common/time/app-time';
import { changePct, computeDrawer, eachDay, round2 } from './owner-rules';

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function parseYmdParam(value: string | undefined, name: string, fallback: string): string {
  if (!value) return fallback;
  if (!YMD.test(value)) throw new BadRequestException(`${name} must be YYYY-MM-DD`);
  return value;
}

const num = (v: unknown) => Number(v ?? 0) || 0;

@Injectable()
export class OwnerSummaryService {
  constructor(
    @InjectRepository(Sale) private saleRepo: Repository<Sale>,
    @InjectRepository(SaleItem) private saleItemRepo: Repository<SaleItem>,
    @InjectRepository(SalePayment) private paymentRepo: Repository<SalePayment>,
    @InjectRepository(Expense) private expenseRepo: Repository<Expense>,
    @InjectRepository(StockEntry) private stockEntryRepo: Repository<StockEntry>,
    @InjectRepository(StockSession) private sessionRepo: Repository<StockSession>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    private reconciliation: ReconciliationService,
  ) {}

  async getDailySummary(date?: string) {
    const ymd = parseYmdParam(date, 'date', todayYmdInAppTz());

    const [salesRow, paidOnSales, collectedRows, expenseRows, sessions] = await Promise.all([
      this.saleRepo
        .createQueryBuilder('sale')
        .select('COUNT(sale.id)', 'count')
        .addSelect('COALESCE(SUM(sale.totalAmount), 0)', 'total')
        .where('DATE(sale.soldAt) = :ymd', { ymd })
        .getRawOne(),
      this.paymentRepo
        .createQueryBuilder('p')
        .innerJoin('p.sale', 'sale')
        .select('p.method', 'method')
        .addSelect('SUM(p.amount)', 'amount')
        .where('DATE(sale.soldAt) = :ymd', { ymd })
        .groupBy('p.method')
        .getRawMany(),
      this.paymentRepo
        .createQueryBuilder('p')
        .innerJoin('p.sale', 'sale')
        .select('p.method', 'method')
        .addSelect('SUM(p.amount)', 'amount')
        .addSelect('SUM(CASE WHEN DATE(sale.soldAt) < :ymd THEN p.amount ELSE 0 END)', 'oldCredit')
        .where('DATE(p.receivedAt) = :ymd', { ymd })
        .groupBy('p.method')
        .getRawMany(),
      this.expenseRepo
        .createQueryBuilder('e')
        .innerJoin('e.session', 'session')
        .select('e.category', 'category')
        .addSelect('e.paymentMethod', 'method')
        .addSelect('SUM(e.amount)', 'amount')
        .addSelect('COUNT(e.id)', 'count')
        .where('session.date = :ymd', { ymd })
        .groupBy('e.category')
        .addGroupBy('e.paymentMethod')
        .getRawMany(),
      this.sessionRepo.find({ where: { date: parseYmdToDate(ymd) }, order: { id: 'ASC' } }),
    ]);

    const salesTotal = num(salesRow?.total);
    const paidBy = (method: PaymentMethod) =>
      num(paidOnSales.find((r) => r.method === method)?.amount);
    const salesCash = paidBy(PaymentMethod.CASH);
    const salesMpesa = paidBy(PaymentMethod.MPESA);

    const collectedBy = (method: PaymentMethod) =>
      num(collectedRows.find((r) => r.method === method)?.amount);
    const collectedCash = collectedBy(PaymentMethod.CASH);
    const collectedMpesa = collectedBy(PaymentMethod.MPESA);
    const fromOldCredit = collectedRows.reduce((sum, r) => sum + num(r.oldCredit), 0);

    const expensesCash = expenseRows
      .filter((r) => r.method === ExpensePaymentMethod.CASH)
      .reduce((sum, r) => sum + num(r.amount), 0);
    const expensesMpesa = expenseRows
      .filter((r) => r.method === ExpensePaymentMethod.MPESA)
      .reduce((sum, r) => sum + num(r.amount), 0);
    const byCategory = new Map<string, { category: string; amount: number; count: number }>();
    for (const r of expenseRows) {
      const c = byCategory.get(r.category) ?? { category: r.category, amount: 0, count: 0 };
      c.amount += num(r.amount);
      c.count += num(r.count);
      byCategory.set(r.category, c);
    }

    return {
      date: ymd,
      sessionStatus: sessions.length ? sessions[sessions.length - 1].status : null,
      sales: {
        count: num(salesRow?.count),
        total: round2(salesTotal),
        cash: round2(salesCash),
        mpesa: round2(salesMpesa),
        credit: round2(Math.max(0, salesTotal - salesCash - salesMpesa)),
      },
      collected: {
        cash: round2(collectedCash),
        mpesa: round2(collectedMpesa),
        total: round2(collectedCash + collectedMpesa),
        fromOldCredit: round2(fromOldCredit),
      },
      expenses: {
        cash: round2(expensesCash),
        mpesa: round2(expensesMpesa),
        total: round2(expensesCash + expensesMpesa),
        byCategory: [...byCategory.values()]
          .map((c) => ({ ...c, amount: round2(c.amount) }))
          .sort((a, b) => b.amount - a.amount),
      },
      drawer: computeDrawer({ collectedCash, collectedMpesa, expensesCash, expensesMpesa }),
      stockCheck: await this.stockCheckFor(sessions),
    };
  }

  /** Combined short/excess result for the day's session(s); null when there is no session. */
  async stockCheckFor(sessions: StockSession[]) {
    if (!sessions.length) return null;
    const results = await Promise.all(
      sessions.map((s) => this.reconciliation.getSessionReconciliation(s.id)),
    );
    const checked = results.filter((r) => r.totals.status !== 'PENDING');
    if (!checked.length) {
      return { status: 'PENDING' as const, difference: null, productsShort: 0, shortProducts: [] };
    }
    const difference = round2(checked.reduce((sum, r) => sum + r.totals.difference, 0));
    const shortRows = checked
      .flatMap((r) => r.rows)
      .filter((row) => row.status === 'SHORT')
      .sort((a, b) => (a.difference ?? 0) - (b.difference ?? 0));
    return {
      status: Math.round(difference) < 0 ? 'SHORT' : Math.round(difference) > 0 ? 'EXCESS' : 'BALANCED',
      difference,
      productsShort: shortRows.length,
      shortProducts: shortRows.slice(0, 5).map((row) => ({
        product: row.product,
        difference: row.difference,
      })),
    };
  }

  async getTrends(daysParam?: string) {
    const days = Math.min(90, Math.max(7, parseInt(daysParam || '30', 10) || 30));
    const to = todayYmdInAppTz();
    const from = addDaysYmd(to, -(days - 1));
    const prevTo = addDaysYmd(from, -1);
    const prevFrom = addDaysYmd(prevTo, -(days - 1));

    const [salesByDay, collectedByDay, expensesByDay, wastageByDay, productRows, expenseCategories, products] =
      await Promise.all([
        this.saleRepo
          .createQueryBuilder('sale')
          .select(`TO_CHAR(DATE(sale.soldAt), 'YYYY-MM-DD')`, 'day')
          .addSelect('COUNT(sale.id)', 'count')
          .addSelect('SUM(sale.totalAmount)', 'total')
          .where('DATE(sale.soldAt) BETWEEN :prevFrom AND :to', { prevFrom, to })
          .groupBy('day')
          .getRawMany(),
        this.paymentRepo
          .createQueryBuilder('p')
          .select(`TO_CHAR(DATE(p.receivedAt), 'YYYY-MM-DD')`, 'day')
          .addSelect('SUM(p.amount)', 'amount')
          .where('DATE(p.receivedAt) BETWEEN :prevFrom AND :to', { prevFrom, to })
          .groupBy('day')
          .getRawMany(),
        this.expenseRepo
          .createQueryBuilder('e')
          .innerJoin('e.session', 'session')
          .select(`TO_CHAR(session.date, 'YYYY-MM-DD')`, 'day')
          .addSelect('SUM(e.amount)', 'amount')
          .where('session.date BETWEEN :prevFrom AND :to', { prevFrom, to })
          .groupBy('day')
          .getRawMany(),
        this.stockEntryRepo
          .createQueryBuilder('entry')
          .select(`TO_CHAR(DATE(entry.recordedAt), 'YYYY-MM-DD')`, 'day')
          .addSelect('SUM(entry.quantity)', 'qty')
          .where('entry.type = :type', { type: StockEntryType.WASTAGE })
          .andWhere('DATE(entry.recordedAt) BETWEEN :from AND :to', { from, to })
          .groupBy('day')
          .getRawMany(),
        this.saleItemRepo
          .createQueryBuilder('item')
          .innerJoin('item.sale', 'sale')
          .select('item.productId', 'productId')
          .addSelect('SUM(item.quantity)', 'qty')
          .addSelect('SUM(item.totalPrice)', 'amount')
          .where('DATE(sale.soldAt) BETWEEN :from AND :to', { from, to })
          .groupBy('item.productId')
          .getRawMany(),
        this.expenseRepo
          .createQueryBuilder('e')
          .innerJoin('e.session', 'session')
          .select('e.category', 'category')
          .addSelect('SUM(e.amount)', 'amount')
          .addSelect('COUNT(e.id)', 'count')
          .where('session.date BETWEEN :from AND :to', { from, to })
          .groupBy('e.category')
          .getRawMany(),
        this.productRepo.find(),
      ]);

    const mapBy = (rows: any[], key: string) => new Map(rows.map((r) => [r.day, num(r[key])]));
    const salesTotals = mapBy(salesByDay, 'total');
    const salesCounts = mapBy(salesByDay, 'count');
    const collected = mapBy(collectedByDay, 'amount');
    const expenses = mapBy(expensesByDay, 'amount');
    const wastage = mapBy(wastageByDay, 'qty');

    const daily = eachDay(from, to, addDaysYmd).map((day) => ({
      date: day,
      salesCount: salesCounts.get(day) ?? 0,
      salesTotal: round2(salesTotals.get(day) ?? 0),
      collected: round2(collected.get(day) ?? 0),
      expenses: round2(expenses.get(day) ?? 0),
      wastageQty: round2(wastage.get(day) ?? 0),
    }));

    const sumRange = (m: Map<string, number>, a: string, b: string) =>
      [...m.entries()].filter(([d]) => d >= a && d <= b).reduce((s, [, v]) => s + v, 0);
    const compare = (m: Map<string, number>) => {
      const current = round2(sumRange(m, from, to));
      const previous = round2(sumRange(m, prevFrom, prevTo));
      return { current, previous, changePct: changePct(current, previous) };
    };

    const productById = new Map(products.map((p) => [p.id, p]));
    const sold = new Map(productRows.map((r) => [num(r.productId), r]));
    const sellable = products.filter(
      (p) =>
        p.isActive &&
        p.segment !== ProductSegment.KITCHEN_SUPPLY &&
        p.category !== ProductCategory.CONSUMABLE,
    );
    const ranked = [
      ...new Set([...sold.keys(), ...sellable.map((p) => p.id)]),
    ]
      .map((id) => {
        const p = productById.get(id);
        const r = sold.get(id);
        return {
          productId: id,
          product: p?.name ?? 'Unknown',
          unit: p?.unit ?? '',
          qty: round2(num(r?.qty)),
          amount: round2(num(r?.amount)),
        };
      })
      .sort((a, b) => b.amount - a.amount);
    const best = ranked.filter((r) => r.amount > 0).slice(0, 5);
    const bestIds = new Set(best.map((r) => r.productId));
    const worst = ranked
      .filter((r) => !bestIds.has(r.productId) && (r.amount > 0 || sellable.some((p) => p.id === r.productId)))
      .reverse()
      .slice(0, 5);

    return {
      range: { from, to, days },
      previousRange: { from: prevFrom, to: prevTo },
      daily,
      products: { best, worst },
      expensesByCategory: expenseCategories
        .map((r) => ({ category: r.category, amount: round2(num(r.amount)), count: num(r.count) }))
        .sort((a, b) => b.amount - a.amount),
      comparison: {
        salesTotal: compare(salesTotals),
        salesCount: compare(salesCounts),
        collected: compare(collected),
        expenses: compare(expenses),
      },
    };
  }

  /** Customers with unpaid or part-paid sales, biggest balance first. */
  async getCreditCustomers() {
    const sales = await this.saleRepo.find({
      where: { paymentStatus: Not(PaymentStatus.PAID) },
      relations: ['customer', 'payments'],
      order: { soldAt: 'ASC' },
    });

    const byCustomer = new Map<
      string,
      { customerId: number | null; customer: string; phone: string | null; owed: number; sales: number; oldestUnpaid: Date }
    >();
    for (const sale of sales) {
      const paid = (sale.payments ?? []).reduce((s, p) => s + num(p.amount), 0);
      const owed = num(sale.totalAmount) - paid;
      if (owed <= 0.01) continue;
      const key = sale.customerId != null ? String(sale.customerId) : 'walk-in';
      const row = byCustomer.get(key) ?? {
        customerId: sale.customerId ?? null,
        customer: sale.customer?.name ?? 'Walk-in (no customer)',
        phone: sale.customer?.phone ?? null,
        owed: 0,
        sales: 0,
        oldestUnpaid: sale.soldAt,
      };
      row.owed += owed;
      row.sales += 1;
      byCustomer.set(key, row);
    }

    const customers = [...byCustomer.values()]
      .map((c) => ({ ...c, owed: round2(c.owed) }))
      .sort((a, b) => b.owed - a.owed);
    return {
      totalOwed: round2(customers.reduce((s, c) => s + c.owed, 0)),
      customers,
    };
  }
}
