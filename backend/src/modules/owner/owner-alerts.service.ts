import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { ActivityLog } from '../activity-log/entities/activity-log.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { CustomerProductPrice } from '../customers/entities/customer-product-price.entity';
import { CustomerType } from '../customers/entities/customer.entity';
import { StockEntry, StockEntryType } from '../stock-entries/entities/stock-entry.entity';
import { SessionStatus, StockSession } from '../stock-sessions/entities/stock-session.entity';
import { ReconciliationService } from '../reports/reconciliation.service';
import { addDaysYmd, parseYmdToDate, todayYmdInAppTz } from '../../common/time/app-time';
import {
  AlertSeverity,
  OWNER_ALERT_RULES,
  expectedUnitPrice,
  isStockShort,
  isUnusualWastage,
  priceGap,
  round2,
} from './owner-rules';
import { parseYmdParam } from './owner-summary.service';

export type OwnerAlertType =
  | 'SALE_DELETED'
  | 'SALE_UPDATED'
  | 'STOCK_ENTRY_DELETED'
  | 'STOCK_ENTRY_UPDATED'
  | 'EXPENSE_DELETED'
  | 'EXPENSE_UPDATED'
  | 'PRICE_BELOW_EXPECTED'
  | 'STOCK_SHORT'
  | 'HIGH_WASTAGE';

export interface OwnerAlert {
  /** Stable key, also used to avoid sending the same push twice. */
  id: string;
  type: OwnerAlertType;
  severity: AlertSeverity;
  date: string;
  title: string;
  detail: string | null;
  amount: number | null;
  user: string | null;
  ref: { entity: string; id: number | null; sessionId?: number | null };
}

const MAX_RANGE_DAYS = 31;

const CHANGE_ACTIONS: Record<string, { type: OwnerAlertType; severity: AlertSeverity }> = {
  SALE_DELETED: { type: 'SALE_DELETED', severity: 'HIGH' },
  SALE_UPDATED: { type: 'SALE_UPDATED', severity: 'MEDIUM' },
  STOCK_ENTRY_DELETED: { type: 'STOCK_ENTRY_DELETED', severity: 'MEDIUM' },
  STOCK_ENTRY_UPDATED: { type: 'STOCK_ENTRY_UPDATED', severity: 'MEDIUM' },
  EXPENSE_DELETED: { type: 'EXPENSE_DELETED', severity: 'MEDIUM' },
  EXPENSE_UPDATED: { type: 'EXPENSE_UPDATED', severity: 'LOW' },
};

const kes = (n: number) => `KES ${Math.round(n).toLocaleString('en-KE')}`;
const num = (v: unknown) => Number(v ?? 0) || 0;
const SEVERITY_ORDER: Record<AlertSeverity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

@Injectable()
export class OwnerAlertsService {
  constructor(
    @InjectRepository(ActivityLog) private activityRepo: Repository<ActivityLog>,
    @InjectRepository(SaleItem) private saleItemRepo: Repository<SaleItem>,
    @InjectRepository(CustomerProductPrice) private specialPriceRepo: Repository<CustomerProductPrice>,
    @InjectRepository(StockEntry) private stockEntryRepo: Repository<StockEntry>,
    @InjectRepository(StockSession) private sessionRepo: Repository<StockSession>,
    private reconciliation: ReconciliationService,
  ) {}

