# Plan: Owner APIs & Owner Mobile App

**Goal:** Give the business owner a read-only phone app that answers, every evening: how much came in, how much went out, how much cash should be in the drawer, whether anything looks wrong, and how the business is trending.

**Branch:** `toshacity-original` (single shop)

**Decisions so far**

| Question | Decision |
|----------|----------|
| Profit / margins | Out of scope for now — owner will define how cost is calculated |
| Existing revenue figures on web dashboard and reports | Not changed |
| Opening float in the cash drawer | None — drawer starts empty |
| Mobile platform | Android only (Expo / React Native) |
| Push notifications | In the first version |

---

## 1. Owner APIs (backend)

New NestJS module `backend/src/modules/owner/`, routes under `/api/owner/*`.

- Guarded by `JwtAuthGuard` + `RolesGuard`, roles `owner` and `admin`.
- Read-only. No existing endpoint, report or screen changes behaviour.
- The `owner` role already exists in `UserRole`; it just isn't used yet.

### 1.1 Daily money summary — `GET /owner/daily-summary?date=YYYY-MM-DD`

Defaults to today (app timezone, Africa/Nairobi).

```json
{
  "date": "2026-11-03",
  "sessionStatus": "OPEN",
  "sales": {
    "count": 84,
    "total": 61200,
    "cash": 22000,
    "mpesa": 31000,
    "credit": 8200
  },
  "collected": {
    "cash": 24500,
    "mpesa": 31000,
    "fromOldCredit": 2500
  },
  "expenses": {
    "cash": 1800,
    "mpesa": 400,
    "total": 2200,
    "byCategory": [{ "category": "TRANSPORT", "amount": 900, "count": 3 }]
  },
  "drawer": {
    "expectedCash": 22700,
    "netMpesa": 30600
  },
  "stockCheck": {
    "status": "SHORT",
    "difference": -1350,
    "productsShort": 2
  }
}
```

**Definitions** (these are owner-app definitions; the existing web "Today's Revenue" stays as it is):

| Field | Meaning | Source |
|-------|---------|--------|
| `sales.total` | Value of every sale made that day, including credit | `sale.totalAmount` by `soldAt` |
| `sales.cash` / `sales.mpesa` | Paid against that day's sales, by method | `sale_payments` on those sales |
| `sales.credit` | Part of that day's sales still unpaid | total − paid |
| `collected.*` | Money received that day by `receivedAt`, including old credit paid back | `sale_payments` |
| `collected.fromOldCredit` | Of the above, payments for sales made on earlier days | `sale_payments` joined to `sale.soldAt` |
| `expenses.*` | Expenses recorded that day, split by how they were paid | `expense` (`paymentMethod`, `category`) |
| `drawer.expectedCash` | `collected.cash − expenses.cash` (no opening float) | derived |
| `drawer.netMpesa` | `collected.mpesa − expenses.mpesa` | derived |
| `stockCheck` | Result of the existing short/excess check for that day's session | `ReconciliationService` |

### 1.2 Warning signs — `GET /owner/alerts?from=&to=`

Defaults to the last 7 days. Returns a list sorted newest first:

```json
{
  "alerts": [
    {
      "type": "SALE_DELETED",
      "severity": "HIGH",
      "date": "2026-11-03T15:42:00+03:00",
      "title": "Sale #S-1042 deleted",
      "amount": 3400,
      "user": "jane",
      "ref": { "entity": "sale", "id": 1042 }
    }
  ],
  "counts": { "HIGH": 2, "MEDIUM": 5, "LOW": 1 }
}
```

