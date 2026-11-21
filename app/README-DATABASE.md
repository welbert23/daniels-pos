# Daniel's POS — MySQL Database Edition

Lahat ng business data ay nasa **XAMPP MySQL** (`daniels_pos`). Kapag nag-add/edit/delete ka sa app, makikita agad ang pagbabago sa **phpMyAdmin**.

> **Walang hardcoded business data sa frontend.** Ang users, categories, items, recipes, ingredients, customers, at transactions ay galing sa MySQL. Ang initial users/categories ay nasa `database.sql`; ang lumang localStorage data ay **explicit lang** na ine-import gamit ang **↑ Import local**.

---

## 1. Paano simulan at kung saan makikita ang DB

1. I-double-click ang `start-pos.bat` — sisimulan nito ang XAMPP Apache + MySQL at bubuksan ang app.
2. Mag-login bilang **superadmin**.
3. I-click ang **phpMyAdmin ↗** sa topbar, o buksan ang:
   `http://localhost/phpmyadmin/index.php?route=/database/structure&db=daniels_pos`

| Item | Value |
|---|---|
| Database | `daniels_pos` |
| Host | `127.0.0.1` |
| User | `root` |
| Password | *(blank)* |
| Physical files | `C:\xampp\mysql\data\daniels_pos\` |
| Web root | `C:\xampp\htdocs\daniels-pos` → junction papunta sa **`app`** folder |

> **Superadmin lang** ang nakakakita sa DB controls: **↻ Reload DB**, **↑ Import local**, **phpMyAdmin ↗**, at status chip. Nakatago ito sa Client, Cashier, at Inventory; `refreshDB()` / `importLocal()` ay may `requireSuper()` guard kahit tawagin sa console.

---

## 2. Paano gumagana ang sync

| File | Papel |
|---|---|
| `index.html` | HTML markup lang |
| `styles.css` | Buong CSS |
| `js/00-core.js` … `js/99-init.js` | 15 feature modules; `99-init.js` ang huling loload |
| `api.php` | Tunay na INSERT / UPDATE / DELETE sa MySQL |
| `database.sql` | Schema + initial users/categories |
| `start-pos.bat` | One-click XAMPP + browser launcher |

- Ang `save(db)` ay nagpo-POST ng **buong DB JSON** sa `api.php?action=save`. Doon ginagawa ang sync sa bawat table sa loob ng transaction.
- `audit_log`, `attendance`, at `schedules` ay **hiwalay na tables**, kaya **hindi nabubura** kapag nag-full-state sync ang app.
- Kung mawala ang MySQL, naka-queue ang changes sa browser (`sipos_offline_queue_v1`) at auto-sync pag bumalik ang koneksyon gamit ang **↻ Reload DB**.

### API actions

| Action | Gamit |
|---|---|
| `bootstrap` | Kunin ang buong DB state + `empty` flag |
| `save` | I-sync ang buong DB JSON sa mga tables |
| `audit` | Isulat ang isang audit row |
| `logs` | Kunin ang Activity Log |
| `attendance` / `punch` | Kunin at i-record ang time in/out |
| `schedules` / `schedule-save` | Kunin at i-save ang schedule |

> Access control ay **UI-level** para sa pangkalahatang CRUD. Ang `schedule-save` lang ang may server-side role guard: **Cashier / Inventory lang ang sine-set**.

---

## 3. Import ng dating localStorage data

1. Buksan ang **Desktop** `app\index.html` (double-click) — **hindi** ang localhost URL. Dito naka-save ang lumang browser data.
2. Mag-login bilang superadmin.
3. I-click ang **↑ Import local** sa topbar, then i-confirm.
4. Pwede ka na ngayong gumamit ng Desktop file o `http://localhost/daniels-pos/index.html`.

Gamitin ang **↻ Reload DB** para kunin ang pinakabagong rows mula sa MySQL — halimbawa pag nag-edit ka diretso sa phpMyAdmin. Kung may manual insert, isara muna ang POS tabs bago mag-Reload para hindi ma-overwrite ng full-state sync.

---

## 4. Mga tables

| Table | Laman |
|---|---|
| `users` | Accounts, username, password, name, role |
| `items` | Menu / inventory items (presyo, cost, stock, expiry) |
| `item_recipes` | Mga ingredients bawat menu item |
| `ingredients` | Raw ingredients (stock, minimum, expiry) |
| `customers` | Customer records |
| `transactions` | Sales header |
| `transaction_items` | Mga linya ng bawat sale |
| `categories` | Custom item & ingredient categories |
| `meta` | Reference-number counter at seed version |
| `audit_log` | Who / when / action / before-after footprint |
| `attendance` | Time in/out, lunch, coffee bawat user per araw |
| `schedules` | Week 1 + Week 2 days, duty hours, grace period |

**Important schema notes:**
- `categories` ay may `PRIMARY KEY (kind, name)` at `sort_order INT NOT NULL DEFAULT 0` — kailangan ito ng `api.php`.
- Add ng category: piliin ang **+ Add new category…** sa loob ng Category dropdown ng Inventory o Ingredients form.
- Ang `days` = Week 1, `days2` = Week 2 sa `schedules`.

---

## 5. Same ingredient, ibang expiry = batch

Pwede magkaroon ng maraming row na pareho ang pangalan pero iba ang expiry — magkahiwalay na batch. May **BATCH ×N** badge sa Ingredients table.

