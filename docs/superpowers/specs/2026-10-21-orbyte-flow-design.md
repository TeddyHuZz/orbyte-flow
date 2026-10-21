# Orbyte Flow — System Design Specification

- **Project:** Orbyte Flow (Orbyte Ingest)
- **Track:** Domain 2 – Orbyte Smart SME Challenge (Alpha Red Solutions)
- **Date:** 2026-10-21
- **Status:** Approved

---

## 1. Executive Summary

Orbyte Flow is an AI-powered, floating command overlay (inspired by Raycast/Spotlight) for WhatsApp Web and desktop that transforms unstructured customer and supplier chats into pre-validated Quotations, Purchase Orders, and LHDN e-invoice drafts without manual data re-entry.

The system adheres strictly to the **5-Step Loop**:
1. **Trigger:** User highlights chat text in WhatsApp and presses `Alt + O` (or clicks floating Orbyte icon).
2. **Connected Data:** Reconciles line items against Orbyte catalog (SKUs, inventory count, unit prices) and customer directory (names, addresses, LHDN TINs).
3. **Decision Logic:** LLM extracts messy Manglish/Malay/English text to structured JSON; deterministic rules engine verifies stock availability and SST/TIN compliance.
4. **Human Approval:** Raycast-style floating HUD allows human operator to Inspect, Edit, or Approve with amber alert highlights.
5. **Visible Outcome & Audit Trail:** Formats customer reply summary to clipboard and writes an immutable audit record in Orbyte Activity Log.

---

## 2. System Architecture

The project is structured as a **Unified Fullstack Next.js Monorepo** optimized for zero-config deployment on Vercel and Replit, featuring a **Dual Demo Mode**:
1. **Interactive Web Simulator:** Simulated WhatsApp Web interface with pre-loaded Malaysian SME conversations and embedded Raycast HUD overlay.
2. **Orbyte Business Hub:** Tabbed management interface for Live Catalog, Customer Directory with LHDN TINs, and Real-Time Audit Log.
3. **Chrome Extension (`/extension`):** Manifest V3 package ready for unpacked installation in Google Chrome to run on real `web.whatsapp.com`.

### 2.1 Technology Stack
- **Framework:** Next.js 14+ (App Router, TypeScript)
- **Styling:** Tailwind CSS, Lucide React Icons
- **Primary LLM:** DeepSeek API (`deepseek-chat` via OpenAI SDK client)
- **Fallback LLM:** Google Gemini (`gemini-1.5-flash` / `gemini-2.5-flash`)
- **Offline Fallback:** Deterministic local heuristic/regex parser (guaranteeing 100% demo uptime without API keys)
- **State & Data Store:** In-memory mock database seeded with realistic Malaysian SME stock (F&B / Sundry goods) with runtime mutations

---

## 3. Directory Layout

```text
orbyte-flow/
├── README.md
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── .env.example
├── docs/
│   └── superpowers/specs/2026-10-21-orbyte-flow-design.md
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/
│   │       ├── extract/route.ts
│   │       ├── validate/route.ts
│   │       ├── approve/route.ts
│   │       ├── audit-log/route.ts
│   │       └── catalog/route.ts
│   ├── components/
│   │   ├── simulator/
│   │   │   ├── WhatsAppView.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   └── FloatingHUD.tsx
│   │   ├── orbyte/
│   │   │   ├── HubDashboard.tsx
│   │   │   ├── InventoryTable.tsx
│   │   │   ├── CustomerDirectory.tsx
│   │   │   └── AuditTrail.tsx
│   │   └── ui/
│   ├── lib/
│   │   ├── llm/
│   │   │   ├── client.ts
│   │   │   ├── deepseek.ts
│   │   │   ├── gemini.ts
│   │   │   └── mock-parser.ts
│   │   ├── orbyte/
│   │   │   ├── db.ts
│   │   │   └── seed-data.ts
│   │   └── rules/
│   │       └── validator.ts
│   └── types/
│       └── index.ts
└── extension/
    ├── manifest.json
    ├── content.js
    ├── overlay.html
    ├── overlay.css
    ├── background.js
    └── README.md
```

---

## 4. Detailed Component Design

### 4.1 AI Engine (`src/lib/llm/`)
- Multi-tier extraction:
  1. DeepSeek API call with system prompt instructing extraction of:
     - `customerName` (or inferred sender)
     - `deliveryDate` / `notes`
     - `items`: `[{ rawName, quantity, unit }]`
  2. If DeepSeek errors or times out (5s), fall back to Gemini.
  3. If Gemini errors or keys are missing, fallback to `mock-parser.ts` which uses regex pattern matching for Malaysian grocery/hardware terms (carton, tin, ikat, ctn, kg).

### 4.2 Rules Engine (`src/lib/rules/`)
- Reconciles extracted items with Orbyte Catalog:
  - Exact or fuzzy match on product name (e.g. "Milo carton" $\rightarrow$ `MILO-CTN-24`).
  - Stock validation: flags `warning: "Low Stock: Only X units available"`.
  - Customer TIN validation: flags `warning: "Customer TIN missing for LHDN e-Invoicing"`.
  - Calculates line subtotal, SST (if applicable), and total.

### 4.3 Floating HUD (`src/components/simulator/FloatingHUD.tsx`)
- Command modal positioned over the active chat.
- Displays:
  - Header: Document Type toggle (Quotation vs Purchase Order vs Tax Invoice).
  - Customer Details + TIN badge (Green = Verified, Amber = Missing).
  - Line Items table with editable quantity and unit price.
  - Warnings Banner (Stock alert, TIN alert).
  - Actions: `[Cancel]`, `[Edit Details]`, `[Approve & Create]`.

### 4.4 Orbyte Hub Dashboard (`src/components/orbyte/`)
- Tabs:
  - **Live Audit Trail:** Logs all approvals with immutable timestamp, user, action, and JSON payload summary.
  - **Catalog & Inventory:** Live stock counts, unit prices, SKU badges. Decrements stock upon PO approval.
  - **Customer Directory:** Registered customer business names, phone numbers, addresses, and LHDN TINs.

---

## 5. Verification Plan

1. **Build & Lint Verification:** `npm run build` succeeds without TypeScript or ESLint errors.
2. **API Verification:**
   - POST `/api/extract` with Manglish chat sample returns structured line items.
   - POST `/api/validate` correctly tags stock deficit and missing TIN.
   - POST `/api/approve` creates PO, updates inventory, and writes to audit log.
3. **UI Verification:**
   - WhatsApp simulator allows clicking pre-set messages or typing custom messages.
   - `Alt + O` or clicking the "Extract with Orbyte" button pops open the Floating HUD.
   - Approving an order updates the Orbyte Hub tab immediately and copies WhatsApp confirmation text to clipboard.
