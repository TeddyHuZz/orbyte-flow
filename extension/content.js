/**
 * Orbyte Flow — WhatsApp Web Content Script
 * Injected into https://web.whatsapp.com/*
 * Captures order text, provides floating trigger & Alt+O shortcut,
 * renders Raycast-style review overlay, and executes 1-click approvals.
 */

(function () {
  let activeOverlay = null;
  let activeTriggerBtn = null;
  let selectedOrderText = '';

  // Get configured Backend URL (defaults to localhost:3000 during dev/demo)
  async function getApiBaseUrl() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(['orbyteApiUrl'], (res) => {
          resolve(res.orbyteApiUrl || 'http://localhost:3000');
        });
      } else {
        resolve('http://localhost:3000');
      }
    });
  }

  // Remove floating button
  function removeTriggerBtn() {
    if (activeTriggerBtn && activeTriggerBtn.parentNode) {
      activeTriggerBtn.parentNode.removeChild(activeTriggerBtn);
      activeTriggerBtn = null;
    }
  }

  // Show floating button near selection
  function showTriggerBtn(x, y, text) {
    removeTriggerBtn();
    selectedOrderText = text;

    const btn = document.createElement('div');
    btn.id = 'orbyte-flow-trigger-btn';
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"/>
      </svg>
      <span>Extract with Orbyte</span>
      <span style="opacity: 0.8; font-size: 10px; font-family: monospace;">(Alt+O)</span>
    `;

    btn.style.left = `${Math.max(10, Math.min(window.innerWidth - 200, x))}px`;
    btn.style.top = `${Math.max(10, y - 40)}px`;

    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      triggerExtraction(text);
      removeTriggerBtn();
    });

    document.body.appendChild(btn);
    activeTriggerBtn = btn;
  }

  // Trigger AI Extraction
  async function triggerExtraction(text) {
    if (!text || text.trim().length === 0) return;
    const apiUrl = await getApiBaseUrl();

    // Show loading modal
    showModal({
      title: 'Orbyte Flow — AI Extracting Order...',
      isLoading: true,
    });

    try {
      const res = await fetch(`${apiUrl}/api/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const data = await res.json();
      const draft = data.draft || data.result;

      if (!draft) {
        throw new Error('No order draft returned by parser');
      }

      showModal({
        title: 'Orbyte Flow HUD — Review Order',
        draft,
        apiUrl,
      });
    } catch (err) {
      console.error('Orbyte Flow extraction error:', err);
      showModal({
        title: 'Orbyte Flow — Extraction Failed',
        error: `Could not reach Orbyte API at ${apiUrl}. Please ensure your local or deployed app is running.`,
      });
    }
  }

  // Show HUD Modal
  function showModal({ title, draft, apiUrl, error, isLoading }) {
    closeModal();

    const backdrop = document.createElement('div');
    backdrop.id = 'orbyte-flow-modal-backdrop';

    const container = document.createElement('div');
    container.id = 'orbyte-flow-hud-container';

    let contentHtml = '';

    if (isLoading) {
      contentHtml = `
        <div style="padding: 40px; text-align: center; color: #a1a1aa;">
          <div style="font-size: 14px; font-weight: 600; color: #34d399; margin-bottom: 8px;">
            Parsing Manglish & Reconciling against Orbyte Catalog...
          </div>
          <div style="font-size: 12px;">Validating SKUs, inventory counts, and LHDN TIN</div>
        </div>
      `;
    } else if (error) {
      contentHtml = `
        <div style="padding: 24px; color: #f87171;">
          <div style="font-weight: bold; margin-bottom: 6px;">Connection Error</div>
          <div style="font-size: 13px; line-height: 1.5;">${error}</div>
        </div>
      `;
    } else if (draft) {
      const itemsHtml = (draft.items || [])
        .map(
          (item) => `
        <div class="orbyte-item-row">
          <div>
            <div style="font-weight: 600; color: #ffffff;">${item.matchedName || item.rawName}</div>
            <div style="font-size: 11px; color: #a1a1aa; font-family: monospace;">
              SKU: ${item.matchedSku || 'UNMATCHED'} • ${item.quantity} ${item.unit || 'unit'}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: bold; color: #34d399;">RM ${(item.lineTotal || 0).toFixed(2)}</div>
            ${
              item.warning
                ? `<div style="font-size: 10px; color: #fbbf24;">${item.warning}</div>`
                : `<div style="font-size: 10px; color: #6ee7b7;">In Stock (${item.stockAvailable ?? 0})</div>`
            }
          </div>
        </div>
      `
        )
        .join('');

      const tinHtml = draft.customerTin
        ? `<span class="orbyte-badge-verified">✓ LHDN TIN: ${draft.customerTin}</span>`
        : `<span class="orbyte-badge-warning">⚠ Missing LHDN TIN</span>`;

      const warningsHtml = (draft.warnings || [])
        .map((w) => `<div style="font-size: 12px; color: #fcd34d; margin-bottom: 4px;">⚠ ${w}</div>`)
        .join('');

      contentHtml = `
        <div class="orbyte-hud-body">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div>
              <div style="font-size: 12px; color: #a1a1aa;">Customer:</div>
              <div style="font-weight: bold; font-size: 14px; color: #ffffff;">${draft.customerName || 'Unknown Customer'}</div>
            </div>
            <div>${tinHtml}</div>
          </div>

          ${warningsHtml ? `<div style="background: rgba(69, 26, 3, 0.4); border: 1px solid #78350f; padding: 10px; border-radius: 8px; margin-bottom: 12px;">${warningsHtml}</div>` : ''}

          <div style="font-size: 12px; font-weight: 600; color: #a1a1aa; margin-bottom: 8px;">
            EXTRACTED ITEMS (${draft.items.length})
          </div>
          <div style="max-height: 220px; overflow-y: auto; margin-bottom: 16px;">
            ${itemsHtml}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: baseline; border-top: 1px solid #27272a; pt: 12px;">
            <div style="font-size: 12px; color: #a1a1aa;">
              Subtotal: RM ${draft.subtotal.toFixed(2)} • SST (${((draft.sstRate || 0.06) * 100).toFixed(0)}%): RM ${draft.tax.toFixed(2)}
            </div>
            <div style="font-size: 18px; font-weight: bold; color: #34d399;">
              Total: RM ${draft.total.toFixed(2)}
            </div>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="orbyte-hud-header">
        <div style="font-weight: 700; font-size: 14px; color: #ffffff; display: flex; align-items: center; gap: 8px;">
          <span>⚡ ${title}</span>
        </div>
        <button id="orbyte-modal-close" style="background: none; border: none; color: #a1a1aa; font-size: 18px; cursor: pointer;">✕</button>
      </div>
      ${contentHtml}
      <div class="orbyte-hud-footer">
        <button id="orbyte-modal-dismiss" class="orbyte-btn-secondary">Dismiss (Esc)</button>
        ${
          draft
            ? `<button id="orbyte-modal-approve" class="orbyte-btn-primary">✓ Approve & Copy Reply</button>`
            : ''
        }
      </div>
    `;

    backdrop.appendChild(container);
    document.body.appendChild(backdrop);
    activeOverlay = backdrop;

    // Attach button listeners
    container.querySelector('#orbyte-modal-close')?.addEventListener('click', closeModal);
    container.querySelector('#orbyte-modal-dismiss')?.addEventListener('click', closeModal);

    const approveBtn = container.querySelector('#orbyte-modal-approve');
    if (approveBtn && draft) {
      approveBtn.addEventListener('click', async () => {
        approveBtn.textContent = 'Processing...';
        approveBtn.disabled = true;

        try {
          const approveRes = await fetch(`${apiUrl}/api/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              draft,
              action: 'APPROVE',
              docType: 'purchase_order',
            }),
          });

          if (approveRes.ok) {
            const approvedData = await approveRes.json();
            if (approvedData.whatsappMessage) {
              await navigator.clipboard.writeText(approvedData.whatsappMessage);
            }
            alert('✅ Order Approved!\n• Stock updated in Orbyte Hub\n• Audit trail logged\n• Order confirmation copied to clipboard!');
            closeModal();
          } else {
            alert('Approval failed on server.');
          }
        } catch (err) {
          console.error('Approval failed:', err);
          alert('Failed to connect to backend server for approval.');
        }
      });
    }
  }

  function closeModal() {
    if (activeOverlay && activeOverlay.parentNode) {
      activeOverlay.parentNode.removeChild(activeOverlay);
      activeOverlay = null;
    }
  }

  // Text selection handler
  document.addEventListener('mouseup', () => {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : '';
    if (text && text.length > 5) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      showTriggerBtn(rect.left + rect.width / 2, rect.top, text);
    } else {
      setTimeout(removeTriggerBtn, 300);
    }
  });

  // Global Alt+O shortcut
  document.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'o' || e.key === 'O' || e.code === 'KeyO')) {
      e.preventDefault();
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : '';
      if (text) {
        triggerExtraction(text);
      } else if (selectedOrderText) {
        triggerExtraction(selectedOrderText);
      }
    } else if (e.key === 'Escape' && activeOverlay) {
      closeModal();
    }
  });
})();
