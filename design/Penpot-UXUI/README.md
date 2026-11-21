# Daniel's Barbecue & Restaurant POS — UX/UI Conversion (Penpot-ready)

This folder contains a **UX/UI conversion package** for the existing POS system at `..\index.html` (single-file SPA, localStorage-backed). It is prepared so you can import and organize the work in **Penpot**.

> **Note on "put into Penpot":** This environment cannot directly authenticate/upload to your Penpot account (no Penpot API/credentials and browser automation is unavailable). Instead, this package includes everything needed to recreate/import the project into Penpot quickly: organized screen exports, a documented design system, IA, user flows, and a screen inventory.

## What's inside

| Path | Purpose |
|---|---|
| `README.md` | This guide and Penpot import steps |
| `01-UX-Overview-and-IA.md` | Product overview, roles/permissions, information architecture, navigation |
| `02-User-Flows.md` | Key task flows per role and module |
| `03-UI-Design-System.md` | Design tokens, typography, components, patterns (extracted from source) |
| `04-Screen-Inventory.md` | Complete inventory of 71 captured screens |
| `screens/` | All UI screenshots organized by module, ready to drag into Penpot |

## How to import into Penpot

### Option A — Fastest: import screens as image boards
1. Open [Penpot](https://design.penpot.app/) and create a new file, e.g. **"Daniel's BBQ POS — UX/UI"**.
2. Create pages/boards for each module (recommended):
   - `01 Login`
   - `02 Dashboard`
   - `03 POS`
   - `04 Inventory`
   - `05 Ingredients`
   - `06 Sales History`
   - `07 Customers`
   - `08 Reports`
   - `09 Users`
3. Drag-and-drop PNGs from the matching `screens/<module>/` folders onto each page.
4. Name each board/frame after the filename (see `04-Screen-Inventory.md`) and align in flows (left-to-right by task).
5. Add flow arrows/connectors in Penpot using `02-User-Flows.md` as reference.

### Option B — Rebuild as editable UI in Penpot (high fidelity)
1. Create the same pages/boards as above.
2. Set up **Color tokens/styles** and **Typography** from `03-UI-Design-System.md` (use Penpot Libraries/Assets where possible).
3. Build reusable components first (see "Component inventory" in `03-UI-Design-System.md`):
   - Buttons (primary/ghost/danger/sm/xs/icon), inputs/selects, pills/badges, KPI cards, data table, modal, toast, sidebar nav item, product card, cart line, receipt.
4. Place imported screenshots as a locked reference layer and trace/rebuild screens as editable components and layouts.
5. Use `01-UX-Overview-and-IA.md` and `04-Screen-Inventory.md` to ensure coverage of all states (empty, low/out stock, expired, modal states, role variants).

### Tips
- **Roles matter:** Many screens exist in 3 variants — `sa` (Superadmin), `cl` (Client), `st` (Staff). Keep role variants side-by-side to document permission differences.
- **State coverage:** The capture set includes success/error, empty/filled cart, add/edit/delete modals, view-only states, etc. Preserve these as separate frames for UX completeness.
- **Source of truth:** `..\index.html` is the runnable source; tokens/specs in this package are extracted from it.

## Source summary

- **App:** Daniel's Barbecue & Restaurant — Fast-food POS + Inventory
- **Type:** Single-page web app, `localStorage` persistence, role-based UI
- **Design language:** Neo-brutalist / street-energy (hard borders, offset shadows, bold type, high contrast)
- **Roles:** Superadmin (`user` / `<redacted>`), Client (`client` / `<redacted>`), Staff (`staff` / `<redacted>`)
- **Modules:** Login, Dashboard, Point of Sale, Inventory, Ingredients, Sales History, Customers, Reports, Users
- **Existing captures:** 71 PNGs in `..\ui\` (organized copies in `screens/`)
