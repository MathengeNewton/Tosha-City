/** Kenya (EAT) — matches backend APP_TIMEZONE / Africa/Nairobi */
export const APP_TIMEZONE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_TIMEZONE) ||
  "Africa/Nairobi";

/** YYYY-MM-DD in app timezone */
export function ymdInAppTz(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date instanceof Date ? date : new Date(date));
}

export function todayYmd() {
  return ymdInAppTz(new Date());
}

export function addDaysYmd(ymd, deltaDays) {
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Default filter range: last N days through today (Nairobi calendar). */
export function defaultDateRangeYmd(daysBack = 30) {
  const dateTo = todayYmd();
  const dateFrom = addDaysYmd(dateTo, -daysBack);
  return { dateFrom, dateTo };
}

/** YYYY-MM-DD from API date field (session date, etc.). */
export function ymdFromApiDate(value) {
  if (!value) return todayYmd();
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  return ymdInAppTz(new Date(value));
}

export function formatDateTime(value, options = {}) {
  if (value == null || value === "") return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    ...options,
  }).format(date);
}

export function formatDate(value, options = {}) {
  if (value == null || value === "") return "";
  const ymd =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)
      ? value.slice(0, 10)
      : ymdInAppTz(new Date(value));
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  }).format(date);
}
