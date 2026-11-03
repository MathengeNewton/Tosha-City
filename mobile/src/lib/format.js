export const APP_TIMEZONE = 'Africa/Nairobi';

export function kes(value, { decimals = 0 } = {}) {
  const n = Number(value) || 0;
  return `KES ${n.toLocaleString('en-KE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function compactKes(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(Math.round(n));
}

/** Today as YYYY-MM-DD in Nairobi time. */
export function todayYmd() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function addDaysYmd(ymd, delta) {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + delta));
  return date.toISOString().slice(0, 10);
}

export function prettyDay(ymd) {
  const today = todayYmd();
  if (ymd === today) return 'Today';
  if (ymd === addDaysYmd(today, -1)) return 'Yesterday';
  const [y, m, d] = ymd.split('-').map(Number);
  return new Intl.DateTimeFormat('en-KE', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function prettyDateTime(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-KE', {
    timeZone: APP_TIMEZONE,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

export function titleCase(value) {
  if (!value) return '';
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function pct(value) {
  if (value == null) return '–';
  return `${value > 0 ? '+' : ''}${value}%`;
}
