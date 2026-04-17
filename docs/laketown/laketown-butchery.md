# LakeTown Butchery

LakeTown Butchery is a **branch-based** management system for daily operations: stock sessions, production, sales, payments, partners, and reporting. This document describes the **multi-branch architecture**, **branch types** (general vs pork), and how **staff** are organised—including **general butchery staff** and **pork staff**.

For hands-on procedures (screens, clicks, checklists), see the [user manual](../manual/index.md) and [admin setup guide](../manual/admin-setup-guide.md).

---

## 1. What “branch” means

A **branch** is a **business location or operating unit**. In the system, almost all day-to-day work is **scoped to one branch at a time**:

- **Stock sessions** (opening, incoming, closing, wastage) belong to a branch.
- **Sales** and **payments** are recorded against a branch.
- **Users** who are not global admins are **assigned to a branch** so they only operate in that outlet’s context.

Branches are created and maintained by **admin** users. Each branch has at least:

| Field | Purpose |
|--------|---------|
| **Name** | Full display name (e.g. “Lake Town Main Butchery”). |
| **Code** | Short, unique code staff recognise quickly (e.g. `MAIN`, `PORK-01`). |
| **Type** | **General butchery** or **Pork butchery** (see below). |
| **Active** | Inactive branches can be hidden from normal selection while keeping history. |

---

## 2. Multi-branch system

### 2.1 Why multiple branches exist

LakeTown can run **more than one outlet**—for example a **general** line and a **pork-focused** line, or several locations under one brand. The system keeps **operational data per branch** so you can:

- Open and close **stock sessions** per location.
- See **sales and inventory** without mixing branches accidentally.
- Review **reports** by branch (and, where supported, roll up by **branch type**).

### 2.2 How isolation works in practice

- **Stock sessions** are tied to a **single branch**. Opening stock, incoming deliveries, production, sales, and closing stock for a day belong to that branch’s session.
- **Sales** are stored with branch context so reporting and receipts reflect the correct outlet.
- **Staff** who work a single counter should have **one branch** assigned. They should **confirm the branch** after login before starting work (see [role guide](../manual/role-guide.md)).

### 2.3 Admin vs branch staff

| Audience | Typical scope |
|----------|----------------|
| **Admin** | Creates branches, assigns users to branches, reviews **all-branch** reporting, and performs **corrections** (e.g. edit/delete saved sales or stock entries per policy). |
| **Cashier / operational roles** | Day-to-day work **within the assigned branch**: sessions, stock capture, production, sales, payments. |

Exact permissions follow **role** names in the system (e.g. `admin`, `cashier`, `kitchen`, `waiter`). The [role guide](../manual/role-guide.md) describes admin vs cashier in detail.

---

## 3. Branch types: general butchery vs pork butchery

Each branch has a **type** that classifies the outlet. In the application this distinguishes:

| Type | Enum value (technical) | Typical use |
|------|-------------------------|-------------|
| **General butchery** | `GENERAL_BUTCHERY` | Mixed meat, beef-led, or “main” butchery lines; general retail and production. |
| **Pork butchery** | `PORK_BUTCHERY` | Outlets emphasising **pork** products, recipes, and sales (e.g. pork fry, pork-led prepared items). |

**Important:** Branch type is **metadata** for the outlet. It helps reporting and filtering (e.g. comparing general vs pork performance). It does **not** replace **product** or **recipe** setup—you still define **products**, **recipes**, and **branch scope** on recipes as described in the [admin setup guide](../manual/admin-setup-guide.md).

---

## 4. Individual branch details

Use this section (and the **branch register** below) as your **single source of truth** for each physical location. Update it when you add branches or change codes.

### 4.1 What to record per branch

For each branch, document:

- **Name** and **code** (must match what is entered in **Branches** in the app).
- **Type**: General butchery or Pork butchery.
- **Address / notes** (optional but useful for staff and auditors).
- **Primary contact** (manager or lead cashier).
- **Which roles** are staffed (cashier, kitchen, etc.).

