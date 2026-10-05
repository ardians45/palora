# Modern UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Palora ERP UI according to the reference modern SaaS dashboard screenshot (light canvas, rounded-2xl cards, obsidian dark featured card, metric tiles with diagonal ↗ arrows, vibrant violet `#5C59F7` accent, and in-module left sidebar) while preserving 100% of existing ERP modules, workflows, and business rules.

**Architecture:** 
- Centralized state in `App.jsx` with dynamic layout switching: Home page displays the modernized AppLauncher (Executive Metric Cards grid), while entering any module activates the In-Module Sidebar navigation layout.
- A dedicated `Sidebar.jsx` component provides fast access to all 9 ERP modules with active violet pill styling and role switching.
- Complete visual styling system updated in `src/index.css` with CSS variables for violet accent, dark card, light surfaces, and refined typography.

**Tech Stack:** React 19, Vite, Lucide React, Modern Vanilla CSS Design System.

## Global Constraints
- **Preserve Business Logic**: Do not modify existing data structures, calculations (DP 25%, PO numbering, delivery statuses, stock opname diffs), or localStorage keys.
- **Zero Breaking Changes**: All 9 modules (`sales`, `purchases`, `inventory`, `deliveries`, `receivables`, `documents`, `marketplace`, `masterdata`, `reports`) and `PrintModal` must remain fully functional.
- **Aesthetic Fidelity**: Strictly match the clean SaaS look (crisp white cards, subtle border `#eaeff5`, soft shadows, `#5c59f7` primary violet, and dark featured card).

---

### Task 1: Design Tokens & Base CSS Overhaul
**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Update design tokens and base canvas in `src/index.css`**
  - Add Google Fonts import (`Plus Jakarta Sans` / `Inter`).
  - Define root variables: `--primary: #5c59f7`, `--primary-hover: #4b47e0`, `--primary-light: #eef0fe`, `--card-dark: #161922`, `--card-dark-border: rgba(255,255,255,0.08)`, `--bg-app: #f4f6fa`, `--bg-card: #ffffff`, `--border-subtle: #eaeff5`, `--radius-card: 20px`.
  - Add layout classes for `.app-shell`, `.app-sidebar`, `.app-main-content`.
  - Add card styles for `.metric-card`, `.metric-card-dark`, `.metric-arrow-btn`, `.metric-badge-pill`.
  - Add modernized table, form input, button, and tab styles.

- [ ] **Step 2: Verify CSS syntax and classes**
  - Ensure no broken selectors or syntax errors in `src/index.css`.

---

### Task 2: Create In-Module Sidebar Component
**Files:**
- Create: `src/components/Sidebar.jsx`

- [ ] **Step 1: Implement `Sidebar.jsx`**
  - Display Palora brand with logo mark and subtitle.
  - "← Menu Utama" button to return to `activeModule = null`.
  - Nav list of all 9 ERP modules with Lucide icons.
  - Active module highlighted with solid violet pill (`#5C59F7` background, white icon and text).
  - User role switcher and quick indicator at the bottom.

- [ ] **Step 2: Test Sidebar exports and props interface**
  - Props: `activeModule`, `setActiveModule`, `currentRole`, `setCurrentRole`, `modules`.

---

### Task 3: Modernize Top Navbar for Home Page
**Files:**
- Modify: `src/components/Navbar.jsx`

- [ ] **Step 1: Update `Navbar.jsx` to match reference top bar**
  - Left: Palora brand logo mark and title.
  - Center/Right: Clean rounded search input (`🔍 Search`), Notification Bell with alert dot, Role switcher styled as modern pill button dropdown (`Mas Heri ▾`), and User Avatar.

- [ ] **Step 2: Verify Navbar behavior**
  - Seamlessly updates role and triggers search filtering if needed.

---

### Task 4: Transform AppLauncher into Executive Metric Cards Grid
**Files:**
- Modify: `src/components/AppLauncher.jsx`

- [ ] **Step 1: Implement Executive Metric Tiles in `AppLauncher.jsx`**
  - Compute live metrics from props:
    - Penjualan & POS (Featured Dark Card `#161922`): Active order count & omzet total, badge `+25% SOP DP Aman`, diagonal arrow button `↗`.
    - Gudang & Stok: Total units in stock, low stock alert count, mini bar sparkline, diagonal arrow button `↗`.
    - Pembelian & PO: Pending POs count, badge `1 Menunggu Konfirmasi Pabrik`.
    - Surat Jalan: Ready shipments count, badge `Armada Siap Berangkat`.
    - Piutang & Kas: Total remaining receivables, overdue count.
    - Arsip Dokumen: Stored documents count.
    - Marketplace: Shopee & Tokopedia sync indicator.
    - Master Data: Total customers & suppliers.
    - Laporan & Rekap: Performance overview.
  - Render modern SOP Paletindo Banner (Mas Heri's rules: Min DP 25%, Tahan Pengiriman) at the bottom.

- [ ] **Step 2: Verify AppLauncher interactions**
  - Clicking any card or diagonal arrow `↗` triggers `onSelectModule(mod)`.
  - Search filter updates cards in real time.

---

### Task 5: Integrate Sidebar and Layout in `App.jsx`
**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Update layout structure in `App.jsx`**
  - Import `Sidebar` from `./components/Sidebar`.
  - When `!activeModule`: Render `Navbar` + `AppLauncher` (with live summary data props).
  - When `activeModule`: Render `.app-shell` containing `Sidebar` on the left and `.app-main-content` on the right (with header and active module).
  - Preserve all state (`products`, `orders`, `purchaseOrders`, `deliveries`, `customers`, `suppliers`, `documents`, `printModal`).

- [ ] **Step 2: Test navigation flow**
  - Home -> Click Module -> Opens with Sidebar -> Click other module in Sidebar -> Switches instantly -> Click "← Menu Utama" or press `Escape` -> Returns to Home.

---

### Task 6: Polish Module Styling & Visual Consistency
**Files:**
- Modify: `src/index.css` (and module wrapper classes where needed)

- [ ] **Step 1: Ensure all 9 modules look unified and modern**
  - Polish cards, headers, tables, form inputs, badges, and action buttons in:
    - `SalesModule.jsx`
    - `PurchaseModule.jsx`
    - `InventoryModule.jsx`
    - `DeliveryModule.jsx`
    - `ReceivablesModule.jsx`
    - `DocumentModule.jsx`
    - `MarketplaceModule.jsx`
    - `MasterDataModule.jsx`
    - `ReportsModule.jsx`
    - `PrintModal.jsx`
  - Ensure all tables have soft padding, rounded headers, and clean row borders.

---

### Task 7: Build Verification & End-to-End Validation
**Files:**
- All workspace files

- [ ] **Step 1: Run build check**
  - Run `npm run build` to confirm zero JSX, syntax, or bundling errors.

- [ ] **Step 2: End-to-end flow test**
  - Test order creation with DP 25%, verify warning when DP < 25%.
  - Test PO creation and Surat Jalan print preview.
  - Confirm visually that the design matches the reference screenshot.
