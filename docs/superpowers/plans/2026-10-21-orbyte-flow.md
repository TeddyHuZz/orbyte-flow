# Orbyte Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build "Orbyte Flow", an AI-powered floating command overlay (Raycast/Spotlight-style) for WhatsApp Web that turns messy Malaysian SME chats into pre-validated Quotations, Purchase Orders, and LHDN e-invoices with zero data re-entry, running in a dual-mode Next.js app with a companion Chrome Extension.

**Architecture:** A unified fullstack Next.js 16 app containing:
1. An interactive WhatsApp Web simulator with Malaysian SME chat threads.
2. An AI extraction pipeline (DeepSeek API with Gemini fallback and offline heuristic parser).
3. A business rules validation engine checking stock levels, unit pricing, and LHDN TINs against Orbyte Hub.
4. A floating Raycast-style HUD overlay for human review, in-line editing, and 1-click PO/Quotation generation.
5. An Orbyte Business Hub dashboard showing real-time inventory adjustments and immutable audit logging.
6. A standalone Chrome Extension (`/extension`) directory ready for unpacked loading in Google Chrome.

**Tech Stack:** Next.js 16 (App Router, Turbopack, TypeScript), Tailwind CSS, Lucide React, OpenAI SDK (for DeepSeek API), Google Generative AI SDK (fallback).

**Spec:** `orbyte-flow/docs/superpowers/specs/2026-10-21-orbyte-flow-design.md`

## Global Constraints
- Must deploy cleanly on Vercel and Replit without native binary or Docker dependencies.
- Zero-API-Key resilience: Must run fully in "Offline Deterministic Mode" if `DEEPSEEK_API_KEY` or `GEMINI_API_KEY` is omitted.
- Compliant with Malaysian PDPA: No passive OS-level scraping; extraction only triggers on explicit user selection + `Alt + O` (or button click).

---

### Task 1: Domain Types & Mock Orbyte Database

**Files:**
- Create: `orbyte-flow/src/types/index.ts`
- Create: `orbyte-flow/src/lib/orbyte/types.ts`
- Create: `orbyte-flow/src/lib/orbyte/seed-data.ts`
- Create: `orbyte-flow/src/lib/orbyte/db.ts`
- Test: `orbyte-flow/src/lib/orbyte/db.test.ts` (or node runner script)

**Interfaces:**
- Produces:
  - `Product`: `{ id, sku, name, unitPrice, stock, category, unit }`
  - `Customer`: `{ id, name, phone, address, tin, sstRegistered }`
  - `ExtractedLineItem`: `{ rawName, quantity, unit, matchedSku?, unitPrice?, stockAvailable?, warning? }`
  - `OrderDraft`: `{ id, customerName, customerTin, items, subtotal, tax, total, notes, status, createdAt }`
  - `AuditLogEntry`: `{ id, timestamp, user, action, details, status }`
  - `orbyteDb`: singleton in-memory database with methods `getProducts()`, `getProductBySku(sku)`, `updateStock(sku, delta)`, `getCustomers()`, `findCustomer(query)`, `addAuditLog(entry)`, `getAuditLogs()`

- [ ] **Step 1: Create domain types** in `src/types/index.ts` and `src/lib/orbyte/types.ts`.
- [ ] **Step 2: Create realistic Malaysian SME seed data** in `src/lib/orbyte/seed-data.ts` (Milo 1kg, Susu Pekat F&N, Beras Jasmine Super 10kg, Minyak Masak Seri Murni 5kg, Telur Gred A, Nescafe Classic 200g, customers with valid/missing LHDN TINs).
- [ ] **Step 3: Implement in-memory Orbyte store** in `src/lib/orbyte/db.ts`.
- [ ] **Step 4: Verify Orbyte store operations** via quick node verification script.

---

### Task 2: AI Extraction Engine with Multi-Tier Fallback

**Files:**
- Create: `orbyte-flow/src/lib/llm/mock-parser.ts`
- Create: `orbyte-flow/src/lib/llm/deepseek.ts`
- Create: `orbyte-flow/src/lib/llm/gemini.ts`
- Create: `orbyte-flow/src/lib/llm/client.ts`

**Interfaces:**
- Produces: `extractOrderFromText(rawText: string): Promise<ExtractionResult>`
  - `ExtractionResult`: `{ success: boolean, providerUsed: 'deepseek' | 'gemini' | 'mock', customerName?: string, notes?: string, items: Array<{ rawName: string, quantity: number, unit: string }> }`

