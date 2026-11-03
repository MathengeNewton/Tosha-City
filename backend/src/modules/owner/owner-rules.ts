/** Thresholds for owner warnings. Tune with the owner after real data comes in. */
export const OWNER_ALERT_RULES = {
  /** Sale line charged more than this fraction below the expected price. */
  priceGapPct: 0.1,
  /** Price gap at or above this fraction is HIGH severity. */
  priceGapHighPct: 0.25,
  /** Closed-session stock check short by more than this (KES). */
  stockShortKes: 500,
  /** Day's wastage value above this multiple of the daily average. */
  wastageMultiplier: 2,
  /** Ignore wastage days below this value (KES) even if above the average. */
  wastageMinKes: 500,
  /** Days of history used for the wastage average. */
  wastageBaselineDays: 30,
};

export type AlertSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** No opening float: the drawer starts empty each day. */
export function computeDrawer(input: {
  collectedCash: number;
  collectedMpesa: number;
  expensesCash: number;
  expensesMpesa: number;
}) {
  return {
    expectedCash: round2(input.collectedCash - input.expensesCash),
    netMpesa: round2(input.collectedMpesa - input.expensesMpesa),
  };
}

/** Percentage change; null when there is nothing to compare against. */
export function changePct(current: number, previous: number): number | null {
  if (!previous) return null;
  return round2(((current - previous) / previous) * 100);
}

/**
 * Expected unit price for a sale line:
 * wholesale customer → their special price → product wholesale price → retail price.
 */
export function expectedUnitPrice(input: {
  defaultPrice: number;
  wholesalePrice: number | null;
  customerIsWholesale: boolean;
  specialPrice: number | null;
}): number {
  if (!input.customerIsWholesale) return Number(input.defaultPrice) || 0;
  if (input.specialPrice != null) return Number(input.specialPrice);
  return Number(input.wholesalePrice ?? input.defaultPrice) || 0;
}

/** Returns the gap if the charged price is below expected by more than the rule; otherwise null. */
export function priceGap(
  charged: number,
  expected: number,
  rules = OWNER_ALERT_RULES,
): { gapPct: number; severity: AlertSeverity } | null {
  if (!(expected > 0)) return null;
  const gapPct = (expected - charged) / expected;
  if (gapPct <= rules.priceGapPct) return null;
  return {
    gapPct: round2(gapPct * 100),
    severity: gapPct >= rules.priceGapHighPct ? 'HIGH' : 'MEDIUM',
  };
}

/** A wastage day is unusual when it is well above the recent daily average and not trivially small. */
export function isUnusualWastage(
  dayValue: number,
  baselineDailyAverage: number,
  rules = OWNER_ALERT_RULES,
): boolean {
  if (!(baselineDailyAverage > 0)) return false;
  return (
    dayValue >= rules.wastageMinKes &&
    dayValue > baselineDailyAverage * rules.wastageMultiplier
  );
}

export function isStockShort(difference: number, rules = OWNER_ALERT_RULES): boolean {
  return difference < -rules.stockShortKes;
}

/** Every YYYY-MM-DD from `from` to `to` inclusive. */
export function eachDay(from: string, to: string, addDays: (ymd: string, n: number) => string): string[] {
  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}
