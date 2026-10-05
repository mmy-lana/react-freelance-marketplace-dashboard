# GigHub - Freelance Marketplace Dashboard

A high-performance freelance marketplace dashboard built with React, Tailwind CSS, and TypeScript. Featuring dual-persona domain partitioning (Seller vs. Buyer), real-time SLA countdown timers, a deterministic seed dataset, reactive local state with transactional rollback, and headless browser automated verification.

- **Repository:** [https://github.com/mmy-lana/react-freelance-marketplace-dashboard](https://github.com/mmy-lana/react-freelance-marketplace-dashboard)
- **Live Deployment:** [https://react-freelance-marketplace-dashboa.vercel.app](https://react-freelance-marketplace-dashboa.vercel.app)

---

## Overview

GigHub simulates an end-to-end creative service platform modeled after modern service marketplaces. The application enforces complete domain separation between service providers and clients, preventing privilege escalation, revenue misattribution, and unauthorized state mutations across the order lifecycle.

---

## Architectural Highlights

### 1. Dual-Persona Role Isolation (Seller vs. Buyer)
The application dynamically re-projects navigation, accessible views, and order workflows based on the active role:

- **Seller Mode:**
  - **Marketplace Explorer:** Analyze active listings against marketplace benchmarks and toggle listing visibility (`active` / `paused`).
  - **Seller Dashboard:** Real-time KPI telemetry (Gross Earnings, Active Orders, Completion Rate, Average Rating), historical sparklines, and algorithmic tier progression tracking.
  - **Incoming Orders:** Fulfilment queue scoped strictly to `order.sellerId === currentUser.id`. Actions permitted: `Start work`, `Deliver work` (with multi-file validation).
  - **Earnings & Payouts:** Ledger tracking available balances, pending escrow clearance countdowns, and formula-safe CSV financial exports.
  - **Seller Profile:** Public reputation metrics, tier progress checklist, and local storage integrity reports.

- **Buyer Mode:**
  - **Gig Explorer:** Multi-facet catalog search with 300ms query debouncing, category pills, budget sliders, and delivery timeframe filters.
  - **My Purchases:** Order queue scoped strictly to `order.buyerId === currentUser.id`. Actions permitted: `Submit requirements`, `Request revision`, `Approve & complete`.
  - **Buyer Account:** Purchase statistics, revision consumption counters, and released escrow history. Seller financials and tier progression are strictly concealed.

### 2. Guarded Order Lifecycle Machine
Every state transition passes through `authorizeOrderTransition` prior to execution:
- `pending_requirements` -> `in_progress` (Buyer submits questionnaire or seller initiates)
- `in_progress` -> `delivered` (Authorized seller only, requires file attachment meeting size/MIME constraints)
- `delivered` -> `revision` (Authorized buyer only, decrements remaining revisions)
- `delivered` -> `completed` (Authorized buyer only; escrow released; wallet balance credited only if the active profile is the assigned seller)
- `cancelled` (Terminal state)

Self-approval and self-dispute are blocked at the engine level.

### 3. Defensive Engineering & Security Hardening
- **Escrow Attribution (FIN-01):** Crediting is guarded by `order.sellerId === profile.id`. Buyers approving third-party orders release escrow without inflating their own balances.
- **Access Control (SEC-01):** Actor-to-role validation prevents unauthorized transitions across all mutation handlers.
- **XML Sanitization (SEC-02):** Dynamic SVG generation utilizes `escapeXml()` to neutralize XML entity injection and prevent rendering failures.
- **CSV Formula Injection Mitigation (SEC-03 / CWE-1236):** Ledger exports prefix cells starting with `=`, `+`, `-`, `@`, `\t`, or `\r` with a single apostrophe.
- **Transactional Storage (DATA-01):** State synchronization across multiple local storage keys is managed as a unified snapshot; quota rejections trigger automatic in-memory rollback.
- **Icon Policy Enforcement (CODE-01):** Pictographic emojis are replaced with Lucide SVG primitives, verified via automated AST linting.

---

## Tech Stack

- **Framework:** React (Latest stable)
- **Styling:** Tailwind CSS (Modern CSS-first configuration via `@theme`)
- **Language:** TypeScript (Strict mode enabled)
- **Bundler:** Vite
- **Icons:** Lucide React (Zero decorative emojis)
- **State & Storage:** Custom reactive hook bus (`useLocalStorageSync`) with cross-tab and in-tab event synchronization
- **Testing:** Puppeteer Core (Headless Chromium verification harness)
- **Package Manager:** `pnpm` (Strict)

---

## Getting Started

### Prerequisites
- Node.js (LTS recommended)
- `pnpm` installed globally:
  ```bash
  corepack enable
  corepack prepare pnpm@latest --activate
  ```

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/mmy-lana/react-freelance-marketplace-dashboard.git
   cd react-freelance-marketplace-dashboard
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```

### Development
Start the local development server:
```bash
pnpm dev
```

### Production Build
Typecheck and build the optimized distribution bundle:
```bash
pnpm build
```

Preview the production build locally:
```bash
pnpm preview
```

---

## Quality Assurance & Verification

The project includes an end-to-end headless browser verification harness that runs against a live production preview build across five mandatory viewports:
- Mobile Small: `360px x 740px`
- Mobile Medium: `390px x 844px`
- Mobile Large: `430px x 932px`
- Tablet: `768px x 1024px`
- Desktop: `1280px x 900px`

### Available Verification Scripts

- **Full Verification Pipeline (Build + Icon Lint + Responsive Verification + Security Audit):**
  ```bash
  pnpm verify
  ```
- **Typecheck:**
  ```bash
  pnpm typecheck
  ```
- **Icon Policy Lint (Zero Emoji Gate):**
  ```bash
  pnpm lint:icons
  ```
- **Audit Suite (Phase 6 Security & Domain Isolation):**
  ```bash
  pnpm verify:audit
  ```

---

## Directory Structure

```
├── scripts/
│   ├── lint-icons.mjs          # AST/regex scanner preventing pictographic character leaks
│   └── verify.mjs              # Headless Chrome test runner across 5 viewports
├── src/
│   ├── components/
│   │   ├── compound/           # Compound feature molecules (GigCard, TierMatrix, Countdown, Rows)
│   │   ├── domain/             # Complete domain views (Explorer, Dashboard, Queue, Earnings, Profile)
│   │   ├── primitives/         # Atomic accessible primitives (Button, Input, Select, Modal, Tabs)
│   │   └── shell/              # Application layout (AppHeader, MobileNav)
│   ├── context/
│   │   ├── MarketplaceContext.tsx # Central transactional data repository & mutation engine
│   │   └── ToastContext.tsx       # Accessible non-blocking toast notifications
│   ├── hooks/
│   │   ├── useDebounce.ts         # High-frequency search stream throttling
│   │   ├── useLocalStorageSync.ts # Reactive storage hook with CustomEvent bus
│   │   ├── useOrderCountdown.ts   # Second-by-second SLA timer computation
│   │   └── useSellerProgression.ts# Pure seller tier evaluation engine
│   ├── types/
│   │   └── marketplace.ts      # Pure TypeScript interfaces, DTOs, and transition matrices
│   ├── utils/
│   │   ├── currency.ts         # Integer-cents financial formatting & fee calculations
│   │   ├── date.ts             # Pure countdown diffing, relative time, and SLA urgency
│   │   ├── id.ts               # Safe UUID generator with timestamp fallback
│   │   ├── seedData.ts         # Deterministic offline dataset with XML-escaped SVG artwork
│   │   └── storage.ts          # Schema sanitizer, integrity verification, and repair logic
│   ├── App.tsx                 # View routing, persona gating, and main layout container
│   ├── index.css               # Tailwind CSS tokens, typography, and animation definitions
│   └── main.tsx                # Application root mounting
├── index.html                  # HTML5 shell with viewport-fit meta headers
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## License

This project is licensed under the MIT License.