- [ ] **Step 1: Implement `mock-parser.ts`** using regex rules tailored for Malaysian SME chat patterns (e.g. "15 carton Milo", "5 tin susu pekat", "deliver by Friday to PJ site").
- [ ] **Step 2: Implement `deepseek.ts`** calling `https://api.deepseek.com` with JSON schema output.
- [ ] **Step 3: Implement `gemini.ts`** calling Gemini API with structured JSON output.
- [ ] **Step 4: Implement `client.ts`** orchestrating fallback: DeepSeek $\rightarrow$ Gemini $\rightarrow$ Mock Parser.
- [ ] **Step 5: Verify extraction** with test strings (Manglish, English, Malay).

---

### Task 3: Deterministic Business Rules Engine

**Files:**
- Create: `orbyte-flow/src/lib/rules/validator.ts`

**Interfaces:**
- Consumes: `ExtractionResult` from Task 2, `orbyteDb` from Task 1.
- Produces: `validateAndEnrichOrder(extracted: ExtractionResult): EnrichedOrderDraft`
  - Matches items to Orbyte catalog SKUs.
  - Computes unit prices, line totals, 6%/8% SST calculations.
  - Flags Amber Alerts:
    - `LOW_STOCK`: e.g. "Requested 15, Only 8 available in stock".
    - `MISSING_TIN`: e.g. "Customer TIN missing — non-compliant for LHDN e-Invoicing".
    - `UNMATCHED_SKU`: e.g. "Unrecognized item — manual match required".

- [ ] **Step 1: Implement SKU matcher** (fuzzy matching on product names/aliases).
- [ ] **Step 2: Implement stock, pricing, and tax calculation logic**.
- [ ] **Step 3: Implement LHDN compliance check** (TIN format check / missing check).
- [ ] **Step 4: Verify validator** with test cases.

---

### Task 4: Next.js API Routes

**Files:**
- Create: `orbyte-flow/src/app/api/extract/route.ts` (POST)
- Create: `orbyte-flow/src/app/api/validate/route.ts` (POST)
- Create: `orbyte-flow/src/app/api/approve/route.ts` (POST)
- Create: `orbyte-flow/src/app/api/catalog/route.ts` (GET, POST)
- Create: `orbyte-flow/src/app/api/audit-log/route.ts` (GET)

**Interfaces:**
- `/api/extract`: Accepts `{ text: string }`, returns `{ result: EnrichedOrderDraft }`
- `/api/approve`: Accepts `{ draft: EnrichedOrderDraft, action: 'APPROVE' | 'REJECT', editedItems?: [] }`, updates inventory, creates audit log entry, returns formatted WhatsApp clipboard text and PO reference.
- `/api/catalog`: Returns all SKUs and current stock levels.
- `/api/audit-log`: Returns list of all audit trail entries.

- [ ] **Step 1: Implement `/api/extract` & `/api/validate` routes**.
- [ ] **Step 2: Implement `/api/approve` route** with stock decrement & clipboard confirmation generator.
- [ ] **Step 3: Implement `/api/catalog` & `/api/audit-log` routes**.
- [ ] **Step 4: Test API endpoints** with `curl` or fetch script.

---

### Task 5: Floating HUD Raycast/Spotlight Overlay Component

**Files:**
- Create: `orbyte-flow/src/components/simulator/FloatingHUD.tsx`
- Create: `orbyte-flow/src/components/simulator/HUDLineItemRow.tsx`

**Interfaces:**
- Consumes: `EnrichedOrderDraft`, callbacks `onApprove`, `onReject`, `onClose`, `onUpdateDraft`.
- UI Features:
  - Command bar styling (dark glassmorphism / sleek modern HUD, like Raycast).
  - Amber warning banners for low stock and missing LHDN TIN.
  - In-line editable quantity, price, and SKU dropdown.
  - Document type selector: `Quotation` / `Purchase Order` / `e-Invoice Draft`.
  - Keyboard shortcut hints (`Esc` to dismiss, `Enter` to approve).

- [ ] **Step 1: Build the modal HUD container** with smooth backdrop and floating card positioning.
- [ ] **Step 2: Build the editable line items table** with unit price calculations and stock badges.
- [ ] **Step 3: Build warning alert banners** for compliance and stock shortfalls.
- [ ] **Step 4: Wire Approve, Edit, and Reject actions**.

---

### Task 6: WhatsApp Web Simulator Component

**Files:**
- Create: `orbyte-flow/src/components/simulator/WhatsAppView.tsx`
- Create: `orbyte-flow/src/components/simulator/ChatSidebar.tsx`
- Create: `orbyte-flow/src/components/simulator/ChatBubble.tsx`
- Create: `orbyte-flow/src/components/simulator/sample-chats.ts`

