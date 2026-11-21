# Daniel's Barbecue & Restaurant — POS System

MySQL-backed POS, inventory, ingredients, attendance, schedules, at audit trail. Ang database ang source of truth — walang hardcoded business data sa frontend.

---

## Mabilis simulan

I-double-click ang **`app\start-pos.bat`**. Sisimulan nito ang XAMPP (Apache + MySQL) at bubuksan ang POS.

| Item | Address |
|---|---|
| App | `http://localhost/daniels-pos/index.html` |
| phpMyAdmin | `http://localhost/phpmyadmin/index.php?route=/database/structure&db=daniels_pos` |

> Ang launcher ay nagdadagdag ng cache-buster (`?v=16`). Kung luma nang tab ang gamit mo, pindutin ang **Ctrl+F5**.

### Logins

| Role | Username / Password | Access |
|---|---|---|
| **Superadmin** | `user / <redacted>` | Lahat, kasama **Users** at DB tools |
| **Client** | `client / <redacted>` | POS, inventory, ingredients, customers, sales, reports, schedules — **walang** Users / DB tools |
| **Cashier** | `staff / <redacted>` | POS only; view-only inventory/ingredients/time in-out |
| **Inventory** | `inventory / <redacted>` | Add/edit inventory & ingredients, **walang delete**, walang POS |

> Ang `staff` ay itinuturing ding **Cashier** (legacy alias).

---

## Mga feature

- **Point of Sale** — FEFO deduction; magkaibang expiry = magkaibang batch.
- **Inventory & Ingredients** — dynamic categories; pwede mag-add ng bagong category sa loob mismo ng dropdown.
- **Attendance** — `TIME IN → LUNCH OUT → LUNCH IN → COFFEE OUT → COFFEE IN → TIME OUT`. Pinapayagan ang maagang TIME OUT pagkatapos ng TIME IN o LUNCH IN.
- **Schedules** — 2-week cycle: **Week 1 = odd ISO weeks**, **Week 2 = even ISO weeks**. Superadmin/Client lang ang nagseset; Cashier/Inventory lang ang sine-set. Makikita ang kasalukuyang week sa header ng Time In/Out.
- **Attendance flags** — `ON TIME`, `LATE Xm`, `ABSENT`, `UNDERTIME Xm`, `DAY OFF`, `NO SCHEDULE`.
- **Activity Log** — sino, kailan, anong action, at before/after values; readable date/time; naka-mask ang password.
- **DB tools** — `↻ Reload DB`, `↑ Import local`, `phpMyAdmin ↗`, at status chip — **superadmin lang** ang nakakakita.

---

## Folder structure

```
POS-System/
├── app/          → RUNNABLE POS
│   ├── index.html          markup
│   ├── styles.css          lahat ng CSS
│   ├── js/                 15 feature modules (tingnan sa ibaba)
│   ├── api.php             MySQL bridge (bootstrap/save/audit/attendance/schedules)
│   ├── database.sql        schema + initial users/categories
│   ├── start-pos.bat       XAMPP + browser launcher
│   └── README-DATABASE.md  detalyadong DB docs
├── docs/         → PDF modules, documentation, session notes
├── design/       → Penpot UX/UI files, screenshots, design zips
├── tools/        → Screenshot capture & PDF generation scripts
├── archive/      → Old/unused versions (index-design2.html, index-standalone.html, app-standalone.js)
└── README.md     → Itong file
```

### JavaScript modules (`app/js/`)

| File | Laman |
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
| `99-init.js` | Bootstrap / init (last na loload) |

---

## Saan naka-save ang data

Hindi ito nasa folder — nasa **XAMPP MySQL** mismo:

| Item | Value |
|---|---|
| Database | `daniels_pos` |
| MySQL user | `root` (blank password) |
| Physical files | `C:\xampp\mysql\data\daniels_pos\` |
| Web root (junction) | `C:\xampp\htdocs\daniels-pos` → `...\POS-System\app` |
| Viewer | **phpMyAdmin ↗** button sa topbar (superadmin) |

**Mga tables:** `meta`, `users`, `categories`, `items`, `item_recipes`, `ingredients`, `customers`, `transactions`, `transaction_items`, `attendance`, `schedules`, `audit_log`.

Ang initial users at categories ay nasa `app\database.sql`. Ang lahat ng items, recipes, ingredients, customers, at transactions ay nasa MySQL lang.

---

## Karaniwang gawain

### I-import ang dating localStorage data
1. Buksan ang **Desktop** `app\index.html` (hindi ang localhost) para ma-access ang lumang browser data.
2. Mag-login bilang superadmin.
3. I-click ang **↑ Import local** sa topbar.

### Mag-set ng schedule
1. Superadmin/Client → **Time In/Out → ⚙ Schedules**.
2. Pumili ng Cashier o Inventory.
3. Piliin ang araw para sa **Week 1** at **Week 2**, time in/out, at grace period.
4. Kung walang pipiliin sa Week 2, Week 1 ang gagamitin.

### Magdagdag ng category
Sa Inventory o Ingredients form, piliin ang **+ Add new category…** sa dropdown, then i-type ang pangalan.

### Manual insert sa phpMyAdmin
Isara muna ang POS tabs, mag-Insert sa phpMyAdmin, tapos mag-login ulit bilang superadmin at i-click ang **↻ Reload DB** — para hindi ma-overwrite ng full-state sync.

---

## Troubleshooting

| Sintomas | Solusyon |
|---|---|
| Luma ang itsura / hindi lumalabas ang bagong code | **Ctrl+F5** o i-run ulit ang `start-pos.bat` |
| `DB offline — queued` | Hindi tumatakbo ang MySQL. I-run ulit ang `start-pos.bat`, tapos i-click ang **↻ Reload DB** — auto-sync ang queue. |
| `Database walang users` | I-import ang `app\database.sql` sa phpMyAdmin. |
| Walang lumalabas na schedule flag | Wala pang naka-set na schedule; mag-set muna bilang Superadmin/Client. |
| `No partitioning defined` sa phpMyAdmin | Normal informational text — hindi error. |
| Hindi mabura ang lumang `Penpot-UXUI` folder | Hintayin ang PC restart; naka-copy na ito sa `design\Penpot-UXUI` at naka-hide ang old folder. |

---

## Detalyadong docs

Basahin ang **`app\README-DATABASE.md`** para sa schema, SQL queries, import flow, roles, attendance, schedules, audit, at mas malalim na troubleshooting.
