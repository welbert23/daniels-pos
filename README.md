# Point of Sales & Inventory Management System

MySQL-backed POS, inventory, ingredients, attendance, schedules, and audit trail. The database is the source of truth — there is no hardcoded business data in the frontend.

---

## Quick start

Double-click **`app\start-pos.bat`**. It starts XAMPP (Apache + MySQL) and opens the POS in your browser.

| Item | Address |
|---|---|
| App | `http://localhost/pos-inventory-management-system/index.html?v=38` |
| phpMyAdmin | `http://localhost/phpmyadmin/index.php?route=/database/structure&db=pos_inventory` |

> The launcher adds a cache-buster (`?v=38`). If you have an old tab open, press **Ctrl+F5**.

### Logins

Accounts live in MySQL with hashed passwords. Credentials are **not** listed in this public repo — ask the system owner, or check the private docs at `POS-Server\README-DATABASE.md` (GitHub: https://github.com/welbert23/pos-inventory-server).

| Role | Access |
|---|---|
| **Superadmin** | Everything, including **Users** and DB tools |
| **Client** | POS, inventory, ingredients, customers, sales, reports, schedules — **no** Users / DB tools |
| **Cashier** | POS only; view-only inventory/ingredients/time in-out |
| **Inventory** | Add/edit inventory & ingredients, **no delete**, no POS |

> The legacy `staff` account is treated as **Cashier**.

---

## Live access from other devices

The GitHub repository is **public**, and the static frontend is published with GitHub Pages at:

**https://welbert23.github.io/pos-inventory-management-system/**

GitHub Pages can only serve static files from `docs/`. PHP and MySQL cannot run there, so the real `api.php` stays on your PC in the **private** `pos-inventory-server` repo; the public repo only has a stub that requires the private file.

- **Offline-first after sign-in:** open the Pages URL as-is. Sign in once while XAMPP/the tunnel is online; the token and session are cached, so later sessions can work from queued/local data. To move old browser data into MySQL, use **↑ Import local** from the Desktop `app\index.html`.
- **Live MySQL:** double-click **`app\start-live.bat`**. It starts XAMPP and a Cloudflare tunnel, saves the API URL **only** to `POS-Server\api-url.txt`, rebuilds Pages with no embedded URL, then opens a URL like:

  `https://welbert23.github.io/pos-inventory-management-system/?r=a1b2c3&api=<tunnel>`

  The random `?r=` value only busts the browser/CDN cache. The `&api=` value is saved into that browser's localStorage on first open so the app can reach your local MySQL. The tunnel URL is **not** committed to the public repo. The shareable URL is saved to `app\live-url.txt` and copied to the clipboard. A manual `?api=<url>` still works and overrides the saved value.

Changes go to **MySQL on your PC**, so XAMPP must be running. Refresh the page or use **↻ Reload DB** (superadmin only) to see them.

After changing frontend code, rebuild and publish the static site (PowerShell 5.1-compatible):

```
powershell -ExecutionPolicy Bypass -File tools\build-pages.ps1
git add docs
git commit -m "Update Pages site"
git push
```

> The tunnel URL changes on every restart. Anyone with the Pages URL can reach the login page, but credentials are verified by `api.php`, passwords are hashed, and every **data** request needs a signed token. Roles are enforced server-side. The first sign-in needs the API online; after that, a cached token allows offline queued work.

Requires `cloudflared` (install via `winget install Cloudflare.cloudflared`) only for live MySQL access.

---

## Features

- **Point of Sale** — FEFO deduction; the same ingredient with different expiry dates is treated as separate batches.
- **Checkout note** — saved in MySQL and shown on the receipt, Sales search, and CSV export.
- **Current Sale order** — the latest tapped item appears on top in the cart only; MySQL, receipt, and CSV order are unchanged.
- **Inventory & Ingredients** — dynamic categories; new categories can be added directly from the Category dropdown.
- **POS categories** — each category has its own color.
- **Attendance** — `TIME IN → LUNCH OUT → LUNCH IN → COFFEE OUT → COFFEE IN → TIME OUT`. Early TIME OUT is allowed after TIME IN or LUNCH IN.
- **Schedules** — 2-week cycle: **Week 1 = odd ISO weeks**, **Week 2 = even ISO weeks**. Only Superadmin/Client can set them; only Cashier/Inventory can be scheduled. The current week is shown in the Time In/Out header.
- **Attendance flags** — `ON TIME`, `LATE Xm`, `ABSENT`, `UNDERTIME Xm`, `DAY OFF`, `NO SCHEDULE`.
- **Activity Log** — who, when, what action, and before/after values in readable date/time; passwords are never sent to the browser.
- **Sidebar** — hide/show toggle saved in this browser.
- **Desktop layout** — tables fit at 100% zoom without horizontal sliding.
- **DB tools** — `↻ Reload DB`, `↑ Import local`, `phpMyAdmin ↗`, and the status chip — **superadmin only**.
- **No Firebase** — Cloudflare HTTPS tunnel is the only remote bridge.

---

## Folder structure

```
POS-System/
├── app/          → RUNNABLE POS
│   ├── index.html          markup
│   ├── styles.css          all CSS
│   ├── js/                 16 JS files (15 feature modules + runtime API config)
│   ├── api.php             public stub -> private POS-Server\api.php
│   ├── start-pos.bat       XAMPP + browser launcher
│   └── start-live.bat      XAMPP + public HTTPS tunnel launcher
├── docs/         → Generated GitHub Pages site (no PHP/MySQL)
├── tools/        → start-live.ps1, build-pages.ps1
└── README.md     → This file
```

`app\api-url.txt` and `app\live-url.txt` are generated, gitignored files.

Design/Penpot files, old versions, PDFs, session notes, and screenshot/PDF scripts are archived outside the repo at `C:\Users\Admin\OneDrive\Desktop\POS-System-Archive\`.

Server/database files are in the private repo at `C:\Users\Admin\OneDrive\Desktop\New folder\POS-Server\` (GitHub: https://github.com/welbert23/pos-inventory-server). Keep it beside `POS-System` because the public stub requires `..\..\POS-Server\api.php`.

### JavaScript modules (`app/js/`)

| File | Purpose |
|---|---|
| `00-api-url.js` | Runtime API config; empty in public Pages, set by `?api=` |
| `00-core.js` | Constants, helpers, categories, MySQL sync, audit, token helpers, migration |
| `10-router-auth.js` | Navigation, server login/logout |
| `20-dashboard.js` | Dashboard |
| `30-pos.js` | POS + FEFO deduction + checkout note |
| `40-inventory.js` | Inventory CRUD + stock |
| `45-recipes.js` | Item recipes / BOM |
| `50-ingredients.js` | Ingredients + expiry batches |
| `60-sales.js` | Sales history, search, void, CSV export |
| `70-customers.js` | Customers |
| `80-attendance.js` | Time in/out + 2-week schedules |
| `85-logs.js` | Activity Log viewer |
| `90-reports.js` | Reports |
| `95-users.js` | User management |
| `96-modal.js` | Modal helpers |
| `99-init.js` | Bootstrap / init (loaded last) |

---

## Where data is stored

Data lives in **XAMPP MySQL**, not in the project folder:

| Item | Value |
|---|---|
| Database | `pos_inventory` |
| MySQL user | `pos_app` (credentials in private `POS-Server\config.local.php`, gitignored) |
| Physical files | `C:\xampp\mysql\data\pos_inventory\` |
| Web root (junction) | `C:\xampp\htdocs\pos-inventory-management-system` → `...\POS-System\app` |
| Viewer | **phpMyAdmin ↗** button in the POS topbar (superadmin) |

Tables: `attendance`, `audit_log`, `categories`, `customers`, `ingredients`, `item_recipes`, `items`, `meta`, `schedules`, `transaction_items`, `transactions`, `users`.

Initial users and categories are defined in `POS-Server\database.sql` (private repo). All items, recipes, ingredients, customers, and transactions live in MySQL.

---

## Common tasks

### Import old localStorage data

1. Open the **Desktop** `app\index.html` (`file://`, not localhost/Pages) so the old browser data is accessible. Keep XAMPP running so login and save work.
2. Log in as superadmin.
3. Click **↑ Import local** in the topbar and confirm.

### Set a schedule

1. Superadmin/Client → **Time In/Out → ⚙ Schedules**.
2. Choose a Cashier or Inventory user.
3. Select days for **Week 1** and **Week 2**, plus time in/out and grace period.
4. If Week 2 is left empty, Week 1 is used.

### Add a category

In the Inventory or Ingredients form, choose **+ Add new category…** from the dropdown, then type the name.

### Manual insert in phpMyAdmin

Close all POS tabs first, insert the row in phpMyAdmin, then log in as superadmin and click **↻ Reload DB** so the full-state sync does not overwrite it.

---

## Troubleshooting

| Symptom | Solution |
|---|---|
| Stale UI / new code not showing | **Ctrl+F5** or run `start-pos.bat` again |
| `DB offline — queued` | MySQL is not running. Run `start-pos.bat` again, then click **↻ Reload DB** — queued changes sync on the next successful connect. |
| `Session expired` / `Unauthorized` | Sign in again; the token expired or was rejected by the server. |
| Live URL gives 404 / CORS error | Run `app\start-live.bat` again; the Cloudflare tunnel URL changes on restart. |
| `Database has no users` | Import `POS-Server\database.sql` in phpMyAdmin. |
| No schedule flags appearing | No schedule has been set yet; set one as Superadmin/Client. |
| `No partitioning defined` in phpMyAdmin | Normal informational text — not an error. |

---

## Detailed docs

See **`POS-Server\README-DATABASE.md`** in the private repo (https://github.com/welbert23/pos-inventory-server) for schema, SQL queries, import flow, roles, attendance, schedules, audit, and deeper troubleshooting.
