# 04 — Screen Inventory

Complete inventory of captured UI screens (71 PNGs) organized for Penpot import. Source captures live in `..\ui\` and are copied by module into `screens/`.

**Role prefixes:** `sa` = Superadmin, `cl` = Client, `st` = Staff.

## 01 — Login (`screens/01-Login`)
| File | Role/State | Description |
|---|---|---|
| `01-sa-login-failed.png` | Superadmin | Login with invalid credentials / error state |
| `02-sa-login-success.png` | Superadmin | Login success/context before/at entry |
| `46-cl-login-failed.png` | Client | Login error state |
| `47-cl-login-success.png` | Client | Login success/context |
| `61-st-login-failed.png` | Staff | Login error state |
| `62-st-login-success.png` | Staff | Login success/context |

## 02 — Dashboard (`screens/02-Dashboard`)
| File | Role/State | Description |
|---|---|---|
| `03-sa-dashboard.png` | Superadmin | Dashboard (KPIs, alerts, recent sales) |
| `48-cl-dashboard.png` | Client | Dashboard view |
| `63-st-dashboard.png` | Staff | Dashboard view (role-limited nav context) |

## 03 — POS (`screens/03-POS`)
| File | Role/State | Description |
|---|---|---|
| `04-sa-pos-menu.png` | Superadmin | POS menu/grid default |
| `05-sa-pos-item-added.png` | Superadmin | Item added to cart |
| `06-sa-pos-cart-items.png` | Superadmin | Cart with multiple items |
| `07-sa-pos-qty-increase.png` | Superadmin | Quantity increased |
| `08-sa-pos-qty-decrease.png` | Superadmin | Quantity decreased |
| `09-sa-pos-remove-item.png` | Superadmin | Remove item from cart |
| `10-sa-pos-customer.png` | Superadmin | Customer selection |
| `11-sa-pos-discount.png` | Superadmin | Discount applied/selection |
| `12-sa-pos-order-type.png` | Superadmin | Order type selection (Dine-in/Take-out/Delivery) |
| `13-sa-pos-cash-input.png` | Superadmin | Cash payment input |
| `14-sa-pos-quick-cash.png` | Superadmin | Quick cash / exact amount |
| `15-sa-pos-receipt.png` | Superadmin | Checkout receipt modal |
| `16-sa-pos-empty-cart.png` | Superadmin | Empty cart state |
| `25-sa-pos-insufficient-ingredient.png` | Superadmin | Insufficient ingredient validation/error |
| `49-cl-pos-menu.png` | Client | POS menu view |
| `50-cl-pos-cart.png` | Client | POS with cart |
| `51-cl-pos-receipt.png` | Client | Receipt modal |
| `64-st-pos-menu.png` | Staff | POS menu view |
| `65-st-pos-cart.png` | Staff | POS with cart |
| `66-st-pos-receipt.png` | Staff | Receipt modal |

## 04 — Inventory (`screens/04-Inventory`)
| File | Role/State | Description |
|---|---|---|
| `17-sa-inv-list.png` | Superadmin | Inventory/menu list |
| `18-sa-inv-search.png` | Superadmin | Search/filter state |
| `19-sa-inv-add-form.png` | Superadmin | Add item modal/form |
| `20-sa-inv-edit-form.png` | Superadmin | Edit item modal/form |
| `21-sa-inv-stock-in.png` | Superadmin | Stock-in modal |
| `22-sa-inv-delete.png` | Superadmin | Delete confirmation modal |
| `23-sa-recipe-editor.png` | Superadmin | Recipe/BOM editor |
| `24-sa-recipe-add-row.png` | Superadmin | Recipe editor add ingredient row |
| `52-cl-inv-list.png` | Client | Inventory list |
| `53-cl-inv-add-form.png` | Client | Add item modal |
| `54-cl-inv-stock-in.png` | Client | Stock-in modal |
| `67-st-inv-viewonly.png` | Staff | Inventory view-only state |

## 05 — Ingredients (`screens/05-Ingredients`)
| File | Role/State | Description |
|---|---|---|
| `26-sa-ing-list.png` | Superadmin | Ingredients list |
| `27-sa-ing-search.png` | Superadmin | Search/filter state |
| `28-sa-ing-add-form.png` | Superadmin | Add ingredient modal |
| `29-sa-ing-edit-form.png` | Superadmin | Edit ingredient modal |
| `30-sa-ing-stock-in.png` | Superadmin | Stock-in modal |
| `31-sa-ing-delete.png` | Superadmin | Delete confirmation modal |
| `32-sa-ing-status.png` | Superadmin | Status/expiry indicators view |
| `55-cl-ing-list.png` | Client | Ingredients list |
| `68-st-ing-viewonly.png` | Staff | Ingredients view-only state |

## 06 — Sales History (`screens/06-Sales-History`)
| File | Role/State | Description |
|---|---|---|
| `33-sa-sales-list.png` | Superadmin | Sales history list/KPIs/filters |
| `34-sa-sales-receipt.png` | Superadmin | View receipt modal |
| `35-sa-sales-void.png` | Superadmin | Void order confirmation |
| `56-cl-sales-list.png` | Client | Sales history list |
| `57-cl-sales-receipt.png` | Client | View receipt modal |
| `69-st-sales-list.png` | Staff | Sales history list |
| `70-st-sales-receipt.png` | Staff | View receipt modal |

## 07 — Customers (`screens/07-Customers`)
| File | Role/State | Description |
|---|---|---|
| `36-sa-cust-list.png` | Superadmin | Customers list |
| `37-sa-cust-add.png` | Superadmin | Add customer modal |
| `38-sa-cust-edit.png` | Superadmin | Edit customer modal |
| `39-sa-cust-history.png` | Superadmin | Customer purchase history modal |
| `40-sa-cust-delete.png` | Superadmin | Delete confirmation modal |
| `58-cl-cust-list.png` | Client | Customers list |
| `59-cl-cust-add.png` | Client | Add customer modal |
| `71-st-cust-viewonly.png` | Staff | Customers view-only state |

## 08 — Reports (`screens/08-Reports`)
| File | Role/State | Description |
|---|---|---|
| `41-sa-reports.png` | Superadmin | Reports (KPIs, 7-day chart, best sellers, categories) |
| `60-cl-reports.png` | Client | Reports view |

## 09 — Users (`screens/09-Users`) — Superadmin only
| File | Role/State | Description |
|---|---|---|
| `42-sa-users-list.png` | Superadmin | Users list |
| `43-sa-users-add.png` | Superadmin | Add user modal |
| `44-sa-users-edit.png` | Superadmin | Edit user modal |
| `45-sa-users-delete.png` | Superadmin | Delete confirmation modal |

## Coverage notes
- **Total:** 71 screens across 9 modules, 3 roles, and multiple UI states (default, search/filter, add/edit/delete/stock modals, receipts, empty/error/validation, view-only).
- For Penpot, consider adding a **Role & Permission matrix** frame and a **Flow** page linking key journeys from `02-User-Flows.md`.
- If additional states are needed (e.g. first-run/empty datasets beyond provided captures), they can be reproduced by running `..\index.html` locally and capturing via browser.