- **Add Ingredient:** pinapayagan ang parehong pangalan kung iba ang expiry. Kung parehong pangalan **at** expiry, gamitin ang **Stock In** para magdagdag ng quantity.
- **FEFO deduction:** `first-expiry-first-out` — uunahin ang batch na pinakamalapit mag-expire.
- **Stock check:** sinusuma ang lahat ng batch bago magpasya kung “Not enough”.
- **Fractional stock:** sinusuportahan ang `0.1 kg` sa Add form at Stock In.

---

## 6. Mga role at access

| Role | Login | POS | Inventory / Ingredients | Delete | Reports | Users | DB tools |
|---|---|---|---|---|---|---|---|
| **Superadmin** | `user / <redacted>` | ✅ | ✅ add/edit/delete | ✅ | ✅ | ✅ | ✅ |
| **Client** | `client / <redacted>` | ✅ | ✅ add/edit/delete | ✅ | ✅ | ❌ | ❌ |
| **Cashier** | `staff / <redacted>` | ✅ | view only | ❌ | ❌ | ❌ | ❌ |
| **Inventory** | `inventory / <redacted>` | ❌ | ✅ add/edit | ❌ | ❌ | ❌ | ❌ |

> Ang `staff` ay legacy alias ng **Cashier**. Pwede palitan ang role sa **Users → edit → Role**.

---

## 7. Activity Log (audit trail)

Makikita sa sidebar ang **Activity Log** (Superadmin at Client lang).

| Field | Halimbawa |
|---|---|
| Sino | `User (@user, Superadmin)` |
| Kailan | `Nov 22, 2026 · 1:45 PM` — i-hover para sa exact `YYYY-MM-DD HH:MM:SS` |
| Ano | `ADD`, `EDIT`, `DELETE`, `STOCK`, `CATEGORY`, `VOID`, `PUNCH` |
| Saan | `item`, `ingredient`, `customer`, `user`, `recipe`, `transaction`, `category`, `schedule`, `attendance` |
| Details | 👁 button para sa **before / after** values |

- Auto-logged ang lahat ng mutation, kahit galing sa Inventory o Cashier.
- Naka-mask ang password (`***`).
- Pwede mag-filter ayon sa action o mag-search ng user/module.

---

## 8. Time In/Out (Attendance)

Isang row ang bawat user **bawat araw** — `UNIQUE(user_id, work_date)`.

**Pagkakasunod-sunod:**

1. **TIME IN**
2. **LUNCH OUT**
3. **LUNCH IN**
4. **COFFEE OUT**
5. **COFFEE IN**
6. **TIME OUT**

Pinapayagan ang maagang **TIME OUT** pagkatapos ng **TIME IN** o **LUNCH IN**.

**Sa MySQL:** `work_date`, `time_in`, `lunch_out`, `lunch_in`, `coffee_out`, `coffee_in`, `time_out`, `status`, `updated_at`.

**Sa app:** actual lunch/coffee duration at **net hours** (`time_out − time_in − breaks`), may date picker at table ng lahat ng users. Bawat punch ay nasa Activity Log din (`PUNCH`).

---

## 9. Schedules — 2-week cycle

Sa **Time In/Out → ⚙ Schedules** (Superadmin/Client lang). **Cashier at Inventory lang** ang sine-set.

| Field | Details |
|---|---|
| Week 1 | `Mon … Sun` checkbox — **odd ISO weeks** |
| Week 2 | `Mon … Sun` checkbox — **even ISO weeks**; kung blank, Week 1 ang gagamitin |
| Time In / Time Out | Pareho sa dalawang week |
| Grace period | Default `10` minuto |

Makikita ang kasalukuyang week sa header: `2026-11-23 · Mon · Week 2`.

### Flag logic

| Flag | Ibig sabihin |
|---|---|
| `ON TIME` | TIME IN ≤ start + grace, walang early out |
| `LATE Xm` | TIME IN lampas ng `X` minuto sa `start + grace` |
| `ABSENT` | Scheduled araw pero walang TIME IN |
| `UNDERTIME Xm` | May TIME OUT pero `X` minuto bago ang end time |
| `DAY OFF` | Hindi kasama sa days ng employee para sa kasalukuyang week |
| `NO SCHEDULE` | Wala pang naka-set na schedule |

```sql
SELECT s.user_id, u.name, u.role,
       s.days    AS week1,
       s.days2   AS week2,
       s.start_time, s.end_time, s.grace_min
FROM daniels_pos.schedules s
JOIN daniels_pos.users u ON u.id = s.user_id;
```

Bawat schedule change ay nasa Activity Log (`EDIT` · `schedule`) na may before/after.

---

## 10. Troubleshooting

| Sintomas | Solusyon |
|---|---|
| `DB offline — queued` | Hindi tumatakbo ang MySQL. I-run ulit ang `start-pos.bat`, tapos i-click ang **↻ Reload DB** — auto-sync ang queue. |
| `Database walang users` | I-import ang `database.sql` sa phpMyAdmin. |
| Hindi lumalabas ang bagong code | **Ctrl+F5** o i-run ulit ang `start-pos.bat`. |
| Walang lumalabas na schedule flag | Wala pang naka-set na schedule; mag-set muna bilang Superadmin/Client. |
| Manual insert sa phpMyAdmin nawala | Isara ang POS tabs bago mag-Insert, tapos mag-**↻ Reload DB**. |
| `No partitioning defined` | Normal informational text sa phpMyAdmin — hindi error. |
| Gusto i-reset lahat | I-import ulit ang `database.sql`. Kung kailangan ang lumang data, gamitin ang **↑ Import local** mula sa Desktop `app\index.html`. |
