import {
  changePct,
  computeDrawer,
  eachDay,
  expectedUnitPrice,
  isStockShort,
  isUnusualWastage,
  priceGap,
} from './owner-rules';
import { formatSummaryPush } from './owner-notifications.service';
import { addDaysYmd } from '../../common/time/app-time';

describe('owner rules', () => {
  describe('computeDrawer', () => {
    it('expected cash is cash collected minus cash expenses (no float)', () => {
      expect(
        computeDrawer({ collectedCash: 24500, collectedMpesa: 31000, expensesCash: 1800, expensesMpesa: 400 }),
      ).toEqual({ expectedCash: 22700, netMpesa: 30600 });
    });

    it('can go negative when cash expenses exceed cash taken', () => {
      expect(
        computeDrawer({ collectedCash: 500, collectedMpesa: 0, expensesCash: 800, expensesMpesa: 0 }).expectedCash,
      ).toBe(-300);
    });
  });

  describe('changePct', () => {
    it('returns null when there is no previous value', () => {
      expect(changePct(100, 0)).toBeNull();
    });
    it('rounds to 2 decimals', () => {
      expect(changePct(110, 90)).toBe(22.22);
      expect(changePct(80, 100)).toBe(-20);
    });
  });

  describe('expectedUnitPrice', () => {
    const product = { defaultPrice: 800, wholesalePrice: 720 };
    it('uses retail price for regular customers', () => {
      expect(expectedUnitPrice({ ...product, customerIsWholesale: false, specialPrice: 600 })).toBe(800);
    });
    it('uses the special price for wholesale customers when set', () => {
      expect(expectedUnitPrice({ ...product, customerIsWholesale: true, specialPrice: 650 })).toBe(650);
    });
    it('falls back to wholesale, then retail price', () => {
      expect(expectedUnitPrice({ ...product, customerIsWholesale: true, specialPrice: null })).toBe(720);
      expect(
        expectedUnitPrice({ defaultPrice: 800, wholesalePrice: null, customerIsWholesale: true, specialPrice: null }),
      ).toBe(800);
    });
  });

  describe('priceGap', () => {
    it('ignores gaps of 10% or less', () => {
      expect(priceGap(720, 800)).toBeNull();
      expect(priceGap(800, 800)).toBeNull();
      expect(priceGap(900, 800)).toBeNull();
    });
    it('flags MEDIUM between 10% and 25%', () => {
      expect(priceGap(700, 800)).toEqual({ gapPct: 12.5, severity: 'MEDIUM' });
    });
    it('flags HIGH at 25% or more', () => {
      expect(priceGap(600, 800)).toEqual({ gapPct: 25, severity: 'HIGH' });
    });
    it('ignores products without a price', () => {
      expect(priceGap(0, 0)).toBeNull();
    });
  });

  describe('isUnusualWastage', () => {
    it('needs history to compare against', () => {
      expect(isUnusualWastage(5000, 0)).toBe(false);
    });
    it('ignores small days even if above average', () => {
      expect(isUnusualWastage(400, 100)).toBe(false);
    });
    it('flags days above twice the average', () => {
      expect(isUnusualWastage(1200, 500)).toBe(true);
      expect(isUnusualWastage(1000, 500)).toBe(false);
    });
  });

  describe('isStockShort', () => {
    it('only flags shortages beyond KES 500', () => {
      expect(isStockShort(-500)).toBe(false);
      expect(isStockShort(-501)).toBe(true);
      expect(isStockShort(300)).toBe(false);
    });
  });

  it('eachDay lists every day inclusive', () => {
    expect(eachDay('2026-10-30', '2026-11-02', addDaysYmd)).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ]);
  });
});

describe('formatSummaryPush', () => {
  const summary = {
    date: '2026-11-03',
    sessionStatus: 'CLOSED',
    sales: { count: 84, total: 61200, cash: 22000, mpesa: 31000, credit: 8200 },
    collected: { cash: 24500, mpesa: 31000, total: 55500, fromOldCredit: 2500 },
    expenses: { cash: 1800, mpesa: 400, total: 2200, byCategory: [] },
    drawer: { expectedCash: 22700, netMpesa: 30600 },
    stockCheck: { status: 'SHORT', difference: -1350, productsShort: 2, shortProducts: [] },
  } as any;

  it('summarises the closed day', () => {
    const msg = formatSummaryPush(summary, false);
    expect(msg.title).toBe('Day closed · 2026-11-03');
    expect(msg.body).toContain('Cash in drawer KES 22,700');
    expect(msg.body).toContain('Credit KES 8,200');
    expect(msg.body).toContain('Stock SHORT KES 1,350');
  });

  it('marks the 9 pm summary as still open and skips a pending stock check', () => {
    const msg = formatSummaryPush(
      { ...summary, stockCheck: { status: 'PENDING', difference: null, productsShort: 0, shortProducts: [] } },
      true,
    );
    expect(msg.title).toContain('still open');
    expect(msg.body).not.toContain('Stock');
  });
});
