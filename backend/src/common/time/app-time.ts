/** Application timezone — Kenya (East Africa Time, UTC+3, no DST). */
export const DEFAULT_APP_TIMEZONE = 'Africa/Nairobi';

/** Fixed offset for Nairobi (no daylight saving). */
export const APP_TZ_OFFSET = '+03:00';

export function getAppTimeZone(): string {
  const fromEnv = process.env.APP_TIMEZONE?.trim();
  return fromEnv || DEFAULT_APP_TIMEZONE;
}

/** Calendar date YYYY-MM-DD in the app timezone. */
export function ymdInTimeZone(date: Date, timeZone = getAppTimeZone()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function todayYmdInAppTz(now = new Date()): string {
  return ymdInTimeZone(now);
}

export function yearInAppTz(now = new Date()): number {
  return parseInt(ymdInTimeZone(now).slice(0, 4), 10);
}

/** Postgres `date` column: UTC midnight for the given calendar day. */
export function parseYmdToDate(ymd: string): Date {
  const normalized = ymd.trim().split('T')[0];
  const [y, m, d] = normalized.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d || Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) {
    throw new Error(`Invalid date: ${ymd}`);
  }
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDaysYmd(ymd: string, deltaDays: number): string {
  const base = parseYmdToDate(ymd);
  base.setUTCDate(base.getUTCDate() + deltaDays);
  const y = base.getUTCFullYear();
  const m = String(base.getUTCMonth() + 1).padStart(2, '0');
  const d = String(base.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Start of calendar day in app TZ (for timestamptz filters). */
export function startOfDayInAppTz(ymd: string): Date {
  const normalized = ymd.trim().split('T')[0];
  return new Date(`${normalized}T00:00:00${APP_TZ_OFFSET}`);
}

/** End of calendar day in app TZ (for timestamptz filters). */
export function endOfDayInAppTz(ymd: string): Date {
  const normalized = ymd.trim().split('T')[0];
  return new Date(`${normalized}T23:59:59.999${APP_TZ_OFFSET}`);
}

/** Normalize input to a session / business `date` column value. */
export function normalizeToSessionDate(input?: string | Date | null): Date {
  if (input == null || input === '') {
    return parseYmdToDate(todayYmdInAppTz());
  }
  if (typeof input === 'string') {
    return parseYmdToDate(input);
  }
  return parseYmdToDate(ymdInTimeZone(input));
}

/** Sunday-based week start (matches existing reports behaviour). */
export function startOfWeekSundayYmd(now = new Date()): string {
  const todayYmd = ymdInTimeZone(now);
  const dow = parseYmdToDate(todayYmd).getUTCDay();
  return addDaysYmd(todayYmd, -dow);
}

export function formatInstantForDisplay(
  value: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (value == null || value === '') return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-KE', {
    timeZone: getAppTimeZone(),
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    ...options,
  }).format(date);
}

export function formatYmdForDisplay(ymdOrDate: string | Date): string {
  const ymd =
    typeof ymdOrDate === 'string'
      ? ymdOrDate.split('T')[0]
      : ymdInTimeZone(ymdOrDate);
  const d = parseYmdToDate(ymd);
  return new Intl.DateTimeFormat('en-KE', {
    timeZone: getAppTimeZone(),
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}