**Interfaces:**
- Features:
  - Realistic WhatsApp Web interface (Green header, sidebar with chat contacts, chat message area, typing box).
  - Pre-seeded realistic Malaysian SME chats:
    1. *Kedai Runcit Ah Seng* (Restock order in Manglish).
    2. *Restoran Maju Curry House* (Bulk catering items with delivery deadline).
    3. *Perniagaan Jaya Hardware* (Supplier invoice / PO check).
  - Text selection trigger: Highlighting text surfaces a floating badge: **"Extract with Orbyte (Alt + O)"**.
  - Quick action buttons: "Try Sample Order #1", "Try Sample Order #2" for quick 1-click live demoing.

- [ ] **Step 1: Create sample Malaysian conversations** in `sample-chats.ts`.
- [ ] **Step 2: Build WhatsApp sidebar and contact list**.
- [ ] **Step 3: Build chat view with text selection event listener and hotkey `Alt + O`**.
- [ ] **Step 4: Connect text selection to open FloatingHUD**.

---

### Task 7: Orbyte Business Hub Management Dashboard

**Files:**
- Create: `orbyte-flow/src/components/orbyte/HubDashboard.tsx`
- Create: `orbyte-flow/src/components/orbyte/InventoryTable.tsx`
- Create: `orbyte-flow/src/components/orbyte/CustomerDirectory.tsx`
- Create: `orbyte-flow/src/components/orbyte/AuditTrail.tsx`

**Interfaces:**
- Tabs:
  - **Audit Trail:** Table of events (`Timestamp | User | Action | Status | Summary`).
  - **Inventory & Catalog:** Table showing SKU, Name, Stock Level, Price, and Stock Status (In Stock / Low Stock / Out of Stock).
  - **Customer Directory:** Business name, Phone, LHDN TIN status (Verified / Missing), Address.
- Real-time updates: Refreshes whenever an order is approved from the simulator.

- [ ] **Step 1: Implement Inventory & Catalog view**.
- [ ] **Step 2: Implement Customer Directory view with LHDN TIN status badges**.
- [ ] **Step 3: Implement real-time Audit Trail table**.
- [ ] **Step 4: Integrate tabs inside HubDashboard container**.

---

### Task 8: Dual-Demo Mode Page & Navigation Integration

**Files:**
- Modify: `orbyte-flow/src/app/page.tsx`
- Modify: `orbyte-flow/src/app/layout.tsx`
- Create: `orbyte-flow/src/components/TopNavbar.tsx`

**Interfaces:**
- Header Bar:
  - App Logo: "Orbyte Flow"
  - Mode Switcher / Split View:
    - "WhatsApp Simulator (Frontend)"
    - "Orbyte Business Hub (Backend)"
    - "Split Screen (Presentation View - Perfect for Projector)"
  - Provider indicator badge: `DeepSeek (Active)` or `Gemini` or `Offline Mock Mode`.
  - Copy notification toast when customer summary is generated.

- [ ] **Step 1: Build TopNavbar with view mode toggle and AI provider status badge**.
- [ ] **Step 2: Wire `src/app/page.tsx` with Split Screen & Tab views**.
- [ ] **Step 3: Connect clipboard copy toast on order approval**.
- [ ] **Step 4: Verify end-to-end user loop in the browser**.

---

### Task 9: Chrome Extension Manifest V3 Package

**Files:**
- Create: `orbyte-flow/extension/manifest.json`
- Create: `orbyte-flow/extension/content.js`
- Create: `orbyte-flow/extension/overlay.css`
- Create: `orbyte-flow/extension/background.js`
- Create: `orbyte-flow/extension/README.md`

**Interfaces:**
- Manifest V3 extension that works on `https://web.whatsapp.com/*`:
  - Detects text selection on WhatsApp Web.
  - Listens for `Alt + O`.
  - Injects a floating iframe/modal connecting to `http://localhost:3000` (or the deployed Vercel URL).
  - Displays clear instructions in `extension/README.md` on how to load unpacked in Chrome.

- [ ] **Step 1: Create `manifest.json` (V3, permissions: `activeTab`, `storage`, host: `web.whatsapp.com`)**.
- [ ] **Step 2: Create `content.js` with selection capture and `Alt + O` shortcut**.
- [ ] **Step 3: Create overlay CSS and HUD bridge**.
- [ ] **Step 4: Write `extension/README.md` with step-by-step Chrome load instructions**.

---

### Task 10: Final Verification & Production Build

**Files:**
- Modify: `orbyte-flow/README.md`
- Verify: `npm run build`

- [ ] **Step 1: Run `npm run build` to verify zero TypeScript and ESLint errors**.
- [ ] **Step 2: Test all Malaysian chat scenarios and verification cases**.
- [ ] **Step 3: Update `README.md` with demo script, Vercel/Replit deployment steps, and hackathon rubric highlights**.
