import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Sale } from '../sales/entities/sale.entity';
import {
  StockEntry,
  StockEntryType,
} from '../stock-entries/entities/stock-entry.entity';
import {
  Product,
  ProductCategory,
  ProductSegment,
} from '../products/entities/product.entity';
import { StockSession } from '../stock-sessions/entities/stock-session.entity';
import { PaymentMethod } from '../sales/entities/payment.enums';

export type ReconciliationStatus = 'SHORT' | 'EXCESS' | 'BALANCED' | 'PENDING';

export interface ReconciliationRow {
  productId: number;
  product: string;
  unit: string;
  opening: number;
  incoming: number;
  closing: number | null;
  wastage: number;
  sharedOrUsed: number;
  soldByStock: number | null;
  soldInSales: number;
  price: number;
  expectedValue: number | null;
  salesValue: number;
  priceAdjustment: number;
  difference: number | null;
  status: ReconciliationStatus;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const statusFor = (difference: number): ReconciliationStatus => {
  const rounded = Math.round(difference);
  if (rounded < 0) return 'SHORT';
  if (rounded > 0) return 'EXCESS';
  return 'BALANCED';
};

/**
 * Daily meat check: compares what left the shop by stock count against what was recorded in sales.
 *
 *   sold by stock   = opening + incoming − closing − wastage − shared out − production use
 *   expected (KES)  = sold by stock × default price
 *   difference      = (sold in sales − sold by stock) × default price
 *
 * Using the default price for the difference keeps wholesale/customer prices from showing up as
 * shortages; that gap is reported separately as `priceAdjustment`.
 */
@Injectable()
export class ReconciliationService {
  constructor(
    @InjectRepository(StockSession)
    private sessionRepository: Repository<StockSession>,
    @InjectRepository(StockEntry)
    private stockEntryRepository: Repository<StockEntry>,
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async getSessionReconciliation(sessionId?: number) {
    const session = sessionId
      ? await this.sessionRepository.findOne({ where: { id: sessionId } })
      : await this.sessionRepository.findOne({
          where: {},
          order: { date: 'DESC', id: 'DESC' },
        });
    if (!session) {
      throw new NotFoundException(
        sessionId
          ? `Stock session ${sessionId} not found`
          : 'No stock sessions yet',
      );
    }

    const [entries, sales] = await Promise.all([
      this.stockEntryRepository.find({
        where: { sessionId: session.id },
        relations: ['product'],
      }),
      this.saleRepository.find({
        where: { sessionId: session.id },
        relations: ['items', 'items.product', 'payments'],
      }),
    ]);

    const products = new Map<number, Product>();
    entries.forEach((e) => e.product && products.set(e.product.id, e.product));
    sales.forEach((s) =>
      s.items?.forEach(
        (i) => i.product && products.set(i.product.id, i.product),
      ),
    );

    const missingParentIds = [...products.values()]
      .map((p) => p.parentProductId)
      .filter((id): id is number => id != null && !products.has(id));
    if (missingParentIds.length) {
      const parents = await this.productRepository.find({
        where: { id: In(missingParentIds) },
      });
      parents.forEach((p) => products.set(p.id, p));
    }

    const isReconciled = (p: Product) =>
      p.parentProductId == null &&
      p.category !== ProductCategory.PRODUCTION_ITEM &&
      p.segment !== ProductSegment.KITCHEN_SUPPLY;

    type Acc = {
      opening: number;
      incoming: number;
      closing: number;
      hasClosing: boolean;
      wastage: number;
      sharedOrUsed: number;
      soldInSales: number;
      salesValue: number;
    };
    const acc = new Map<number, Acc>();
    const bucket = (productId: number) => {
      if (!acc.has(productId)) {
        acc.set(productId, {
          opening: 0,
          incoming: 0,
          closing: 0,
          hasClosing: false,
          wastage: 0,
          sharedOrUsed: 0,
          soldInSales: 0,
          salesValue: 0,
        });
      }
      return acc.get(productId)!;
    };

    for (const entry of entries) {
      const product = products.get(entry.productId);
      if (!product || !isReconciled(product)) continue;
      const b = bucket(product.id);
      const qty = Number(entry.quantity);
      switch (entry.type) {
        case StockEntryType.OPENING:
          b.opening += qty;
          break;
        case StockEntryType.INCOMING:
          b.incoming += qty;
          break;
        case StockEntryType.CLOSING:
          b.closing += qty;
          b.hasClosing = true;
          break;
        case StockEntryType.WASTAGE:
          b.wastage += qty;
          break;
        case StockEntryType.PARTNER_SHARE:
        case StockEntryType.PRODUCTION_USAGE:
          b.sharedOrUsed += qty;
          break;
      }
    }

    for (const sale of sales) {
      for (const item of sale.items ?? []) {
        const product = products.get(item.productId);
        if (!product) continue;
        const stockProduct =
          product.parentProductId != null
            ? products.get(product.parentProductId)
            : product;
        if (!stockProduct || !isReconciled(stockProduct)) continue;
        const b = bucket(stockProduct.id);
        b.soldInSales += Number(item.quantity);
        b.salesValue += Number(item.totalPrice);
      }
    }

    const rows: ReconciliationRow[] = [...acc.entries()]
      .map(([productId, b]) => {
        const product = products.get(productId)!;
        const price = Number(product.defaultPrice) || 0;
        const priceAdjustment = round2(b.soldInSales * price - b.salesValue);
        if (!b.hasClosing) {
          return {
            productId,
            product: product.name,
            unit: product.unit,
            opening: round2(b.opening),
            incoming: round2(b.incoming),
            closing: null,
            wastage: round2(b.wastage),
            sharedOrUsed: round2(b.sharedOrUsed),
            soldByStock: null,
            soldInSales: round2(b.soldInSales),
            price,
            expectedValue: null,
            salesValue: round2(b.salesValue),
            priceAdjustment,
            difference: null,
            status: 'PENDING' as const,
          };
        }
        const soldByStock =
          b.opening + b.incoming - b.closing - b.wastage - b.sharedOrUsed;
        const difference = (b.soldInSales - soldByStock) * price;
        return {
          productId,
          product: product.name,
          unit: product.unit,
          opening: round2(b.opening),
          incoming: round2(b.incoming),
          closing: round2(b.closing),
          wastage: round2(b.wastage),
          sharedOrUsed: round2(b.sharedOrUsed),
          soldByStock: round2(soldByStock),
          soldInSales: round2(b.soldInSales),
          price,
          expectedValue: round2(soldByStock * price),
          salesValue: round2(b.salesValue),
          priceAdjustment,
          difference: round2(difference),
          status: statusFor(difference),
        };
      })
      .sort((a, b) => a.product.localeCompare(b.product));

    const checked = rows.filter((r) => r.status !== 'PENDING');
    const totalDifference = checked.reduce(
      (sum, r) => sum + (r.difference ?? 0),
      0,
    );

    let cash = 0;
    let mpesa = 0;
    let otherPaid = 0;
    let creditOutstanding = 0;
    let totalSales = 0;
    for (const sale of sales) {
      const total = Number(sale.totalAmount);
      totalSales += total;
      let paid = 0;
      for (const payment of sale.payments ?? []) {
        const amount = Number(payment.amount);
        paid += amount;
        if (payment.method === PaymentMethod.CASH) cash += amount;
        else if (payment.method === PaymentMethod.MPESA) mpesa += amount;
        else otherPaid += amount;
      }
      creditOutstanding += Math.max(0, total - paid);
    }

    return {
      session: { id: session.id, date: session.date, status: session.status },
      rows,
      totals: {
        expectedValue: round2(
          checked.reduce((sum, r) => sum + (r.expectedValue ?? 0), 0),
        ),
        salesValue: round2(checked.reduce((sum, r) => sum + r.salesValue, 0)),
        priceAdjustment: round2(
          checked.reduce((sum, r) => sum + r.priceAdjustment, 0),
        ),
        difference: round2(totalDifference),
        status: checked.length
          ? statusFor(totalDifference)
          : ('PENDING' as ReconciliationStatus),
        productsChecked: checked.length,
        productsPending: rows.length - checked.length,
      },
      payments: {
        totalSales: round2(totalSales),
        cash: round2(cash),
        mpesa: round2(mpesa),
        other: round2(otherPaid),
        creditOutstanding: round2(creditOutstanding),
      },
    };
  }
}
