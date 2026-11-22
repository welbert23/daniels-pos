# Point of Sales System - MySQL Database Edition

All business data lives in **XAMPP MySQL** (`daniels_pos`). When you add, edit, or delete something in the app, the change is immediately visible in **phpMyAdmin**.

> There is no hardcoded business data in the frontend. Users, categories, items, recipes, ingredients, customers, and transactions all come from MySQL. Initial users/categories are defined in `database.sql`; old localStorage data is imported **explicitly** with **↑ Import local**.

---

## 1. Start and database access

1. Double-click `start-pos.bat` — it starts XAMPP Apache + MySQL and opens the app.
2. Log in as **superadmin**.
3. Click **phpMyAdmin ↗** in the topbar, or open:
   `http://localhost/phpmyadmin/index.php?route=/database/structure&db=daniels_pos`

| Item | Value |
|---|---|
| Database | `daniels_pos` |
| Host | `127.0.0.1` |
| User | `root` |
| Password | *(blank)* |
| Physical files | `C:\xampp\mysql\data\daniels_pos\` |
| Web root | `C:\xampp\htdocs\daniels-pos` → junction to the **`app`** folder |

> **Superadmin only** can see the DB controls: **↻ Reload DB**, **↑ Import local**, **phpMyAdmin ↗**, and the status chip. They are hidden from Client, Cashier, and Inventory; `refreshDB()` / `importLocal()` also have a `requireSuper()` guard even if called from the console.

---

## 1b. Live access from other devices

The GitHub repository is public and the static frontend is hosted at `https://welbert23.github.io/daniels-pos/`. GitHub Pages cannot run PHP or MySQL, so a **Cloudflare HTTPS tunnel** exposes the local `api.php`.

1. Double-click **`start-live.bat`** (or run `tools\start-live.ps1`).
2. It starts XAMPP and the tunnel, writes the API URL to `docs/js/00-api-url.js`, pushes it, waits for the Pages rebuild, then opens a short URL such as:
   `https://welbert23.github.io/daniels-pos/?r=a1b2c3`
3. The `?r=` value only busts the cache; the real tunnel URL comes from the auto-updated config file. That shareable URL is saved to `app\live-url.txt` and copied to the clipboard. The direct tunnel URL is also printed in the console as a fallback.

The database remains your local MySQL. Server-side changes show up after a refresh or **↻ Reload DB**. The URL changes every time the tunnel restarts. Anyone with the URL can reach the login page, so keep it private and add network/auth protection before wider exposure. `cloudflared` is required (`winget install Cloudflare.cloudflared`).


---

## 2. How sync works

| File | Role |
|---|---|
| `index.html` | HTML markup only |
| `styles.css` | All CSS |
| `js/00-core.js` … `js/99-init.js` | 15 feature modules; `99-init.js` loads last |
| `api.php` | Real INSERT / UPDATE / DELETE against MySQL |
| `database.sql` | Schema + initial users/categories |
| `start-pos.bat` | One-click XAMPP + browser launcher |
| `start-live.bat` / `tools\start-live.ps1` | One-click XAMPP + public HTTPS tunnel |

- `save(db)` POSTs the **entire DB JSON** to `api.php?action=save`. The API synchronizes every table inside a transaction.
- `audit_log`, `attendance`, and `schedules` are **separate tables**, so they are **not erased** when the app performs a full-state sync.
- If MySQL goes away, changes are queued in the browser (`sipos_offline_queue_v1`) and sync automatically when the connection returns via **↻ Reload DB**.

### API actions

| Action | Purpose |
|---|---|
| `bootstrap` | Fetch the full DB state plus an `empty` flag |
| `save` | Sync the full DB JSON into the tables |
| `audit` | Write one audit row |
| `logs` | Fetch the Activity Log |
| `attendance` / `punch` | Fetch and record time in/out |
| `schedules` / `schedule-save` | Fetch and save schedules |

> Access control for general CRUD is **UI-level**. Only `schedule-save` has a server-side role guard: **only Cashier / Inventory can be scheduled**.

---

## 3. Import old localStorage data

1. Open the **Desktop** `app\index.html` (double-click) — **not** the localhost URL. The old browser data is stored there.
2. Log in as superadmin.
3. Click **↑ Import local** in the topbar and confirm.
4. You can now use either the Desktop file or `http://localhost/daniels-pos/index.html`.

Use **↻ Reload DB** to pull the latest rows from MySQL — for example, after editing something directly in phpMyAdmin. If you insert manually, close all POS tabs before clicking Reload so the full-state sync does not overwrite your row.

---

## 4. Tables

| Table | Contents |
|---|---|
| `users` | Accounts, username, password, name, role |
| `items` | Menu / inventory items (price, cost, stock, expiry) |
| `item_recipes` | Ingredients per menu item |
| `ingredients` | Raw ingredients (stock, minimum, expiry) |
| `customers` | Customer records |
| `transactions` | Sales header |
| `transaction_items` | Line items for each sale |
| `categories` | Custom item & ingredient categories |
| `meta` | Reference-number counter and seed version |
| `audit_log` | Who / when / action / before-after footprint |
| `attendance` | Time in/out, lunch, and coffee per user per day |
| `schedules` | Week 1 + Week 2 days, duty hours, grace period |

