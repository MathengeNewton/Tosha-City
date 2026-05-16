import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Sale } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { StockEntry } from '../stock-entries/entities/stock-entry.entity';
import { StockEntryType } from '../stock-entries/entities/stock-entry.entity';
import { Product } from '../products/entities/product.entity';
import { StockShare } from '../stock-share/entities/stock-share.entity';
import { ReportFiltersDto } from './dto/report-filters.dto';
import { PaymentStatus } from '../sales/entities/payment.enums';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(SaleItem)
    private saleItemRepository: Repository<SaleItem>,
    @InjectRepository(StockEntry)
    private stockEntryRepository: Repository<StockEntry>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(StockShare)
    private stockShareRepository: Repository<StockShare>,
  ) {}

  async getSalesReport(filters: ReportFiltersDto) {
    const query = this.saleRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('sale.payments', 'payments');

    if (filters.startDate && filters.endDate) {
      query.where('DATE(sale.soldAt) BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    } else if (filters.startDate) {
      query.where('DATE(sale.soldAt) >= :startDate', { startDate: filters.startDate });
    } else if (filters.endDate) {
      query.where('DATE(sale.soldAt) <= :endDate', { endDate: filters.endDate });
    }

    if (filters.productId) {
      query.andWhere('product.id = :productId', { productId: filters.productId });
    }

    if (filters.sessionId) {
      query.andWhere('sale.sessionId = :sessionId', { sessionId: filters.sessionId });
    }

    const sales = await query.orderBy('sale.soldAt', 'DESC').getMany();

    // Calculate totals
    const totalSales = sales.length;
    const totalRevenue = sales
      .filter((s) => s.paymentStatus === PaymentStatus.PAID)
      .reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
    const unpaidAmount = sales
      .filter((s) => s.paymentStatus === PaymentStatus.PENDING)
      .reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);

    // Sales by product with price range breakdown
    const salesByProduct = {};
    sales.forEach((sale) => {
      sale.items?.forEach((item) => {
        const productName = item.product?.name || 'Unknown';
        if (!salesByProduct[productName]) {
          salesByProduct[productName] = {
            productId: item.product?.id,
            quantity: 0,
            revenue: 0,
            priceRanges: {},
          };
        }
        const itemQuantity = Number(item.quantity || 0);
        const itemTotalPrice = itemQuantity * Number(item.unitPrice || 0);
        
        salesByProduct[productName].quantity += itemQuantity;
        if (sale.paymentStatus === PaymentStatus.PAID) {
          salesByProduct[productName].revenue += itemTotalPrice;
        }

        // Group by price ranges (200 KES increments: 1-200, 201-400, 401-600, etc.)
        let rangeKey;
        if (itemTotalPrice <= 0) {
          rangeKey = '0';
        } else if (itemTotalPrice <= 200) {
          rangeKey = '1-200';
        } else {
          // Calculate which 200-range bucket: 201-400, 401-600, etc.
          const rangeIndex = Math.floor((itemTotalPrice - 1) / 200);
          const rangeStart = rangeIndex * 200 + 1;
          const rangeEnd = (rangeIndex + 1) * 200;
          rangeKey = `${rangeStart}-${rangeEnd}`;
        }
        
        if (!salesByProduct[productName].priceRanges[rangeKey]) {
          salesByProduct[productName].priceRanges[rangeKey] = {
            count: 0,
            quantity: 0,
            revenue: 0,
          };
        }
        salesByProduct[productName].priceRanges[rangeKey].count += 1;
        salesByProduct[productName].priceRanges[rangeKey].quantity += itemQuantity;
        if (sale.paymentStatus === PaymentStatus.PAID) {
          salesByProduct[productName].priceRanges[rangeKey].revenue += itemTotalPrice;
        }
      });
    });

    return {
      summary: {
        totalSales,
        totalRevenue,
        unpaidAmount,
        paidSales: sales.filter((s) => s.paymentStatus === PaymentStatus.PAID).length,
        unpaidSales: sales.filter((s) => s.paymentStatus === PaymentStatus.PENDING).length,
      },
      salesByProduct,
      sales: sales.map((s) => ({
        id: s.id,
        saleNumber: s.saleNumber,
        date: s.soldAt,
        totalAmount: s.totalAmount,
        paymentStatus: s.paymentStatus,
        items: s.items?.map((i) => ({
          product: i.product?.name,
          quantity: i.quantity,
          price: i.unitPrice,
        })),
      })),
    };
  }

  async getStockReport(filters: ReportFiltersDto) {
    const query = this.stockEntryRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.product', 'product')
      .leftJoinAndSelect('entry.session', 'session');

    if (filters.startDate && filters.endDate) {
      query.where('DATE(entry.recordedAt) BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    if (filters.productId) {
      query.andWhere('entry.productId = :productId', { productId: filters.productId });
    }

    if (filters.sessionId) {
      query.andWhere('entry.sessionId = :sessionId', { sessionId: filters.sessionId });
    }

    const entries = await query.orderBy('entry.recordedAt', 'DESC').getMany();

    // Get sales for the same date range to include sales by price and by kgs
    const salesQuery = this.saleRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.items', 'items')
      .leftJoinAndSelect('items.product', 'product');

    if (filters.startDate && filters.endDate) {
      salesQuery.where('DATE(sale.soldAt) BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    if (filters.sessionId) {
      salesQuery.andWhere('sale.sessionId = :sessionId', { sessionId: filters.sessionId });
    }

    const sales = await salesQuery.getMany();

    // Group by product and type
    const stockByProduct = {};
    entries.forEach((entry) => {
      const productName = entry.product?.name || 'Unknown';
      if (!stockByProduct[productName]) {
        stockByProduct[productName] = {
          productId: entry.product?.id,
          opening: 0,
          incoming: 0,
          closing: 0,
          wastage: 0,
          partnerShare: 0,
          salesByPrice: 0,
          salesByKgs: 0,
        };
      }

      switch (entry.type) {
        case StockEntryType.OPENING:
          stockByProduct[productName].opening += entry.quantity;
          break;
        case StockEntryType.INCOMING:
          stockByProduct[productName].incoming += entry.quantity;
          break;
        case StockEntryType.CLOSING:
          stockByProduct[productName].closing += entry.quantity;
          break;
        case StockEntryType.WASTAGE:
          stockByProduct[productName].wastage += entry.quantity;
          break;
        case StockEntryType.PARTNER_SHARE:
          stockByProduct[productName].partnerShare += entry.quantity;
          break;
      }
    });

    // Add sales data by product
    sales.forEach((sale) => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((item) => {
          const productName = item.product?.name || 'Unknown';
          if (!stockByProduct[productName]) {
            stockByProduct[productName] = {
              productId: item.product?.id,
              opening: 0,
              incoming: 0,
              closing: 0,
              wastage: 0,
              partnerShare: 0,
              salesByPrice: 0,
              salesByKgs: 0,
            };
          }
          const quantity = parseFloat(item.quantity?.toString() || '0');
          const totalPrice = parseFloat(item.totalPrice?.toString() || '0');
          stockByProduct[productName].salesByPrice += totalPrice;
          stockByProduct[productName].salesByKgs += quantity;
        });
      }
    });

    // Calculate totals
    let totalSalesByPrice = 0;
    let totalSalesByKgs = 0;
    Object.values(stockByProduct).forEach((product: any) => {
      totalSalesByPrice += product.salesByPrice || 0;
      totalSalesByKgs += product.salesByKgs || 0;
    });

    return {
      stockByProduct,
      summary: {
        totalSalesByPrice,
        totalSalesByKgs,
      },
      entries: entries.map((e) => ({
        id: e.id,
        product: e.product?.name,
        type: e.type,
        quantity: e.quantity,
        unit: e.unit,
        date: e.recordedAt,
        notes: e.notes,
      })),
    };
  }

  async getWastageReport(filters: ReportFiltersDto) {
    const query = this.stockEntryRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.product', 'product')
      .leftJoinAndSelect('entry.session', 'session')
      .where('entry.type = :type', { type: StockEntryType.WASTAGE });

    if (filters.startDate && filters.endDate) {
      query.andWhere('DATE(entry.recordedAt) BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    if (filters.productId) {
      query.andWhere('entry.productId = :productId', { productId: filters.productId });
    }

    const wastageEntries = await query.orderBy('entry.recordedAt', 'DESC').getMany();

    // Group by product
    const wastageByProduct = {};
    let totalWastage = 0;

    wastageEntries.forEach((entry) => {
      const productName = entry.product?.name || 'Unknown';
      if (!wastageByProduct[productName]) {
        wastageByProduct[productName] = {
          productId: entry.product?.id,
          quantity: 0,
          entries: [],
        };
      }
      wastageByProduct[productName].quantity += entry.quantity;
      totalWastage += entry.quantity;
      wastageByProduct[productName].entries.push({
        id: entry.id,
        quantity: entry.quantity,
        unit: entry.unit,
        date: entry.recordedAt,
        notes: entry.notes,
        photoUrl: entry.photoUrl,
      });
    });

    return {
      summary: {
        totalWastage,
        totalEntries: wastageEntries.length,
        productsAffected: Object.keys(wastageByProduct).length,
      },
      wastageByProduct,
      entries: wastageEntries.map((e) => ({
        id: e.id,
        product: e.product?.name,
        quantity: e.quantity,
        unit: e.unit,
        date: e.recordedAt,
        notes: e.notes,
        photoUrl: e.photoUrl,
      })),
    };
  }

  async getStockShareReport(filters: ReportFiltersDto) {
    const query = this.stockShareRepository
      .createQueryBuilder('share')
      .leftJoinAndSelect('share.partner', 'partner')
      .leftJoinAndSelect('share.product', 'product')
      .leftJoinAndSelect('share.session', 'session')
      .leftJoinAndSelect('share.recordedBy', 'recordedBy')
      .orderBy('share.recordedAt', 'DESC');

    if (filters.startDate && filters.endDate) {
      query.andWhere('DATE(share.recordedAt) BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    } else if (filters.startDate) {
      query.andWhere('DATE(share.recordedAt) >= :startDate', { startDate: filters.startDate });
    } else if (filters.endDate) {
      query.andWhere('DATE(share.recordedAt) <= :endDate', { endDate: filters.endDate });
    }

    if (filters.partnerId) {
      query.andWhere('share.partnerId = :partnerId', { partnerId: filters.partnerId });
    }

    if (filters.sessionId) {
      query.andWhere('share.sessionId = :sessionId', { sessionId: filters.sessionId });
    }

    const shares = await query.getMany();

    const totalQuantity = shares.reduce((sum, s) => sum + Number(s.quantity), 0);
    const byPartner: Record<string, { partnerId: number; quantity: number; entries: number; paid: number; unpaid: number }> = {};
    const byProduct: Record<string, { productId: number; quantity: number; entries: number }> = {};

    shares.forEach((s) => {
      const partnerName = s.partner?.name || 'Unknown';
      if (!byPartner[partnerName]) {
        byPartner[partnerName] = { partnerId: s.partnerId, quantity: 0, entries: 0, paid: 0, unpaid: 0 };
      }
      byPartner[partnerName].quantity += Number(s.quantity);
      byPartner[partnerName].entries += 1;
      if (s.paid) byPartner[partnerName].paid += 1;
      else byPartner[partnerName].unpaid += 1;

      const productName = s.product?.name || 'Unknown';
      if (!byProduct[productName]) {
        byProduct[productName] = { productId: s.productId, quantity: 0, entries: 0 };
      }
      byProduct[productName].quantity += Number(s.quantity);
      byProduct[productName].entries += 1;
    });

    return {
      summary: {
        totalQuantity,
        totalEntries: shares.length,
        partnersCount: Object.keys(byPartner).length,
        productsCount: Object.keys(byProduct).length,
      },
      byPartner: Object.entries(byPartner).map(([name, data]) => ({ partner: name, ...data })),
      byProduct: Object.entries(byProduct).map(([name, data]) => ({ product: name, ...data })),
      entries: shares.map((s) => ({
        id: s.id,
        partner: s.partner?.name,
        product: s.product?.name,
        quantity: s.quantity,
        unit: s.unit,
        recordedAt: s.recordedAt,
        paid: s.paid,
        paidAt: s.paidAt,
        notes: s.notes,
        sessionDate: s.session?.date,
      })),
    };
  }

  async getWeeklyComparison() {
    const today = new Date();
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    currentWeekStart.setHours(0, 0, 0, 0);

    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
    currentWeekEnd.setHours(23, 59, 59, 999);

    const lastWeekStart = new Date(currentWeekStart);
    lastWeekStart.setDate(currentWeekStart.getDate() - 7);

    const lastWeekEnd = new Date(currentWeekStart);
    lastWeekEnd.setDate(currentWeekStart.getDate() - 1);
    lastWeekEnd.setHours(23, 59, 59, 999);

    // Current week sales
    const currentWeekSales = await this.saleRepository
      .createQueryBuilder('sale')
      .where('sale.soldAt BETWEEN :start AND :end', {
        start: currentWeekStart,
        end: currentWeekEnd,
      })
      .andWhere('sale.paymentStatus = :status', { status: PaymentStatus.PAID })
      .getMany();

    // Last week sales
    const lastWeekSales = await this.saleRepository
      .createQueryBuilder('sale')
      .where('sale.soldAt BETWEEN :start AND :end', {
        start: lastWeekStart,
        end: lastWeekEnd,
      })
      .andWhere('sale.paymentStatus = :status', { status: PaymentStatus.PAID })
      .getMany();

    const currentWeekRevenue = currentWeekSales.reduce(
      (sum, s) => sum + Number(s.totalAmount || 0),
      0,
    );
    const lastWeekRevenue = lastWeekSales.reduce(
      (sum, s) => sum + Number(s.totalAmount || 0),
      0,
    );

    const revenueChange = lastWeekRevenue > 0 
      ? ((currentWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 
      : 0;

    return {
      currentWeek: {
        startDate: currentWeekStart.toISOString().split('T')[0],
        endDate: currentWeekEnd.toISOString().split('T')[0],
        totalSales: currentWeekSales.length,
        totalRevenue: currentWeekRevenue,
      },
      lastWeek: {
        startDate: lastWeekStart.toISOString().split('T')[0],
        endDate: lastWeekEnd.toISOString().split('T')[0],
        totalSales: lastWeekSales.length,
        totalRevenue: lastWeekRevenue,
      },
      comparison: {
        revenueChange: parseFloat(revenueChange.toFixed(2)),
        salesChange: lastWeekSales.length > 0
          ? parseFloat((((currentWeekSales.length - lastWeekSales.length) / lastWeekSales.length) * 100).toFixed(2))
          : 0,
      },
    };
  }

  async getDailySummary(date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(targetDate.getDate() + 1);

    // Sales for the day
    const sales = await this.saleRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .where('sale.soldAt >= :start AND sale.soldAt < :end', {
        start: targetDate,
        end: nextDate,
      })
      .getMany();

    // Stock entries for the day
    const stockEntries = await this.stockEntryRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.product', 'product')
      .where('entry.recordedAt >= :start AND entry.recordedAt < :end', {
        start: targetDate,
        end: nextDate,
      })
      .getMany();

    const paidSales = sales.filter((s) => s.paymentStatus === PaymentStatus.PAID);
    const totalRevenue = paidSales.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);

    // Calculate sales by price (total revenue) and by kgs (total quantity)
    let totalQuantity = 0;
    let totalRevenueByPrice = 0;
    
    sales.forEach((sale) => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((item) => {
          const quantity = parseFloat(item.quantity?.toString() || '0');
          const totalPrice = parseFloat(item.totalPrice?.toString() || '0');
          totalQuantity += quantity;
          totalRevenueByPrice += totalPrice;
        });
      }
    });

    // Calculate sales by product (by price and by kgs)
    const salesByProduct = {};
    sales.forEach((sale) => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((item) => {
          const productName = item.product?.name || 'Unknown';
          if (!salesByProduct[productName]) {
            salesByProduct[productName] = {
              revenue: 0,
              quantity: 0,
            };
          }
          salesByProduct[productName].revenue += parseFloat(item.totalPrice?.toString() || '0');
          salesByProduct[productName].quantity += parseFloat(item.quantity?.toString() || '0');
        });
      }
    });

    return {
      date: targetDate.toISOString().split('T')[0],
      sales: {
        total: sales.length,
        paid: paidSales.length,
        unpaid: sales.length - paidSales.length,
        revenue: totalRevenue,
        totalByPrice: totalRevenueByPrice,
        totalByKgs: totalQuantity,
        byProduct: salesByProduct,
      },
      stock: {
        entries: stockEntries.length,
        opening: stockEntries.filter((e) => e.type === StockEntryType.OPENING).length,
        incoming: stockEntries.filter((e) => e.type === StockEntryType.INCOMING).length,
        closing: stockEntries.filter((e) => e.type === StockEntryType.CLOSING).length,
        wastage: stockEntries.filter((e) => e.type === StockEntryType.WASTAGE).length,
        partnerShare: stockEntries.filter((e) => e.type === StockEntryType.PARTNER_SHARE).length,
      },
    };
  }
}