| Type | Rule | Source |
|------|------|--------|
| `SALE_DELETED` | Any sale deletion | Activity log `SALE_DELETED` |
| `SALE_UPDATED` | Any change after the sale was made | Activity log `SALE_UPDATED` |
| `STOCK_ENTRY_CHANGED` | Stock entry edited or deleted | Activity log `STOCK_ENTRY_UPDATED` / `STOCK_ENTRY_DELETED` |
| `EXPENSE_CHANGED` | Expense edited or deleted | Activity log `EXPENSE_UPDATED` / `EXPENSE_DELETED` |
| `PRICE_BELOW_EXPECTED` | Sale line charged more than X% below the expected price (customer special price → wholesale → retail `defaultPrice`) | `sale_item.unitPrice` vs product / customer prices |
| `STOCK_SHORT` | Daily stock check short by more than KES Y | `ReconciliationService` |
| `HIGH_WASTAGE` | Day's wastage (kg or value) above Z × the 30-day daily average | `stock_entry` type `WASTAGE` |

**Starting thresholds** (constants first, admin-editable settings later): X = 10%, Y = KES 500, Z = 2×.

**Prerequisite fix:** `SALE_DELETED` currently only stores the sale number in the activity log. Store the total amount, items and payment status too, so the alert can show what was removed. Same for `STOCK_ENTRY_DELETED` (product, quantity, type).

### 1.3 Trends — `GET /owner/trends?days=30`

```json
{
  "range": { "from": "2026-10-05", "to": "2026-11-03" },
  "daily": [
    { "date": "2026-11-03", "salesCount": 48, "salesTotal": 61200, "collected": 55500, "expenses": 2200, "wastageQty": 3.5 }
  ],
  "products": {
    "best":  [{ "productId": 1, "product": "Beef", "unit": "kg", "qty": 420.5, "amount": 336400 }],
    "worst": [{ "productId": 9, "product": "Liver", "unit": "kg", "qty": 4.0, "amount": 2400 }]
  },
  "expensesByCategory": [{ "category": "TRANSPORT", "amount": 18400, "count": 41 }],
  "comparison": {
    "salesTotal": { "current": 1650000, "previous": 1510000, "changePct": 9.27 },
    "salesCount": { "current": 1310, "previous": 1250, "changePct": 4.8 },
    "collected":  { "current": 1580000, "previous": 1490000, "changePct": 6.04 },
    "expenses":   { "current": 64000,   "previous": 58000,   "changePct": 10.34 }
  }
}
```

- `days` limited to 7–90.
- Best/worst ranked by amount; active sellable products (not kitchen supplies or consumables) with no sales are listed as worst.
- `comparison` compares against the previous period of the same length. `changePct` is `null` when the previous period was zero.

### 1.4 Who owes me — `GET /owner/credit`

```json
{
  "totalOwed": 18600,
  "customers": [
    { "customerId": 12, "customer": "Mama Njeri Hotel", "phone": "0712…", "owed": 12400, "sales": 3, "oldestUnpaid": "2026-10-21T10:15:00.000Z" }
  ]
}
```

- Unpaid and part-paid sales, owed = sale total − payments. Sales without a customer are grouped as "Walk-in".

### 1.5 Supporting backend work

- **Owner account:** seed/create a user with role `owner`. Block owner accounts from cashier screens on the web app (layout/nav role check).
- **Mobile login:** `JWT_EXPIRES_IN` defaults to `1d`. Add a refresh token (`POST /auth/refresh`) so the owner isn't logged out daily.
- **Push devices:** new `owner_device` table (`userId`, `expoPushToken`, `platform`, `lastSeenAt`) and:
  - `POST /owner/devices` — register/refresh token on app start
  - `DELETE /owner/devices/:token` — on logout
- **Tests:** unit tests for the drawer calculation and each alert rule.

---

## 2. Push notifications (v1)

Using Expo Push Service. **Android still needs a Firebase project:** Expo delivers through FCM, so the app needs `google-services.json` (set as `android.googleServicesFile` in `mobile/app.json`) and an FCM V1 service account key uploaded to EAS (`eas credentials`). Never commit the service account key.