**Important schema notes:**
- `categories` has `PRIMARY KEY (kind, name)` and `sort_order INT NOT NULL DEFAULT 0` — both are required by `api.php`.
- To add a category, choose **+ Add new category…** in the Category dropdown of the Inventory or Ingredients form.
- In `schedules`, `days` = Week 1 and `days2` = Week 2.

---

## 5. Same ingredient, different expiry = batch

The same ingredient name with different expiry dates is stored as separate batches. The Ingredients table shows a **BATCH ×N** badge.

- **Add Ingredient:** the same name is allowed if the expiry differs. If both name **and** expiry match, use **Stock In** to add quantity instead.
- **FEFO deduction:** `first-expiry-first-out` — the batch expiring soonest is deducted first.
- **Stock check:** all batches of the same ingredient are summed before deciding if stock is insufficient.
- **Fractional stock:** values like `0.1 kg` are supported in both the Add form and Stock In.

---

## 6. Roles and access

| Role | Login | POS | Inventory / Ingredients | Delete | Reports | Users | DB tools |
|---|---|---|---|---|---|---|---|
| **Superadmin** | `user / <redacted>` | ✅ | ✅ add/edit/delete | ✅ | ✅ | ✅ | ✅ |
| **Client** | `client / <redacted>` | ✅ | ✅ add/edit/delete | ✅ | ✅ | ❌ | ❌ |
| **Cashier** | `staff / <redacted>` | ✅ | view only | ❌ | ❌ | ❌ | ❌ |
| **Inventory** | `inventory / <redacted>` | ❌ | ✅ add/edit | ❌ | ❌ | ❌ | ❌ |

> `staff` is a legacy alias for **Cashier**. Roles can be changed in **Users → edit → Role**.

---

## 7. Activity Log (audit trail)

Available in the sidebar as **Activity Log** (Superadmin and Client only).

| Field | Example |
|---|---|
| Who | `User (@user, Superadmin)` |
| When | `Nov 22, 2026 · 1:45 PM` — hover for the exact `YYYY-MM-DD HH:MM:SS` |
| What | `ADD`, `EDIT`, `DELETE`, `STOCK`, `CATEGORY`, `VOID`, `PUNCH` |
| Where | `item`, `ingredient`, `customer`, `user`, `recipe`, `transaction`, `category`, `schedule`, `attendance` |
| Details | Click the 👁 button for **before / after** values |

- Every mutation is logged automatically, including actions by Inventory and Cashier.
- Passwords are masked (`***`).
- You can filter by action or search by user/module.

---

## 8. Time In/Out (Attendance)

One row per user **per day** — `UNIQUE(user_id, work_date)`.

**Punch sequence:**

1. **TIME IN**
2. **LUNCH OUT**
3. **LUNCH IN**
4. **COFFEE OUT**
5. **COFFEE IN**
6. **TIME OUT**

Early **TIME OUT** is allowed after **TIME IN** or **LUNCH IN**.

**In MySQL:** `work_date`, `time_in`, `lunch_out`, `lunch_in`, `coffee_out`, `coffee_in`, `time_out`, `status`, `updated_at`.

**In the app:** actual lunch/coffee duration and **net hours** (`time_out − time_in − breaks`), with a date picker and a table of all users. Every punch is also recorded in the Activity Log (`PUNCH`).

---

## 9. Schedules — 2-week cycle

Go to **Time In/Out → ⚙ Schedules** (Superadmin/Client only). **Only Cashier and Inventory can be scheduled.**

| Field | Details |
|---|---|
| Week 1 | `Mon … Sun` checkboxes — **odd ISO weeks** |
| Week 2 | `Mon … Sun` checkboxes — **even ISO weeks**; if blank, Week 1 is used |
| Time In / Time Out | Same for both weeks |
| Grace period | Default `10` minutes |

The current week is shown in the header: `2026-11-23 · Mon · Week 2`.

### Flag logic

| Flag | Meaning |
|---|---|
| `ON TIME` | TIME IN ≤ start + grace, with no early out |
| `LATE Xm` | TIME IN is `X` minutes past `start + grace` |
| `ABSENT` | Scheduled day but no TIME IN |
| `UNDERTIME Xm` | Has TIME OUT but `X` minutes before end time |
| `DAY OFF` | Not in the employee's days for the current week |
| `NO SCHEDULE` | No schedule has been set yet |

```sql
SELECT s.user_id, u.name, u.role,
       s.days    AS week1,
       s.days2   AS week2,
       s.start_time, s.end_time, s.grace_min
FROM daniels_pos.schedules s
JOIN daniels_pos.users u ON u.id = s.user_id;
```

Every schedule change is written to the Activity Log (`EDIT` · `schedule`) with before/after values.

---

## 10. Troubleshooting

| Symptom | Solution |
|---|---|
| `DB offline — queued` | MySQL is not running. Run `start-pos.bat` again, then click **↻ Reload DB** — queued changes sync automatically. |
| `Database has no users` | Import `database.sql` in phpMyAdmin. |
| New code not showing | **Ctrl+F5** or run `start-pos.bat` again. |
| No schedule flags appearing | No schedule has been set yet; set one as Superadmin/Client. |
| Manual insert in phpMyAdmin disappeared | Close POS tabs before inserting, then click **↻ Reload DB**. |
| `No partitioning defined` | Normal informational text in phpMyAdmin — not an error. |
| Want to reset everything | Re-import `database.sql`. If you need the old data, use **↑ Import local** from the Desktop `app\index.html`. |