  async getAlerts(fromParam?: string, toParam?: string) {
    const to = parseYmdParam(toParam, 'to', todayYmdInAppTz());
    const from = parseYmdParam(fromParam, 'from', addDaysYmd(to, -6));
    if (from > to) throw new BadRequestException('from must be on or before to');
    if (from < addDaysYmd(to, -(MAX_RANGE_DAYS - 1))) {
      throw new BadRequestException(`Range can be at most ${MAX_RANGE_DAYS} days`);
    }

    const groups = await Promise.all([
      this.changeAlerts(from, to),
      this.priceAlerts(from, to),
      this.stockShortAlerts(from, to),
      this.wastageAlerts(from, to),
    ]);
    const alerts = groups
      .flat()
      .sort((a, b) => b.date.localeCompare(a.date) || SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

    const counts: Record<AlertSeverity, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    alerts.forEach((a) => (counts[a.severity] += 1));

    return { range: { from, to }, rules: OWNER_ALERT_RULES, counts, alerts };
  }

  private async changeAlerts(from: string, to: string): Promise<OwnerAlert[]> {
    const logs = await this.activityRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .where('log.action IN (:...actions)', { actions: Object.keys(CHANGE_ACTIONS) })
      .andWhere('log.success = true')
      .andWhere('DATE(log.createdAt) BETWEEN :from AND :to', { from, to })
      .orderBy('log.createdAt', 'DESC')
      .getMany();

    return logs.map((log) => {
      const rule = CHANGE_ACTIONS[log.action];
      const d = (log.details ?? {}) as Record<string, any>;
      const { title, detail, amount } = describeChange(log.action, log.entityId, d);
      return {
        id: `${rule.type}-${log.id}`,
        type: rule.type,
        severity: rule.severity,
        date: new Date(log.createdAt).toISOString(),
        title,
        detail,
        amount,
        user: log.user?.username ?? null,
        ref: { entity: log.entityType, id: log.entityId, sessionId: d.sessionId ?? null },
      };
    });
  }

  private async priceAlerts(from: string, to: string): Promise<OwnerAlert[]> {
    const items = await this.saleItemRepo
      .createQueryBuilder('item')
      .innerJoinAndSelect('item.sale', 'sale')
      .leftJoinAndSelect('sale.customer', 'customer')
      .leftJoinAndSelect('sale.soldBy', 'soldBy')
      .innerJoinAndSelect('item.product', 'product')
      .where('DATE(sale.soldAt) BETWEEN :from AND :to', { from, to })
      .getMany();

    const wholesaleIds = [
      ...new Set(
        items
          .filter((i) => isWholesale(i.sale.customer))
          .map((i) => i.sale.customerId as number),
      ),
    ];
    const specials = wholesaleIds.length
      ? await this.specialPriceRepo.find({ where: { customerId: In(wholesaleIds) } })
      : [];
    const specialPrice = new Map(specials.map((s) => [`${s.customerId}:${s.productId}`, Number(s.price)]));

    const bySale = new Map<number, { item: SaleItem; lines: string[]; gap: number; severity: AlertSeverity }>();
    for (const item of items) {
      const customer = item.sale.customer;
      const expected = expectedUnitPrice({
        defaultPrice: Number(item.product.defaultPrice),
        wholesalePrice: item.product.wholesalePrice != null ? Number(item.product.wholesalePrice) : null,
        customerIsWholesale: isWholesale(customer),
        specialPrice: specialPrice.get(`${item.sale.customerId}:${item.productId}`) ?? null,
      });
      const charged = Number(item.unitPrice);
      const gap = priceGap(charged, expected);
      if (!gap) continue;

      const lost = (expected - charged) * Number(item.quantity);
      const entry = bySale.get(item.saleId) ?? { item, lines: [], gap: 0, severity: 'MEDIUM' as AlertSeverity };
      entry.lines.push(
        `${item.product.name}: charged ${kes(charged)} vs ${kes(expected)} per ${item.product.unit} (${gap.gapPct}% below)`,
      );
      entry.gap += lost;
      if (gap.severity === 'HIGH') entry.severity = 'HIGH';
      bySale.set(item.saleId, entry);
    }

    return [...bySale.values()].map(({ item, lines, gap, severity }) => ({
      id: `PRICE_BELOW_EXPECTED-${item.saleId}`,
      type: 'PRICE_BELOW_EXPECTED' as const,
      severity,
      date: new Date(item.sale.soldAt).toISOString(),
      title: `Sale ${item.sale.saleNumber} charged ${kes(gap)} below expected price`,
      detail:
        lines.join('\n') +
        (item.sale.customer ? `\nCustomer: ${item.sale.customer.name}` : '') +
        '\nCompared with current prices; check if the price was changed since.',
      amount: round2(gap),
      user: item.sale.soldBy?.username ?? null,
      ref: { entity: 'sale', id: item.saleId, sessionId: item.sale.sessionId },
    }));
  }

  private async stockShortAlerts(from: string, to: string): Promise<OwnerAlert[]> {
    const sessions = await this.sessionRepo.find({
      where: {
        status: SessionStatus.CLOSED,
        date: Between(parseYmdToDate(from), parseYmdToDate(to)),
      },
    });
    const alerts: OwnerAlert[] = [];
    for (const session of sessions) {
      const rec = await this.reconciliation.getSessionReconciliation(session.id);
      if (rec.totals.status === 'PENDING' || !isStockShort(rec.totals.difference)) continue;
      const shortRows = rec.rows
        .filter((r) => r.status === 'SHORT')
        .sort((a, b) => (a.difference ?? 0) - (b.difference ?? 0));
      alerts.push({
        id: `STOCK_SHORT-${session.id}`,
        type: 'STOCK_SHORT',
        severity: 'HIGH',
        date: new Date(session.closedAt ?? session.date).toISOString(),
        title: `Stock check short by ${kes(-rec.totals.difference)}`,
        detail: shortRows
          .slice(0, 5)
          .map((r) => `${r.product}: ${kes(-(r.difference ?? 0))} short`)
          .join('\n') || null,
        amount: round2(-rec.totals.difference),
        user: session.openedBy?.username ?? null,
        ref: { entity: 'stock_session', id: session.id, sessionId: session.id },
      });
    }
    return alerts;
  }

  private async wastageAlerts(from: string, to: string): Promise<OwnerAlert[]> {
    const baselineFrom = addDaysYmd(from, -OWNER_ALERT_RULES.wastageBaselineDays);
    const baselineTo = addDaysYmd(from, -1);

    const [rows, baselineDays] = await Promise.all([
      this.stockEntryRepo
        .createQueryBuilder('entry')
        .innerJoin('entry.product', 'product')
        .select(`TO_CHAR(DATE(entry.recordedAt), 'YYYY-MM-DD')`, 'day')
        .addSelect('SUM(entry.quantity * product.defaultPrice)', 'value')
        .addSelect('SUM(entry.quantity)', 'qty')
        .addSelect('COUNT(entry.id)', 'entries')
        .where('entry.type = :type', { type: StockEntryType.WASTAGE })
        .andWhere('DATE(entry.recordedAt) BETWEEN :baselineFrom AND :to', { baselineFrom, to })
        .groupBy('day')
        .getRawMany(),
      this.sessionRepo.count({
        where: { date: Between(parseYmdToDate(baselineFrom), parseYmdToDate(baselineTo)) },
      }),
    ]);

    const baselineTotal = rows
      .filter((r) => r.day >= baselineFrom && r.day <= baselineTo)
      .reduce((s, r) => s + num(r.value), 0);
    const baselineAvg = baselineDays > 0 ? baselineTotal / baselineDays : 0;

    return rows
      .filter((r) => r.day >= from && r.day <= to && isUnusualWastage(num(r.value), baselineAvg))
      .map((r) => ({
        id: `HIGH_WASTAGE-${r.day}`,
        type: 'HIGH_WASTAGE' as const,
        severity: 'MEDIUM' as const,
        date: new Date(`${r.day}T23:59:00+03:00`).toISOString(),
        title: `Wastage ${kes(num(r.value))} on ${r.day}`,
        detail: `${round2(num(r.qty))} kg over ${num(r.entries)} entries. Usual daily average is about ${kes(baselineAvg)}.`,
        amount: round2(num(r.value)),
        user: null,
        ref: { entity: 'wastage_day', id: null },
      }));
  }
}

function isWholesale(customer: { isWholesale?: boolean; type?: CustomerType } | null | undefined): boolean {
  if (!customer) return false;
  return !!customer.isWholesale || customer.type === CustomerType.WHOLESALE;
}

function describeChange(
  action: string,
  entityId: number | null,
  d: Record<string, any>,
): { title: string; detail: string | null; amount: number | null } {
  switch (action) {
    case 'SALE_DELETED': {
      const items = Array.isArray(d.items)
        ? d.items.map((i: any) => `${i.product}: ${i.quantity} × ${kes(num(i.unitPrice))}`).join('\n')
        : null;
      return {
        title: `Sale ${d.saleNumber ?? `#${entityId}`} deleted${d.totalAmount != null ? ` (${kes(num(d.totalAmount))})` : ''}`,
        detail: [items, d.customer ? `Customer: ${d.customer}` : null].filter(Boolean).join('\n') || null,
        amount: d.totalAmount != null ? num(d.totalAmount) : null,
      };
    }
    case 'SALE_UPDATED':
      return {
        title: `Sale ${d.saleNumber ?? `#${entityId}`} changed`,
        detail:
          d.paymentMethod && d.previousPaymentMethod
            ? `Payment method ${d.previousPaymentMethod} → ${d.paymentMethod}`
            : d.paymentMethod
              ? `Payment method set to ${d.paymentMethod}`
              : null,
        amount: d.totalAmount != null ? num(d.totalAmount) : null,
      };
    case 'STOCK_ENTRY_DELETED':
      return {
        title: `${label(d.type)} stock entry deleted${d.product ? `: ${d.product}` : ''}`,
        detail: d.quantity != null ? `${d.quantity} ${d.unit ?? ''}`.trim() : null,
        amount: null,
      };
    case 'STOCK_ENTRY_UPDATED': {
      const b = d.before ?? {};
      const qtyChange =
        b.quantity != null && d.quantity != null && Number(b.quantity) !== Number(d.quantity)
          ? `Quantity ${b.quantity} → ${d.quantity} ${b.unit ?? ''}`.trim()
          : null;
      return {
        title: `${label(d.type ?? d.from)} stock entry edited${b.product ? `: ${b.product}` : ''}`,
        detail: [qtyChange, d.source === 'stock_share' ? 'Changed through Stock Share' : null]
          .filter(Boolean)
          .join('\n') || null,
        amount: null,
      };
    }
    case 'EXPENSE_DELETED':
      return {
        title: `Expense deleted (${kes(num(d.amount))})`,
        detail: [d.category, d.description].filter(Boolean).join(' · ') || null,
        amount: num(d.amount),
      };
    case 'EXPENSE_UPDATED': {
      const c = d.changes ?? {};
      return {
        title: 'Expense edited',
        detail: Object.entries(c)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n') || null,
        amount: c.amount != null ? num(c.amount) : null,
      };
    }
    default:
      return { title: action, detail: null, amount: null };
  }
}

function label(type: string | undefined): string {
  if (!type) return 'A';
  return type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' ');
}
