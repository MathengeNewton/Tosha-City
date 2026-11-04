import { SessionStatus } from '../../modules/stock-sessions/entities/stock-session.entity';

/** Today's date (YYYY-MM-DD) in the shop's time zone. */
export function nairobiToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());
}

/** Postgres `date` columns come back as 'YYYY-MM-DD' strings even though entities type them as Date. */
function sessionDay(date: Date | string): string {
  if (typeof date === 'string') return date.slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Non-admin staff only see the open session and today's sessions; past days are admin-only. */
export function isCurrentSession(session: { status: SessionStatus; date: Date | string }): boolean {
  return session.status === SessionStatus.OPEN || sessionDay(session.date) === nairobiToday();
}

/** SQL form of isCurrentSession for a stock_session alias; bind `shopToday` to nairobiToday(). */
export function currentSessionSql(alias: string): string {
  return `(${alias}.status = '${SessionStatus.OPEN}' OR ${alias}.date = CAST(:shopToday AS date))`;
}
