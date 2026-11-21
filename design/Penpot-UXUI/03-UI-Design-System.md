# 03 — UI Design System (extracted from `index.html`)

This is the **as-is** design system of the current app (neo-brutalist / street-energy). Use these tokens when recreating editable UI in Penpot.

## Design tokens

### Colors
| Token | Value | Usage |
|---|---|---|
| `--paper` | `#FFF6E2` | App/page background, subtle surfaces |
| `--paper2` | `#FFE9C2` | Alt background (cart foot, inputs focus-adjacent areas) |
| `--surface` | `#FFFDF5` | Cards, panels, inputs, modals |
| `--surface2` | `#FFE9C2` | Secondary surface |
| `--white` | `#FFFDF5` | Light on dark accents |
| `--ink` | `#16130B` | Primary text, borders, dark UI |
| `--ink2` | `#3A3320` | Secondary dark |
| `--mut` | `#7A6F54` | Muted text/labels/meta |
| `--mut2` | `#A99B78` | Lighter muted |
| `--border` | `#16130B` | Primary border color |
| `--border2` | `#D6C9A8` | Soft/dashed dividers, secondary borders |
| `--brand` | `#FFD400` | Primary brand/yellow, CTAs, highlights, active states |
| `--brand-d` | `#A57E00` | Dark brand text/accent |
| `--brand-l` | `#FFF1A3` | Brand tint backgrounds |
| `--accent` | `#FF6B1A` | Checkout/action accent (warm orange) |
| `--accent-d` | `#C2410C` | Dark accent |
| `--accent-l` | `#FFE3CF` | Accent tint |
| `--danger` | `#FF2E1F` | Destructive/error |
| `--danger-l` | `#FFD7D2` | Danger tint |
| `--ok` | `#0FA63C` | Success/positive |
| `--ok-l` | `#CFF4D7` | Success tint |
| `--info` | `#1E6FE8` | Info/links/badges |
| `--info-l` | `#D6E6FF` | Info tint |
| `--grad` | `#FFD400` | Gradient/token alias (brand) |
| `--grad-warm` | `#FF6B1A` | Warm gradient/token alias |
| `--black` | `#14110A` | Sidebar/cart header/strong dark blocks |

**Category accent colors (menu):** BBQ Platters `#B91C1C`, Burgers `#D97706`, Sides `#7C3AED`, Drinks `#0369A1`, Desserts `#DB2777`  
**Ingredient category colors:** Meat `#DC2626`, Poultry `#D97706`, Seafood `#0369A1`, Produce `#15803D`, Dairy `#2563EB`, Dry Goods `#7C3AED`, Sauce & Marinade `#CA8A04`, Pantry `#92400E`

### Typography
| Token / role | Font | Weights/styles | Usage |
|---|---|---|---|
| `--font-d` (Display) | `Archivo Black`, `Arial Black`, system-ui | 900-like display | Headings, brand, strong labels, totals emphasis |
| `--font-b` (Body/UI) | `Space Grotesk`, system-ui, sans-serif | 400–700 | General UI text, body, buttons |
| `--font-m` (Mono/Meta) | `Space Mono`, ui-monospace, monospace | 400/700 | Labels, meta, refs, prices/totals, badges, table headers, clock |

**Notable treatments:** frequent uppercase, letter-spacing (`.02em`–`.18em`) on mono labels/headers, bold weights for hierarchy.

### Spacing, radius, borders, shadows (neo-brutalist)
| Token | Value | Notes |
|---|---|---|
| `--r` | `2px` | Minimal radius (sharp/brutal feel) |
| `--shadow` | `4px 4px 0 var(--black)` | Hard offset shadow |
| `--shadow-lg` | `8px 8px 0 var(--black)` | Large offset shadow |
| Borders | `2px`–`4px solid var(--ink)` | Strong outlines on components/cards |
| Dividers | dashed `var(--border2)` | List/row separators in places |

**Background texture:** dot grid via `radial-gradient(rgba(22,19,11,.05/.08) 1px, transparent 1.4px)` at 20–24px.

