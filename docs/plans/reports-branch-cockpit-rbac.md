# Plan: Reports, Branch Cockpit & RBAC (Admin vs Cashier)

**Goal:** Richer branch-level reporting, an admin “branch command center” (sessions + sales + inventory + staff), accountant-style drill-down and exports, and strict separation of duties: **cashiers operate; admins correct and govern.**

**Last reviewed:** 2026-03-20

---

## 1. Current baseline (repo)

| Area | Today |
|------|--------|
| Sales **create** | Admin + Cashier |
| Sales **update/delete** | **Admin only** (API + UI) |
| Stock entries **create** | Admin + Cashier |
| Stock entries **update/delete** | **Admin only** (API + UI) |
| Reports | Admin menu; aggregates by branch; limited branch×product clarity |
| Branch picker (admin) | Stock sessions, sales/new, etc. |
| Staff (users) | Admin-only routes |

---

## 2. Target experience

### 2.1 Reporting enhancements

1. **API shapes (additive)** — extend `GET /reports/sales` (and related) with stable IDs:
   - `byBranchProduct`: branchId, productId, qty, paid/unpaid splits, revenue
   - `byBranchCategory`: branchId, category, same measures
   - `byBranchType`: roll-up for `GENERAL_BUTCHERY` vs `PORK_BUTCHERY`
   - Prefer **branchId + name** (avoid grouping only by name)

2. **Filters** — `branchId`, `branchType`, date range, sessionId, productId (existing where applicable).

3. **Exports**
   - **Phase A:** keep client Excel but add sheets for new slices + filter metadata row.
   - **Phase B:** `GET /reports/export?format=csv|xlsx&reportType=sales&...` for auditability and large ranges.

4. **Branch-type presets** — column sets / default filters for pork vs general (config-driven, not hard-coded business rules in UI).

### 2.2 Admin “Branch Cockpit” (new primary UX)

**Route idea:** `/admin/branches/[id]` (or `/dashboard/branch-overview?branchId=`).

**Sections (single scroll or tabs):**

| Section | Contents |
|---------|----------|
| **Summary** | Branch meta, type, active flag, open session indicator |
| **Sessions** | Scoped list (reuse filters from stock sessions API), status, open/closed, drill to `/dashboard/stock?sessionId=&branch=` |
| **Sales** | Period summary, top products, unpaid total, link to sales list with `branchId` |
| **Stock / production** | Opening/incoming/closing/wastage totals for selected session or date range |
| **People** | Users assigned to branch; link to `/admin/users` filtered by branch |
| **Accountant panel** | Trial-style table: session → sales lines / payments / stock movements (read-mostly); **correction actions** only where role allows |

**Entry points:**

- Admin dashboard cards: “View branch” per row.
- Reports page: branch selector → “Open branch cockpit”.

### 2.3 RBAC (enforced API + UI)

| Action | Cashier | Admin |
|--------|---------|-------|
| Create sale | ✅ | ✅ |
| Record payment | ✅ (if you keep today) | ✅ |
| **Edit / delete sale** | ❌ | ✅ |
| **Create** stock entries (operational capture) | ✅ | ✅ |
| **Edit / delete** stock entries (corrections) | ❌ | ✅ |
| Open/close session | ✅ (as today) | ✅ |
| Products, recipes, masters | ✅ (today via cashier menu — **optional tightening later**) | ✅ |
| Reports, branch cockpit, users | ❌ | ✅ |

**Note:** If you want cashiers to **never** mutate stock after submit, narrow **create** to admin only in a later phase; that changes day-to-day workflow.

**Auditing (recommended next):** log admin corrections (sale update/delete, stock entry update/delete) with userId, timestamp, before/after snapshot.

---

## 3. Implementation phases

### Phase 0 — Quick wins (this iteration)

- [x] Stock entries **PATCH/DELETE**: **Admin only** (API).
- [x] Stock UI: **edit/delete** entry rows **admin only**.
- [x] Docs: role guide aligned with “cashier cannot edit stock/sales (corrections)”.
- Sales edit/delete: already admin-only API; list + detail UI already gated.

### Phase 1 — Reporting data model

- Add `byBranchProduct`, `byBranchCategory`, `byBranchType` to reports service.
- Add branch-type filter to report DTOs.
- Extend Excel export on reports page.

### Phase 2 — Branch Cockpit UI

- New admin page + deep links from dashboard/reports.
- Reuse existing APIs; add one **aggregated** endpoint only if it reduces round-trips (`GET /branches/:id/snapshot?from=&to=`).

### Phase 3 — Accountant workflows

- Payment adjustments / void rules (if not already covered).
- Optional: readonly “audit” role later (`staff` / `owner` read-only).

### Phase 4 — Server-side export & jobs

- Export endpoint + async job for long ranges + email/download link.

---

## 4. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Cashiers need to fix a typo in stock | Process: admin corrects; or add “request correction” note |
| Duplicate branch names in old data | Group reports by `branchId` |
| Performance on large date ranges | Backend export + pagination on cockpit lists |

---

## 5. Definition of done

- Admin can pick a branch and see **sessions, sales, and stock story** without hunting four pages.
- Reports answer **what sold where** (branch × product/category).
- **No cashier** can call APIs successfully to **update/delete** sales or stock entries.
- Manual / role guide matches behavior.
