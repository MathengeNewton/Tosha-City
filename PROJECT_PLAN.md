# ToshaCity Butchery Management System - Project Plan

## Overview
A comprehensive management system for small to medium-sized butcheries to track stock, sales, wastage, and generate reports.

## Core Workflow
1. **Morning**: Cashier logs in → Enter opening stock → Enter incoming stock
2. **During Day**: Process sales → Generate receipts → Record payments
3. **End of Day**: Record leftover stock → Record wastage (with photos) → Close day
4. **Next Day**: Cannot sell until opening stock is entered (leftover + incoming)

---

## 1. Database Schema Design

### 1.1 Products Table
```typescript
Product {
  id: number (PK)
  name: string (unique) // "Beef", "Mutton", "Beef Matumbo", "Mutton Matumbo"
  unit: string // "kg" or "pieces"
  defaultPrice: decimal // Default price per unit
  isActive: boolean
  createdAt: timestamp
  updatedAt: timestamp
}
```

### 1.2 Daily Stock Sessions Table
```typescript
StockSession {
  id: number (PK)
  date: date (unique, indexed)
  openedBy: number (FK -> User)
  openedAt: timestamp
  closedAt: timestamp (nullable)
  status: enum ['OPEN', 'CLOSED'] // Cannot sell if not OPEN
  createdAt: timestamp
  updatedAt: timestamp
}
```

### 1.3 Stock Entries Table
```typescript
StockEntry {
  id: number (PK)
  sessionId: number (FK -> StockSession)
  productId: number (FK -> Product)
  type: enum ['OPENING', 'INCOMING', 'CLOSING', 'WASTAGE']
  quantity: decimal
  unit: string
  notes: string (nullable)
  photoUrl: string (nullable) // For wastage evidence
  recordedBy: number (FK -> User)
  recordedAt: timestamp
  createdAt: timestamp
}
```

### 1.4 Sales Table
```typescript
Sale {
  id: number (PK)
  sessionId: number (FK -> StockSession)
  saleNumber: string (unique, auto-generated) // e.g., "SALE-2024-001"
  totalAmount: decimal
  paymentMethod: enum ['CASH', 'MPESA'] // Start with CASH
  paymentStatus: enum ['PENDING', 'PAID']
  soldBy: number (FK -> User)
  soldAt: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}
```

### 1.5 Sale Items Table
```typescript
SaleItem {
  id: number (PK)
  saleId: number (FK -> Sale)
  productId: number (FK -> Product)
  quantity: decimal
  unitPrice: decimal
  totalPrice: decimal
  createdAt: timestamp
}
```

### 1.6 Payments Table
```typescript
Payment {
  id: number (PK)
  saleId: number (FK -> Sale, unique)
  amount: decimal
  method: enum ['CASH', 'MPESA']
  mpesaReference: string (nullable) // For MPESA transactions
  receivedBy: number (FK -> User)
  receivedAt: timestamp
  createdAt: timestamp
}
```

### 1.7 User Roles (Extend existing)
- Add new role: `CASHIER`
- Keep existing: `ADMIN`

---

## 2. Backend Modules & API Endpoints

### 2.1 Products Module
**Module**: `modules/products/`

**Endpoints**:
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (Admin only)
- `PUT /api/products/:id` - Update product (Admin only)
- `DELETE /api/products/:id` - Delete product (Admin only)

**Files**:
- `products.module.ts`
- `products.controller.ts`
- `products.service.ts`
- `dto/create-product.dto.ts`
- `dto/update-product.dto.ts`
- `entities/product.entity.ts`

### 2.2 Stock Sessions Module
**Module**: `modules/stock-sessions/`

**Endpoints**:
- `GET /api/stock-sessions` - List sessions (with filters: date, status)
- `GET /api/stock-sessions/current` - Get current open session
- `GET /api/stock-sessions/:id` - Get session details with all entries
- `POST /api/stock-sessions/open` - Open new session (Cashier+)
- `POST /api/stock-sessions/:id/close` - Close session (Cashier+)
- `GET /api/stock-sessions/:id/stock-summary` - Get stock summary for session

**Files**:
- `stock-sessions.module.ts`
- `stock-sessions.controller.ts`
- `stock-sessions.service.ts`
- `dto/open-session.dto.ts`
- `dto/close-session.dto.ts`
- `entities/stock-session.entity.ts`

### 2.3 Stock Entries Module
**Module**: `modules/stock-entries/`

**Endpoints**:
- `POST /api/stock-entries` - Create stock entry (opening/incoming/closing/wastage)
- `GET /api/stock-entries` - List entries (with filters: sessionId, productId, type)
- `GET /api/stock-entries/:id` - Get entry details
- `PUT /api/stock-entries/:id` - Update entry (before session closed)
- `DELETE /api/stock-entries/:id` - Delete entry (before session closed)

**Files**:
- `stock-entries.module.ts`
- `stock-entries.controller.ts`
- `stock-entries.service.ts`
- `dto/create-stock-entry.dto.ts`
- `dto/update-stock-entry.dto.ts`
- `entities/stock-entry.entity.ts`

### 2.4 Sales Module
**Module**: `modules/sales/`

