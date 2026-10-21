# Orbyte Flow — Chrome Extension (Manifest V3)

This folder contains the ready-to-load unpacked Chrome Extension for **Orbyte Flow**. It injects the Raycast-style floating HUD directly into [web.whatsapp.com](https://web.whatsapp.com).

---

## How to Install in Google Chrome (1-Minute Setup)

1. Open **Google Chrome** and navigate to:
   ```text
   chrome://extensions/
   ```
2. In the top-right corner, toggle **Developer mode** to **ON**.
3. In the top-left corner, click **Load unpacked**.
4. Select this directory:
   ```text
   <path-to-repo>/orbyte-flow/extension
   ```
5. The extension icon **Orbyte Flow** will appear in your Chrome toolbar.

---

## Live Demo Steps on Real WhatsApp Web

1. Ensure the Orbyte Flow Next.js app is running locally:
   ```bash
   cd orbyte-flow
   npm run dev
   ```
   *(By default, the extension connects to `http://localhost:3000`. If you deployed to Vercel, click the Orbyte Flow extension icon and paste your Vercel URL!)*

2. Open **[https://web.whatsapp.com](https://web.whatsapp.com)** in Chrome.
3. Open any conversation where an order is discussed.
4. **Highlight the order message** (e.g., *"Boss, order 15 carton Milo, 5 tin susu pekat, deliver Friday to PJ site"*).
5. Press **`Alt + O`** (or click the floating emerald **"Extract with Orbyte"** button that pops up above the text).
6. The **Orbyte Flow HUD** appears directly over WhatsApp Web:
   - Reconciles items against catalog SKUs.
   - Shows stock availability badges and amber alerts.
   - Verifies customer LHDN Tax Identification Number (TIN).
7. Click **`[✓ Approve & Copy Reply]`**:
   - Updates stock in your Orbyte Business Hub.
   - Logs immutable compliance audit trail.
   - Copies clean, formatted order confirmation message to your clipboard ready to paste right back into WhatsApp!
