# 02 — User Flows

This document captures primary and secondary flows to recreate interaction/flow diagrams in Penpot.

## Global
- **App launch** → check session → if valid: App Shell + Dashboard; else: Login.
- **Login** → enter credentials → [invalid] show inline error → retry; [valid] create session → Dashboard + welcome toast.
- **Logout** (sidebar) → clear session → Login.
- **Navigation** → click sidebar item (role-filtered) → render module view; topbar title/clock update.

## Role access flow
- **Superadmin:** Dashboard, POS, Inventory, Ingredients, Sales, Customers, Reports, Users.
- **Client:** Dashboard, POS, Inventory, Ingredients, Sales, Customers, Reports (no Users).
- **Staff:** Dashboard, POS, Inventory (view), Ingredients (view), Sales, Customers (view) (no Reports/Users; restricted actions).

## POS — Complete sale
1. Open **Point of Sale**.
2. Browse/search/filter categories → tap product card (blocked if out of stock).
3. Cart updates (or qty increments, capped by stock). Adjust qty / remove / clear.
4. Set **Order type** (Dine-in/Take-out/Delivery).
5. Select **Customer** (Walk-in or existing).
6. Apply **Discount** (0/5/10/15/20/25%) if needed.
7. Enter **Cash** (manual or quick amounts/exact) → view **Change**.
8. **Checkout** → validations:
   - Empty cart blocked.
   - Insufficient cash → toast.
   - Insufficient ingredient (per recipe/BOM) → toast.
9. On success: create transaction/ref, deduct menu stock and ingredient stocks per recipe, clear cart, show **Receipt modal** + toast, nav/cart badges refresh.
10. Receipt modal → **Close** or **Print**.

## POS — Alternate/error states
- **Out of stock item:** card disabled/badged OUT.
- **Low stock item:** LOW badge.
- **Max stock reached:** qty capped with toast.
- **Insufficient ingredient:** checkout blocked with specific ingredient message.
- **Empty cart state:** placeholder in cart panel; checkout disabled.

## Inventory (Menu) — Manage (Superadmin/Client)
- **View/search/filter:** by name and category.
- **Add item:** open modal → fill name/category/price/cost/stock/expiry/min → Save → list updates + toast.
- **Edit item:** open modal prefilled → Save.
- **Stock in:** open modal → enter qty → Add.
- **Edit Recipe/BOM:** open modal → add/remove ingredient rows with qty per sale → Save (auto-deduct on sale; voids do not restock).
- **Delete item:** confirm modal → Delete.
- **Export CSV:** download inventory CSV.
- **Status indicators:** IN STOCK / LOW / OUT and expiry states (EXPIRED / EXP SOON) reflected in table.

## Ingredients — Manage (Superadmin/Client)
- **View/search/filter** by name/category.
- **Add/Edit/Stock in/Delete** via modals (similar patterns to inventory, with units and decimal stock where applicable).
- **Export CSV.**
- **Statuses:** stock thresholds + expiry awareness.

## Sales History
- **View/filter/search:** All/Today/Completed/Cancelled, by ref or customer.
- **View receipt:** open receipt modal for a transaction.
- **Void order (privileged, completed only):** confirm modal → mark cancelled; **no stock/ingredient return** (food prepared) → toast; totals/lists update.
- **Export CSV** (privileged).

## Customers
- **View/search.**
- **Add/Edit customer** (manage roles): modal form.
- **View history:** modal with transactions/spend summary.
- **Delete customer:** confirm modal; past transactions preserved.
- **Tier derivation:** NEW (no spend), REGULAR (>0), PRESTIGE (>= 10,000) based on completed spend.

## Reports (Superadmin/Client)
- Open module → view KPIs, 7-day sales chart, best sellers, category breakdown/share. (Read/insight flow.)

## Users (Superadmin)
- **Add user:** modal (name, username, password, role) → validations (required, unique username).
- **Edit user:** update details/role; optional password change; if editing self, session reflects changes.
- **Delete user:** blocked if last superadmin or deleting self (per UI logic); else confirm.

## Suggested Penpot flow connections
- `Login (default) → Login (error) → Login (success/loading context) → Dashboard`
- `Dashboard → POS / Inventory / Ingredients / Sales / Customers / Reports / Users`
- `POS: Menu → Cart filled → Discount/Customer/OrderType → Cash/Change → Receipt`
- `Inventory: List → Search/Filtered → Add/Edit/Stock-in/Recipe/Delete modals`
- `Sales: List → Filters → Receipt modal → Void confirm`
- `Role matrix`: show side-by-side nav/table/action differences for `sa` / `cl` / `st` variants.