## Component inventory (rebuild in Penpot)

### Shell & navigation
- **App shell:** fixed sidebar (260px, `--black`) + main area with sticky topbar and scroll content.
- **Sidebar:** logo/mark block, nav section label, nav items (default/hover/active with brand fill + offset shadow), user footer (avatar, name, role tag, logout).
- **Topbar:** page title (display), live clock/date chip.

### Inputs & controls
- **Text/password/number/date inputs, selects:** 2–2.5px ink border, small radius, hard mini-shadow, focus = brand-tint bg + stronger shadow.
- **Search field:** left icon + padded input.
- **Buttons:** base `.btn` (brand fill, 3px border, 4x4 shadow, uppercase, hover lift, active press). Variants: `.btn-sm`, `.btn-xs`, `.btn-ghost`, `.btn-danger`. **Icon buttons:** `.icon-btn` with view/edit/delete color intents.
- **Category/order/quick-cash pills & toggles:** `.cat-pill`, `.ot-btn`, quick cash buttons (incl. exact).

### Data display
- **KPI card:** icon block + value + label, 3px border, 5px shadow.
- **Card/panel:** bordered container with heading row + divider.
- **Pills/badges:** `.pill` variants `ok/warn/bad/info/mut/brand`; product badges `LOW/OUT`.
- **Tables:** dark header row (brand-on-black), mono caps headers, hover row tint, status/action columns.
- **Charts/bars:** simple CSS bar visuals (7-day chart, progress/share bars).
- **Lists/rows:** low-stock/recent/transaction rows with dashed separators.

### POS-specific
- **Product card:** accent bar, optional badge, name/category/price chip/stock; hover lift, out-of-stock muted/disabled.
- **Cart panel:** dark header (count/clear), scroll body, empty state, line items (info, amount, qty stepper, remove), footer (order type, customer, totals, discount, cash/quick-cash, change, checkout).
- **Receipt:** monospace receipt layout (printable) inside modal.

### Feedback & overlays
- **Modal/overlay:** dim backdrop, bordered/shadowed modal (default/wide), header/subtitle, form rows, footer actions, entrance animation.
- **Toast:** top-center dark toast with brand border/icon, slide/fade.
- **Inline login error:** danger-tinted bordered message.

## Interaction & motion (as-is)
- **Hover/press:** translate + shadow change on buttons/cards/pills (tactile/brutal feel).
- **Transitions:** short (`~.08s–.28s`) for UI feedback; modal entrance `modalIn .16s`.
- **Focus:** inputs get visible focus treatment (brand tint + shadow/outline removal in favor of styled focus).
- **States to represent in UX/UI:** default, hover, active/pressed, focus, disabled, selected/active toggle, loading-not-applicable (SPA render), empty, error/invalid, success (toast), low/out/expired.

## Responsive notes (as-is)
- KPI grid collapses at <=1200px and <=700px.
- POS layout stacks at <=1100px.
- Sidebar fixed at 260px; tables horizontally scroll in wrapped containers.
- Login card fixed width (~400px) with decorative background.

## Accessibility considerations (to preserve/improve in Penpot spec)
- High-contrast palette and strong borders aid visibility; verify text contrast on tinted pills/badges and brand-on-black areas.
- Ensure visible focus states for all interactive elements in redesigned flows.
- Provide clear required/validation messaging in forms; keep touch/click targets comfortable.
- Pair color status (LOW/OUT/EXPIRED) with text labels (already present) — retain in designs.

## Suggested Penpot setup
- **Color styles:** tokens above + category palettes.
- **Text styles:** Display/Heading (Archivo Black), Body/UI (Space Grotesk), Mono/Meta (Space Mono) at key sizes/weights used.
- **Components/variants:** Button (primary/ghost/danger × sizes), Input/Select/Search, Pill/Badge, Nav item (default/active), KPI card, Table row/cell states, Modal, Toast, Product card, Cart line, Icon buttons.
- **Grids/layout:** 260px sidebar + fluid main; content padding ~26–28px; POS split (menu + 370px cart).
