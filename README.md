# Point of Sales & Inventory Management System

MySQL-backed POS, inventory, ingredients, attendance, schedules, and audit trail. The database is the source of truth — there is no hardcoded business data in the frontend.

---

## Quick start

Double-click **`app\start-pos.bat`**. It starts XAMPP (Apache + MySQL) and opens the POS in your browser.

| Item | Address |
|---|---|
| App | `http://localhost/pos-inventory-management-system/index.html` |
| phpMyAdmin | `http://localhost/phpmyadmin/index.php?route=/database/structure&db=daniels_pos` |

> The launcher adds a cache-buster (`?v=34`). If you have an old tab open, press **Ctrl+F5**.

### Logins

| Role | Username / Password | Access |
|---|---|---|
| **Superadmin** | `user / <redacted>` | Everything, including **Users** and DB tools |
| **Client** | `client / <redacted>` | POS, inventory, ingredients, customers, sales, reports, schedules — **no** Users / DB tools |
| **Cashier** | `staff / <redacted>` | POS only; view-only inventory/ingredients/time in-out |
| **Inventory** | `inventory / <redacted>` | Add/edit inventory & ingredients, **no delete**, no POS |

> `staff` is treated as **Cashier** (legacy alias).

---

## Live access from other devices

The GitHub repository is **public**, and the static frontend is published with GitHub Pages at:

**https://welbert23.github.io/pos-inventory-management-system/**

GitHub Pages can only serve static files from `docs/`. PHP and MySQL cannot run there, so `api.php` stays on your PC.

- **Offline mode (default):** open the Pages URL as-is. The app uses the offline queue and any data already saved in that browser. To move old browser data into MySQL, use **↑ Import local** from the Desktop `app\index.html`.
- **Live MySQL:** double-click **`app\start-live.bat`**. It starts XAMPP and a Cloudflare tunnel, writes the new API URL to `docs/js/00-api-url.js`, commits/pushes it, waits for GitHub Pages to rebuild, then opens a short URL like:

  `https://welbert23.github.io/pos-inventory-management-system/?r=a1b2c3`

  The random `?r=` value only busts the browser/CDN cache. The real tunnel URL is read from the auto-updated config file, so no long `?api=` link is needed. The shareable URL is saved to `app\live-url.txt` and copied to the clipboard; the direct tunnel URL is printed in the console as a fallback. A manual `?api=<url>` still works and overrides the config for that browser.

Changes go to **MySQL on your PC**, so XAMPP must be running. Refresh the page or use **↻ Reload DB** (superadmin only) to see them.

After changing frontend code, rebuild and publish the static site:

```
powershell -ExecutionPolicy Bypass -File tools\build-pages.ps1
git add docs && git commit -m "Update Pages site" && git push
```

> The tunnel URL changes on every restart. Anyone with the Pages URL can reach the login page; access control is UI-level only. Because the repository is public, change the default logins before real use and do not store secrets in the repo.

Requires `cloudflared` (installed via `winget install Cloudflare.cloudflared`) only for live MySQL access.

## Features

- **Point of Sale** — FEFO deduction; the same ingredient with different expiry dates is treated as separate batches.
- **Inventory & Ingredients** — dynamic categories; new categories can be added directly from the Category dropdown.
- **Attendance** — `TIME IN → LUNCH OUT → LUNCH IN → COFFEE OUT → COFFEE IN → TIME OUT`. Early TIME OUT is allowed after TIME IN or LUNCH IN.
- **Schedules** — 2-week cycle: **Week 1 = odd ISO weeks**, **Week 2 = even ISO weeks**. Only Superadmin/Client can set them; only Cashier/Inventory can be scheduled. The current week is shown in the Time In/Out header.
- **Attendance flags** — `ON TIME`, `LATE Xm`, `ABSENT`, `UNDERTIME Xm`, `DAY OFF`, `NO SCHEDULE`.
- **Activity Log** — who, when, what action, and before/after values; readable date/time; passwords are masked.
- **DB tools** — `↻ Reload DB`, `↑ Import local`, `phpMyAdmin ↗`, and the status chip — **superadmin only**.

---

## Folder structure

```
POS-System/
├── app/          → RUNNABLE POS
│   ├── index.html          markup
│   ├── styles.css          all CSS
│   ├── js/                 15 feature modules (see below)
│   ├── api.php             MySQL bridge (bootstrap/save/audit/attendance/schedules)
│   ├── database.sql        schema + initial users/categories
│   ├── start-pos.bat       XAMPP + browser launcher
│   ├── start-live.bat      XAMPP + public HTTPS tunnel launcher
│   └── README-DATABASE.md  detailed database docs
├── docs/         → PDF modules, session notes, and generated GitHub Pages site (no PHP/MySQL)
├── design/       → Penpot UX/UI files, screenshots, design zips
├── tools/        → Screenshot/PDF scripts, start-live.ps1, build-pages.ps1
├── archive/      → Old/unused versions (index-design2.html, index-standalone.html, app-standalone.js)
└── README.md     → This file
```

### JavaScript modules (`app/js/`)

| File | Purpose |
|---|---|
| `00-core.js` | Constants, helpers, categories, MySQL sync, audit, migration |
| `10-router-auth.js` | Navigation, login/logout |
| `20-dashboard.js` | Dashboard |
| `30-pos.js` | POS + FEFO deduction |
| `40-inventory.js` | Inventory CRUD + stock |
| `45-recipes.js` | Item recipes / BOM |
| `50-ingredients.js` | Ingredients + expiry batches |
| `60-sales.js` | Sales history + void |
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
| Database | `daniels_pos` |
| MySQL user | `root` (blank password) |
| Physical files | `C:\xampp\mysql\data\daniels_pos\` |
| Web root (junction) | `C:\xampp\htdocs\pos-inventory-management-system` → `...\POS-System\app` |
| Viewer | **phpMyAdmin ↗** button in the POS topbar (superadmin) |

Tables: `meta`, `users`, `categories`, `items`, `item_recipes`, `ingredients`, `customers`, `transactions`, `transaction_items`, `attendance`, `schedules`, `audit_log`.

Initial users and categories are defined in `app\database.sql`. All items, recipes, ingredients, customers, and transactions live in MySQL.

---

## Common tasks

### Import old localStorage data
1. Open the **Desktop** `app\index.html` (not the localhost URL) so the old browser data is accessible.
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
| `DB offline — queued` | MySQL is not running. Run `start-pos.bat` again, then click **↻ Reload DB** — queued changes sync automatically. |
| `Database has no users` | Import `app\database.sql` in phpMyAdmin. |
| No schedule flags appearing | No schedule has been set yet; set one as Superadmin/Client. |
| `No partitioning defined` in phpMyAdmin | Normal informational text — not an error. |
| Old `Penpot-UXUI` folder cannot be deleted | Wait for a PC restart. Its contents were already copied to `design\Penpot-UXUI` and the old folder is hidden. |

---

## Detailed docs

See **`app\README-DATABASE.md`** for schema, SQL queries, import flow, roles, attendance, schedules, audit, and deeper troubleshooting.