| Notification | Trigger | Content |
|--------------|---------|---------|
| Evening summary | Session closed (`SESSION_CLOSED`) | "Today: KES 61,200 sales · KES 22,700 cash expected · stock SHORT KES 1,350" |
| Fallback summary | 21:00 Nairobi if the session is still open | Same, marked "session still open" |
| Serious warning | Immediately when a `HIGH` alert happens (sale deleted, stock short beyond threshold) | "Sale #S-1042 (KES 3,400) deleted by jane" |

- Backend: `OwnerNotificationsService` checks every 5 minutes (plain `setInterval`, no new dependency) for closed sessions, the 21:00 fallback and new `HIGH` alerts from the last 2 hours. Stock-short warnings are left out of pushes because the evening summary already includes them.
- Each push is recorded in `owner_notification` with a unique key, so nothing is sent twice (also safe across restarts).
- Failed/expired tokens (`DeviceNotRegistered`) are removed automatically.
- Env vars: `OWNER_PUSH_ENABLED` (default on; set `false` to stop pushes), `OWNER_PUSH_INTERVAL_MS` (default 300000), `EXPO_ACCESS_TOKEN` (optional, if push security is enabled on the Expo project), `JWT_REFRESH_EXPIRES_IN` (default `30d`).
- Tapping a notification opens the matching screen (Today or the alert detail).

---

## 3. Owner mobile app (Android)

**Stack:** Expo (React Native, JavaScript to match the web app), Expo Router, `expo-secure-store` for tokens, `expo-notifications`. Charts are simple bars drawn with plain views (no chart library).

**Location:** new `mobile/` folder in this repo. Shares the API base URL convention with the web app (`https://<api-domain>/api`).

### Screens

1. **Login** — username/email + password; stores access + refresh token securely; registers push token.
2. **Today** — big "Expected cash in drawer" number; sales split cash / M-Pesa / credit; collected incl. old credit; expenses by category; stock check status. Previous/next day arrows for past days. Pull to refresh.
3. **Warnings** — counts by severity, list with severity colours; tap for detail (who, when, amount, what changed). 7 / 14 / 30-day toggle.
4. **Trends** — 30-day chart (sales vs collected vs expenses), best/worst sellers, expenses by category, period comparison. 7 / 30 / 90-day toggle.
5. **Who owes me** — credit customers sorted by amount owed, with oldest unpaid date and tap-to-call.
6. **Settings** — logout, notification on/off, send a test notification.

### Distribution

- One-time setup: `npx eas-cli login`, then `npx eas-cli init` inside `mobile/` (adds the EAS `projectId` that push tokens need), then the Firebase steps in section 2.
- Build with EAS Build (`npm run build:apk` in `mobile/`); first install as an APK directly on the owner's phone. Push does not work in Expo Go on Android.
- Move to Play Store (internal testing track) once stable.

---

## 4. Phases

| # | Work | Rough size |
|---|------|------------|
| 1 | Owner module skeleton, owner role guard, owner account, `GET /owner/daily-summary` | 1–2 days |
| 2 | Activity log enrichment + `GET /owner/alerts` | 2 days |
| 3 | `GET /owner/trends` | 1 day |
| 4 | Refresh token + push device registration | 1 day |
| 5 | Mobile app: login, Today, Warnings, Trends, Who owes me | 4–5 days |
| 6 | Push notifications (evening summary, fallback, serious warnings) | 1–2 days |
| 7 | APK to owner, feedback round, Play Store internal track | 1 day + feedback |

Phases 1–3 can be checked on Swagger (`/api/docs`) before the app exists.

---

## 5. Known differences & open items

- **Owner numbers vs web dashboard:** the web dashboard's "Today's Revenue" counts only fully paid sales. The owner app shows total sales (incl. credit) and money collected separately, so the two will not match. This is intentional; the web figures are left unchanged for now.
- **Profit:** to be added once the owner explains how buying cost should be recorded (per delivery, per kg, per carcass, etc.).
- **Alert thresholds:** confirm X / Y / Z with the owner after the first week of real data.
