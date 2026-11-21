# 01 — UX Overview & Information Architecture

## Product overview
- **Name:** Daniel's Barbecue & Restaurant
- **Tagline/context:** Fast-Food POS + Inventory
- **Location/context shown in UI:** Cabitehan Road, Cabuyao, Laguna · Tel: 0916 989 583
- **Platform:** Web SPA (single `index.html`), client-side state persisted in `localStorage` (`sipos_db_v2`, `sipos_session_v1`)
- **Primary goals:** Process sales quickly (POS), track menu/inventory/ingredients with stock and expiry, record transactions, manage customers, view reports, administer users (by role).

## Users & roles (RBAC)

| Role | Demo credentials | Access | Key permissions |
|---|---|---|---|
| Superadmin | `user` / `<redacted>` | Full | All modules incl. Reports & Users; manage stock, users, void orders, exports |
| Client | `client` / `<redacted>` | Sales, Inventory, Customers, Reports | Manage stock; view reports; no Users management |
| Staff | `staff` / `<redacted>` | POS, Inventory view, Ingredients view, Sales, Customers view | No Reports/Users; view-only on inventory/ingredients/customers where restricted; limited actions |

**Permission rules (from source):**
- `manageStock`: Superadmin, Client
- `manageUsers`: Superadmin only
- `viewReports`: Superadmin, Client (Staff excluded)

## Information architecture / Sitemap

```
Login
└── App Shell (Sidebar + Topbar + Content)
    ├── Dashboard
    ├── Point of Sale
    ├── Inventory (Menu items)
    ├── Ingredients
    ├── Sales History
    ├── Customers
    ├── Reports            (Superadmin, Client)
    └── Users              (Superadmin)
```

### Navigation model
- **Persistent left sidebar** (260px, dark): brand mark, nav items with icons/labels (role-filtered), current user avatar/name/role, Log out.
- **Top bar:** page title, live clock/date.
- **Content area:** module-specific views rendered into main content; dot-grid paper background.

## Module breakdown

### 1) Login
- Branded login card over decorative neo-brutalist background (banner, shapes, stamp).
- Fields: Username, Password. Error state: "Invalid username or password."
- On success: stores session, greets user, routes to Dashboard.

### 2) Dashboard
- Personalized greeting + current date.
- **KPIs:** Today's Sales, Transactions Today, Low/Out of Stock (menu + ingredients), Menu Items count.
- **Low Stock Alert panel:** combined alerts for menu out/low, ingredient out/low, expired/expiring-soon with status pills/bars.
- **Recent Sales panel:** last completed transactions with ref/date/status/total, link to view all.

### 3) Point of Sale (POS)
- **Left:** search, category pills (with counts), product grid/cards (name, category context, price, stock, LOW/OUT badges, category accent bar).
- **Right:** Current Sale cart — item count, clear; line items with qty controls/remove; order type (Dine-in/Take-out/Delivery); customer selector (Walk-in or saved); subtotal/discount/total; cash input with quick cash buttons; change; Checkout CTA.
- **Outcomes:** Insufficient cash validation, insufficient ingredient validation, checkout creates transaction, deducts menu/ingredient stocks per recipe (BOM), shows receipt modal, toast confirmation.
- **Receipt:** printable receipt modal (ref, datetime, cashier, order type, customer, items, totals, cash/change, voided state).

### 4) Inventory (Menu items)
- Search, category filter, **Add Item** (role-gated), **Export CSV**.
- Table: Item (with recipe preview), Category, Price, Cost, Margin %, Stock, Expiry, Status (IN STOCK/LOW/OUT/EXPIRED/EXP SOON), Actions.
- **Actions (manageStock):** Stock in, Edit, Recipe/BOM editor, Delete (confirm modal).
- **Recipe/BOM modal:** map ingredients + qty per sale; auto-deduct on sale; note that void does not return stock.

### 5) Ingredients
- Search, category filter, **Add Ingredient**, **Export CSV**.
- Table: Ingredient, Category, Unit, Stock, Expiry, Status, Actions (Stock in/Edit/Delete).
- Status logic includes expiry (expired/expiring soon) and stock thresholds.

### 6) Sales History
- KPIs: Today's Completed, Total Orders, Cancelled, Cashiers.
- Filters: search by ref/customer, All/Today/Completed/Cancelled; **Export CSV** (privileged).
- Table with view receipt action; **Void** action for completed orders (privileged) with confirmation — void marks cancelled, does not restock.

### 7) Customers
- Search, **Add Customer** (manageStock roles).
- Table: details, spend, orders, tier (NEW/REGULAR/PRESTIGE based on completed spend), actions.
- **Actions:** Purchase history modal, Edit, Delete (confirm; preserves past transactions).

### 8) Reports (Superadmin/Client)
- KPIs: Total Sales, Completed Orders, Units in Stock, Inventory Value.
- **7-Day Sales** bar chart, **Best Sellers** list, **Menu by Category** table with share visualization.

### 9) Users (Superadmin only)
- User list with role/access summary, "YOU" indicator.
- Add/Edit user modal (name, username, password, role); delete with safeguards (cannot delete self / last superadmin).

## UX principles observed (as-is)
- **Speed at POS:** category filtering, visible stock badges, quick cash, inline cart editing.
- **Operational awareness:** low/out/expiry alerts surfaced on dashboard and tables.
- **Traceability:** receipts/refs, sales history, exportable CSVs.
- **Safety:** confirmations for destructive actions (delete/void), validation toasts for insufficient cash/stock/ingredients.
- **Role-appropriate UI:** navigation and actions adapt to role (view-only vs manage).

## Data/entities (conceptual)
- **User:** id, username, password, name, role
- **Menu Item:** name, category, price, cost, stock, minStock, expiry, recipe[] (ingredient name, qty)
- **Ingredient:** name, category, unit, stock, minStock, expiry
- **Transaction:** ref, date, items[], subtotal, discount, total, payment, change, cashier, customer, orderType, status
- **Customer:** name, phone, email, address, created (+ derived spend/orders/tier)