### 4.2 Branch register (template)

Copy and fill one row per outlet. Replace placeholders with your real sites.

| Branch name | Code | Type | Address / notes | Lead contact | Notes |
|-------------|------|------|-----------------|--------------|--------|
| *Example: Lake Town Main* | `MAIN` | General butchery | *Street, city* | *Name / phone* | *e.g. flagship retail* |
| *Example: Lake Town Pork Counter* | `PORK` | Pork butchery | *Street, city* | *Name / phone* | *pork-focused line* |
| | | | | | |

Keep this table aligned with **Admin → Branches** so codes and types never drift from production data.

---

## 5. Staff: general butchery vs pork staff

The system does **not** use separate login types named “pork staff” or “general staff.” Instead:

1. Each **user** has one or more **roles** (e.g. `admin`, `cashier`, `kitchen`, `waiter`, `staff`, …).
2. Non-admin operational users have a **branch assignment** (`branchId`).
3. That branch has a **type**—**general** or **pork**.

So:

- **General butchery staff** are users **assigned to a branch whose type is General butchery**. They run sessions, sales, and production for that general outlet.
- **Pork staff** are users **assigned to a branch whose type is Pork butchery**. They run sessions, sales, and production for the pork outlet.

The **same role name** (e.g. **cashier**) can exist in both environments; what differs is **which branch** they belong to and therefore **which stock session and sales** they touch.

### 5.1 Typical responsibilities (conceptual)

| Concern | General butchery staff | Pork staff |
|---------|-------------------------|------------|
| **Scope** | Branch typed **General butchery**. | Branch typed **Pork butchery**. |
| **Daily work** | Stock session, stock entries, production, sales, payments—**for their branch**. | Same operational pattern—**for their pork branch**. |
| **Products / recipes** | Driven by **products** and **recipes** you configured (including branch scope on recipes). | Same; pork outlets often emphasise pork **products** and **recipes** (e.g. prepared pork lines). |
| **Reporting** | Branch-level reports for their location; admins see all branches. | Same. |

### 5.2 Admin responsibilities for staff setup

- Create the **branch** first with the correct **type** (general vs pork).
- Create **users**, assign **roles**, and assign the **correct branch** before go-live.
- **Admins** may be global (no branch) or tied to a branch depending on how you configure accounts; **cashiers** should always have the branch where they physically work.

See [Admin Setup Guide — Step 1 & 2](../manual/admin-setup-guide.md) (branches, then users).

### 5.3 Role names in the system

The application supports multiple **role** values (e.g. admin, cashier, kitchen, waiter, field agent, staff, vet, partner, owner). Day-to-day documentation in this repository often highlights **admin** and **cashier**; your organisation may use **kitchen** / **waiter** for restaurant or counter flows. Always check the **Users** screen for the live list of roles assigned to each person.

---

## 6. Related documentation

| Document | Content |
|----------|---------|
| [User manual index](../manual/index.md) | Training manual TOC |
| [Role guide](../manual/role-guide.md) | Admin vs cashier, branch responsibility rule |
| [Admin setup guide](../manual/admin-setup-guide.md) | Order of setup: branches → users → products → recipes |
| [Reports guide](../manual/reports-guide.md) | Branch-level reporting (admin) |
| [Plans: reports & branch cockpit](../plans/reports-branch-cockpit-rbac.md) | Future enhancements (branch-type roll-ups, cockpit) |

---

## 7. Summary

- **Multi-branch** operation keeps **sessions, stock, and sales** scoped per **branch**.
- Each branch has a **type**: **General butchery** or **Pork butchery**, used for classification and reporting.
- **General butchery staff** vs **pork staff** are distinguished by **which branch (and thus which type)** a user is assigned to, combined with their **role** (cashier, kitchen, etc.).
- Maintain an explicit **branch register** (table above) alongside the in-app **Branches** screen so operations and documentation stay aligned.