**Endpoints**:
- `POST /api/sales` - Create sale (with items)
- `GET /api/sales` - List sales (with filters: date, sessionId, cashier)
- `GET /api/sales/:id` - Get sale details with items
- `GET /api/sales/:id/receipt` - Generate/download receipt (PDF)
- `PUT /api/sales/:id` - Update sale (before payment confirmed)
- `DELETE /api/sales/:id` - Cancel sale (before payment confirmed)

**Files**:
- `sales.module.ts`
- `sales.controller.ts`
- `sales.service.ts`
- `dto/create-sale.dto.ts`
- `dto/update-sale.dto.ts`
- `entities/sale.entity.ts`
- `entities/sale-item.entity.ts`

### 2.5 Payments Module
**Module**: `modules/payments/` (can extend existing or create new)

**Endpoints**:
- `POST /api/payments` - Record payment for sale
- `GET /api/payments` - List payments (with filters)
- `GET /api/payments/:id` - Get payment details
- `GET /api/payments/sale/:saleId` - Get payment for specific sale

**Files**:
- `payments.module.ts` (new or extend existing)
- `payments.controller.ts`
- `payments.service.ts`
- `dto/create-payment.dto.ts`
- `entities/payment.entity.ts` (new or extend existing)

### 2.6 Reports Module
**Module**: `modules/reports/`

**Endpoints**:
- `GET /api/reports/sales` - Sales report (date range, product, etc.)
- `GET /api/reports/stock` - Stock report (current, historical)
- `GET /api/reports/wastage` - Wastage report (by product, date range)
- `GET /api/reports/daily-summary` - Daily summary (sales, stock, wastage)
- `GET /api/reports/weekly-comparison` - Weekly sales comparison
- `GET /api/reports/metrics` - Key metrics dashboard

**Files**:
- `reports.module.ts`
- `reports.controller.ts`
- `reports.service.ts`
- `dto/report-filters.dto.ts`

### 2.7 File Upload Module (for wastage photos)
**Module**: `modules/uploads/` or use existing file handling

**Endpoints**:
- `POST /api/uploads` - Upload file (photo)
- `GET /api/uploads/:filename` - Get uploaded file

**Files**:
- `uploads.module.ts`
- `uploads.controller.ts`
- `uploads.service.ts`

---

## 3. Frontend Pages & Components

### 3.1 Authentication (Already exists, may need updates)
- Login page
- Protected routes

### 3.2 Dashboard
**Page**: `/dashboard`

**Components**:
- `DashboardLayout.jsx` - Main layout with sidebar
- `DashboardHeader.jsx` - Header with user info, logout
- `CashierDashboard.jsx` - Cashier dashboard
  - Current session status
  - Quick actions (Open session, New sale)
  - Today's summary cards (Sales, Stock status)
- `AdminDashboard.jsx` - Admin dashboard
  - Overview metrics
  - Recent sales
  - Stock alerts
  - Reports quick links

### 3.3 Stock Management
**Pages**:
- `/dashboard/stock/open-session` - Open daily session
- `/dashboard/stock/current` - Current stock view
- `/dashboard/stock/entries` - Stock entries history

**Components**:
- `OpenSessionForm.jsx` - Form to open new session
- `StockEntryForm.jsx` - Form to add opening/incoming stock
- `StockSummary.jsx` - Display current stock levels
- `CloseSessionForm.jsx` - Form to close session (leftover + wastage)
- `WastageEntryForm.jsx` - Form with photo upload for wastage
- `StockHistoryTable.jsx` - Table of stock entries

### 3.4 Sales Management
**Pages**:
- `/dashboard/sales/new` - Create new sale
- `/dashboard/sales` - List all sales
- `/dashboard/sales/:id` - Sale details & receipt

**Components**:
- `NewSaleForm.jsx` - Form to create sale
  - Product selection
  - Quantity input
  - Price display/override
  - Total calculation
  - Add multiple items
- `SaleItemRow.jsx` - Row for each sale item
- `SalesTable.jsx` - Table of sales
- `SaleDetails.jsx` - View sale details
- `ReceiptView.jsx` - Display/download receipt (PDF)
- `PaymentForm.jsx` - Form to record payment

### 3.5 Reports
**Pages**:
- `/dashboard/reports/sales` - Sales reports
- `/dashboard/reports/stock` - Stock reports
- `/dashboard/reports/wastage` - Wastage reports
- `/dashboard/reports/daily` - Daily summary
- `/dashboard/reports/weekly` - Weekly comparison

**Components**:
- `ReportFilters.jsx` - Date range, product filters
- `SalesReportChart.jsx` - Sales chart (Chart.js)
- `StockReportTable.jsx` - Stock report table
- `WastageReportTable.jsx` - Wastage report with photos
- `WeeklyComparisonChart.jsx` - Weekly comparison chart
- `MetricsCards.jsx` - Key metrics display

### 3.6 Products Management (Admin)
**Pages**:
- `/dashboard/products` - List products
- `/dashboard/products/new` - Create product
- `/dashboard/products/:id/edit` - Edit product

