# ⚡ Orbyte Flow (Orbyte Ingest)

> **Domain 2 — Orbyte Smart SME Challenge (Alpha Red Solutions)**  
> *AI-powered floating command overlay (Raycast/Spotlight) for WhatsApp Web turning messy customer & supplier chats into pre-validated Quotations, Purchase Orders, and LHDN e-invoices with zero data re-entry.*

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.2-black?logo=next.js)](https://nextjs.org/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)
[![DeepSeek](https://img.shields.io/badge/AI-DeepSeek%20%7C%20Gemini%20Fallback-059669)](https://platform.deepseek.com/)
[![LHDN Compliant](https://img.shields.io/badge/Tax-LHDN%20MyInvois%20TIN-amber)](#)

---

## 🎯 Executive Summary & Problem-Solution Fit

- **The Problem:** Over 90% of Malaysian micro and small businesses negotiate orders, agree on prices, and exchange receipts over WhatsApp. Business owners and clerks spend hours manually copying unstructured text, handwritten notes, and Manglish messages into Excel or invoicing software. This causes pricing errors, stock miscounts, missing customer tax data (LHDN TIN/SST), and delayed orders.
- **Our Solution:** Instead of forcing SMEs into bloated accounting software they won’t use, **Orbyte Flow** brings an intelligent floating command bar directly to where they already work.
- **The Core Loop:** Highlight chat $\rightarrow$ press **`Alt + O`** $\rightarrow$ LLM parses items & checks tax IDs against Orbyte $\rightarrow$ Admin clicks **`[Approve]`** $\rightarrow$ Instant audit log & formatted reply.
- **Compliance & Privacy:** Strictly adheres to PDPA — no passive background OS spyware; extraction triggers solely on explicit user action (`Alt + O` or button click).

---

## 🔄 The 5-Step Loop (Domain 2 Rubric)

| Step | Milestone | Implementation in Orbyte Flow |
|---|---|---|
| **1. Trigger** | User-Initiated Action | Admin highlights text in WhatsApp Web / Simulator and hits **`Alt + O`** (or clicks the floating emerald quick-action icon). |
| **2. Connected Data** | Orbyte Hub Integration | Matches raw items against the **Orbyte Catalog** (SKUs, stock counts, unit prices) and **Customer Directory** (LHDN TINs, BRN, address). |
| **3. Decision Logic** | AI Extraction & Rules Engine | **DeepSeek API** (with **Gemini fallback** and **deterministic offline heuristic parser**) parses Manglish into JSON. Deterministic rules flag stock deficits and tax compliance issues. |
| **4. Human Approval** | Control Layer (HUD) | Modern Raycast-style floating command overlay appears over the chat with amber warnings. The human operator can edit quantities/prices, switch between Quotation/PO/e-Invoice, or approve. |
| **5. Visible Outcome** | Audit Trail & Outcome | Stock is updated in Orbyte Hub, an immutable record is written to the **Activity Log**, and a clean, formatted WhatsApp confirmation is automatically copied to the clipboard. |

---

## 🚀 Live Demo & Presentation Guide

Orbyte Flow features **Dual Demo Mode** designed for an impressive, zero-flakiness pitch:

### 1. Interactive Web Presentation View (Recommended for Projector)
Run the web application locally or access your deployed Vercel/Replit link:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser:
- **Split Screen Mode:** Shows the realistic **WhatsApp Web simulator** on the left and the **Orbyte Business Hub** on the right side-by-side!
- **1-Click Demo Scenarios:** Click any scenario in the top ribbon:
  1. *#1 Ah Seng:* Manglish restock order (Milo, susu pekat, beras) $\rightarrow$ Clean instant match.
  2. *#2 Maju Curry:* Low stock order (Minyak Masak Seri Murni) $\rightarrow$ Triggers **Amber Stock Warning**.
  3. *#3 Jaya Hardware:* Missing TIN customer $\rightarrow$ Triggers **Amber LHDN e-Invoicing Alert**.
- **Interactive Highlight:** Highlight ANY text in the chat bubble and press **`Alt + O`** to invoke the HUD.
- **1-Click Approve:** Click **`[Approve & Generate PO]`** $\rightarrow$ Watch stock decrement and the audit log record update in real time on the right screen!

---

### 2. Chrome Extension (Manifest V3) for Real WhatsApp Web
If you want to demo live on real [https://web.whatsapp.com](https://web.whatsapp.com):
1. Open Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select the [`orbyte-flow/extension`](./extension) folder.
4. Open WhatsApp Web, select any message text, and press **`Alt + O`**!

---

## 🛠️ Tech Stack & Architecture

- **Frontend & Fullstack:** Next.js 16 (App Router, React 19, TypeScript), Tailwind CSS, Lucide React.
- **AI Extraction Pipeline:**
  - **Tier 1:** DeepSeek API (`deepseek-chat` via OpenAI SDK).
  - **Tier 2:** Google Gemini 1.5 Flash (`@google/generative-ai`).
  - **Tier 3:** Deterministic Malaysian SME regex/heuristic parser (100% demo uptime even without API keys).
- **Rules Engine:** Fuzzy SKU matcher, unit converter (kotak $\rightarrow$ carton, tin, papan $\rightarrow$ tray), stock validator, and LHDN MyInvois TIN validator.
- **Database:** Fast in-memory Orbyte store singleton with Next.js HMR preservation and seed data for Malaysian grocery & sundry products.

---

## ⚙️ Environment Variables

Create `.env.local` in the `orbyte-flow` folder:
```env
# Primary LLM: DeepSeek API (Optional)
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# Fallback LLM: Google Gemini API (Optional)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
```

> **Note on Zero-API-Key Resilience:**  
> If both API keys are omitted or offline, Orbyte Flow automatically runs in **Offline Heuristic Mode** using its built-in Malaysian SME order pattern parser. The demo will **never fail or crash** due to API rate limits or network issues!

---

## 📦 Deployment Guide

### Deploy to Vercel (1 Click)
1. Push your repository to GitHub.
2. In Vercel, click **Import Project** and set the Root Directory to `orbyte-flow`.
3. Add `DEEPSEEK_API_KEY` and `GEMINI_API_KEY` (optional) in Environment Variables.
4. Click **Deploy**!

### Deploy to Replit
1. Import from GitHub.
2. Run command: `npm install && npm run build && npm start`.
3. Set Port to `3000`.

---

## 🧪 Verification & Automated Testing

Run the comprehensive test suite (117+ unit, integration, and API tests):
```bash
npm test
```
Verify TypeScript types:
```bash
npx tsc --noEmit
```
Build for production:
```bash
npm run build
```

---

## 👥 Hackathon Team & Track
- **Challenge:** Domain 2 – Orbyte Smart SME Challenge
- **Partner:** Alpha Red Solutions
- **Product:** Orbyte Flow (Orbyte Ingest)
