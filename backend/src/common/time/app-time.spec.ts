import {
  addDaysYmd,
  formatInstantForDisplay,
  getAppTimeZone,
  parseYmdToDate,
  startOfDayInAppTz,
  todayYmdInAppTz,
  ymdInTimeZone,
} from './app-time';

describe('app-time', () => {
  const TZ = 'Africa/Nairobi';

  beforeEach(() => {
    process.env.APP_TIMEZONE = TZ;
  });

  afterEach(() => {
    delete process.env.APP_TIMEZONE;
  });

  it('getAppTimeZone defaults to Africa/Nairobi', () => {
    delete process.env.APP_TIMEZONE;
    expect(getAppTimeZone()).toBe('Africa/Nairobi');
  });

  it('todayYmdInAppTz uses Nairobi calendar at UTC evening', () => {
    // 2025-05-04 22:00 UTC = 2025-05-05 01:00 EAT
    const now = new Date('2025-05-04T22:00:00.000Z');
    expect(todayYmdInAppTz(now)).toBe('2025-05-05');
  });

  it('todayYmdInAppTz uses same day before Nairobi midnight UTC', () => {
    const now = new Date('2025-05-04T20:00:00.000Z');
    expect(todayYmdInAppTz(now)).toBe('2025-05-04');
  });

  it('parseYmdToDate round-trips through ymdInTimeZone for session dates', () => {
    const parsed = parseYmdToDate('2025-05-04');
    expect(ymdInTimeZone(parsed, TZ)).toBe('2025-05-04');
  });

  it('startOfDayInAppTz is midnight EAT (+03)', () => {
    const start = startOfDayInAppTz('2025-05-04');
    expect(start.toISOString()).toBe('2025-05-03T21:00:00.000Z');
  });

  it('addDaysYmd shifts calendar days', () => {
    expect(addDaysYmd('2025-05-04', 1)).toBe('2025-05-05');
    expect(addDaysYmd('2025-05-04', -1)).toBe('2025-05-03');
  });

  it('formatInstantForDisplay formats in Nairobi', () => {
    const s = formatInstantForDisplay(new Date('2025-05-04T09:30:00.000Z'));
    expect(s).toMatch(/2025/);
    expect(s).toMatch(/12:30/);
  });
});
