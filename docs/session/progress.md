# Progress Tracker — Daniel's Barbecue POS

> Session notes para maalala kung ano ang nagawa na at ano ang hindi pa.
> Target file: `index.html`. Update ang file na 'to tuwing may bagong pagbabago.

## LAST UPDATED
2026-09-14 — Screenshots + PDF re-sequenced: 71 shots (Superadmin 01–45 kasama ang Recipe sa Inventory section at sariling login failed/success; Client 46–60 na may sariling login; Staff 61–71 na may sariling login). PDF 71 module pages (72 physical).

## DONE (tapos na)

### Data & Seed
- [x] Fresh Daniel's BBQ seed: 26 menu items (BBQ Platters, Burgers, Sides, Drinks, Desserts)
- [x] 25 ingredients sa 8 categories (Meat, Poultry, Seafood, Produce, Dairy, Dry Goods, Sauce & Marinade, Pantry) na may units (kg/L/pcs/tray)
- [x] Users renamed: u2 = Bedia Gerro F. (client), u3 = Mahinay Irish D. (staff)
- [x] Menu-version marker `meta.seed='daniels-4'` — auto-rebuild ng menu + ingredients + recipes pag di tugma (fix ng lumang menu vs PDF)
- [x] Migrate: old Quickbite-era data full-reseed + user rename

### Menu Inventory (Expiry)
- [x] Expiry column + date field (Add/Edit), status pills: IN STOCK / LOW / OUT / EXPIRED / EXP SOON
- [x] Stock-in modal, delete confirmation, CSV export (may Ingredients column na)

### Ingredients Module (kumpleto)
- [x] List, search, category filter, units, expiry badges
- [x] CRUD (add/edit/delete), stock-in (pwdeng decimal), CSV export
- [x] Access: superadmin + client manage; staff view-only

### Recipe / BOM (NEW)
- [x] `RECIPES` map — bawat menu item may ingredients + qty per sale (24 items may recipe)
- [x] Recipe editor modal (Recipe button sa Inventory actions): dropdown ng ingredient na may remaining stock, qty input, add/remove row
- [x] Checkout auto-deducts ingredients; blocker kung kulang (toast "Not enough ..."); walang transaction na nagagawa
- [x] VOID/REFUND LOGIC: void ay HINDI na nagre-restore ng menu stock o ingredients — "pagkain yan, nained na"; total sales lang ang nate-tanggal sa pag-cancel. `confirmVoid()` sets status=cancelled lang. Naka-verify headless.
- [x] Recipe chips sa inventory list; CSV may Ingredients column
- [x] Fractional stock support (`qty()` helper)

### Dashboard
- [x] KPIs (Today's Sales, Transactions, Low/Out, Menu Items) — kasama ang ingredients sa low/out count
- [x] Low stock alert card (LOW/OUT/EXPIRED/EXP SOON) para sa menu + ingredients
- [x] KPI icon: box/stock icon (hindi na exclamation)

### POS
- [x] Menu grid, search, categories, stock display, out-of-stock grayed
- [x] Cart: add, qty +/- (capped sa stock), remove, clear
- [x] Customer selector, discount, order type, cash + quick-cash, change
- [x] Checkout → receipt modal (ref, cashier, customer, items, totals) + print

### Sales / Customers / Reports / Users
- [x] Sales history: filters, search, view receipt, void (NO stock restore — cancelled lang), CSV; Void + Export CSV hidden para sa staff
- [x] Customers: CRUD + tier + purchase history
- [x] Reports: KPIs, 7-day chart, best sellers, menu by category
- [x] Users: CRUD, roles, walang mabubura ang huling superadmin

### Cosmetic
- [x] SEQUENCE FIX: screenshots + PDF are now 71 pages in exact order — **Superadmin 01–45** (login failed → login success → dashboard → POS 13 → **Inventory 6 + Recipe/BOM 3** → Ingredients 7 → Sales 3 → Customers 5 → Reports → Users 4), **Client 46–60** (sariling login failed/success → dashboard → POS → Inventory → Ingredients → Sales → Customers → Reports), **Staff 61–71** (sariling login failed/success → dashboard → POS → Inventory/Ingredients/Customers view-only → Sales view). Recipe/BOM ay kasama na sa Inventory sequence (hindi na after Users). Bawat PNG may role tag para walang duplicate names (e.g. `01-sa-login-failed.png` … `71-st-cust-viewonly.png`).
- [x] STAFF ACCESS FIX: staff-only saw forbidden buttons (bug). Fixed: `renderInventory()` (index.html ~line 769) `+ Add Item` + `Export CSV` now gated by `can`; `renderIngredients()` (~843) `Export CSV` gated; `renderSales()` (~876, 891, 894) `srvOps=me().role!=='staff'` gates `Export CSV` + per-row Void; `renderCustomers()` (~907–913) `can` gates `+ Add Customer`, Actions header, and per-row History/Edit/Delete (empty `<td>` keeps alignment). Verified headless: **staff** Inventory/Ingredients/Customers = no buttons, Sales = viewSale-only; **client** full access. Then regenerated `gen-shots3.js` + `gen-pdf2.js` + `copy-screens.js` so lahat ng deliverables ay tugma.
- [x] LOGIN-SUCCESS SHOT: bawat role may sariling login-failed + login-success page sa PDF at sa screenshots folder.
- [x] RECEIPT SLIM: receipt ngayon 300px wide (parang 80mm thermal roll) at naka-center sa modal — `.receipt{width:300px}`
- [x] Header FIX: isang text lang ang title (tinanggal ang `#crumb` breadcrumb na nagdoble ng text sa Dashboard at sa bawat menu)
- [x] Toast: hideTimer + welcome toast sa dashboard lang ('go()' calls hideToast)
- [x] Neo-brutalist design (black borders, hard shadows, acid yellow)

## PENDING (hindi pa tapos / options)
- [ ] Recipe summary sa Ingredients module (alin menu items ang gumagamit ng ingredient) — OPTIONAL
- [ ] Usage/consumption report para sa ingredients — OPTIONAL

## HOW TO REGENERATE SHOTS + PDF
1. `node C:\Users\Admin\AppData\Local\Temp\opencode\gen-shots3.js` (71 shots sa Temp\opencode\shots2 — SA 45, CL 15, ST 11)
2. `node C:\Users\Admin\AppData\Local\Temp\opencode\gen-pdf2.js` (72-page PDF sa Desktop\POS-System — 71 module pages + cover)
3. `node C:\Users\Admin\AppData\Local\Temp\opencode\copy-screens.js` (kopya sa `screenshots\` as `01-sa-*.png` … `71-st-*.png`)

## KEY CONTEXT
- DB_KEY = `sipos_db_v2`, SESSION_KEY = `sipos_session_v1`
- Login: superadmin/superadmin, client / <redacted>, staff / <redacted> (avail sa HTML comment line 2)
- Seed marker: `daniels-4`; recipe attach sa `seedItems()` via `RECIPES` map
- CSS: --brand=#FFD400, --ink=#14110A, fonts --font-d (logo), --font-m (mono)