**Components**:
- `ProductsTable.jsx` - Products list
- `ProductForm.jsx` - Create/Edit product form

### 3.7 Settings (Admin)
**Pages**:
- `/dashboard/settings` - Settings page
- `/dashboard/settings/users` - User management
- `/dashboard/settings/roles` - Role management

---

## 4. Business Logic & Rules

### 4.1 Stock Session Rules
- Only one session can be OPEN per day
- Cannot create sales if no OPEN session
- Opening stock = Previous day's leftover stock
- Available stock = Opening + Incoming - Sold - Wastage
- Cannot close session if there are unpaid sales

### 4.2 Sales Rules
- Sale must have at least one item
- Cannot sell more than available stock
- Sale must be paid before session can be closed
- Sale number auto-generated: `SALE-YYYY-NNNN`

### 4.3 Stock Entry Rules
- Opening stock can only be added when opening session
- Incoming stock can be added anytime during OPEN session
- Closing stock and wastage can only be added when closing session
- Wastage entries require photo evidence

### 4.4 Validation Rules
- Quantity must be positive
- Prices must be positive
- Dates must be valid
- Stock cannot go negative

---

## 5. Implementation Phases

### Phase 1: Foundation (Week 1)
1. ✅ Clean up and harmonize Docker setup (DONE)
2. Database schema setup
   - Create Product entity
   - Create StockSession entity
   - Create StockEntry entity
   - Create Sale & SaleItem entities
   - Create Payment entity (or extend existing)
3. Basic backend modules
   - Products module (CRUD)
   - Stock Sessions module (open/close)
   - Stock Entries module (CRUD)
4. Basic frontend setup
   - Update dashboard layout
   - Create products management page
   - Create stock session management

### Phase 2: Core Sales (Week 2)
1. Sales module backend
   - Create sale with items
   - Stock validation
   - Receipt generation
2. Payments module
   - Record payment
   - Payment validation
3. Frontend sales pages
   - New sale form
   - Sales list
   - Sale details & receipt

### Phase 3: Stock Management (Week 3)
1. Complete stock workflow
   - Opening stock entry
   - Incoming stock entry
   - Closing stock & wastage entry
   - Photo upload for wastage
2. Stock validation & business rules
3. Frontend stock management pages
   - Open session form
   - Stock entry forms
   - Close session form
   - Stock summary view

### Phase 4: Reports & Analytics (Week 4)
1. Reports module backend
   - Sales reports
   - Stock reports
   - Wastage reports
   - Daily summaries
   - Weekly comparisons
2. Frontend reports pages
   - Sales reports with charts
   - Stock reports
   - Wastage reports
   - Weekly comparison charts
   - Metrics dashboard

### Phase 5: Polish & Testing (Week 5)
1. Error handling & validation
2. UI/UX improvements
3. Testing
4. Documentation
5. Deployment preparation

---

## 6. Technical Considerations

### 6.1 File Uploads (Wastage Photos)
- Store in `uploads/wastage/` directory
- Use Multer for file handling
- Support: JPG, PNG
- Max file size: 5MB
- Generate unique filenames

### 6.2 Receipt Generation
- Use PDF library (pdfkit or puppeteer)
- Include: Sale number, date, items, totals, payment method
- Downloadable PDF

### 6.3 Stock Calculations
- Real-time stock availability
- Prevent overselling
- Track stock movements

### 6.4 Date Handling
- Use date-only for sessions (no time)
- Timestamps for entries and sales
- Timezone handling

### 6.5 Security
- Role-based access control
- Cashier can only manage their session
- Admin can view all
- Validate stock before sales

---

## 7. API Response Examples

### Open Session
```json
POST /api/stock-sessions/open
{
  "date": "2024-01-15"
}

Response:
{
  "id": 1,
  "date": "2024-01-15",
  "status": "OPEN",
  "openedBy": { "id": 1, "username": "cashier1" },
  "openedAt": "2024-01-15T08:00:00Z"
}
```

### Create Stock Entry
```json
POST /api/stock-entries
{
  "sessionId": 1,
  "productId": 1,
  "type": "OPENING",
  "quantity": 50.5,
  "notes": "Opening stock from yesterday"
}

Response:
{
  "id": 1,
  "sessionId": 1,
  "productId": 1,
  "type": "OPENING",
  "quantity": 50.5,
  "recordedAt": "2024-01-15T08:05:00Z"
}
```

### Create Sale
```json
POST /api/sales
{
  "sessionId": 1,
  "items": [
    { "productId": 1, "quantity": 2.5, "unitPrice": 800 }
  ],
  "paymentMethod": "CASH"
}

Response:
{
  "id": 1,
  "saleNumber": "SALE-2024-0001",
  "totalAmount": 2000,
  "paymentStatus": "PAID",
  "items": [...],
  "payment": {...}
}
```

---

## 8. Next Steps

1. Review and approve this plan
2. Start Phase 1: Database schema and basic modules
3. Set up development environment
4. Begin implementation step by step

---

## Notes
- Start with CASH payments only, add MPESA later
- Focus on core functionality first, polish later
- Keep UI simple and functional
- Ensure data integrity with proper validations
- Consider adding audit logs for important actions

