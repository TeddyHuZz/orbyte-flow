'use client';

import React from 'react';
import { ExtractedLineItem, Product } from '@/types';
import { AlertCircle, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';

interface HUDLineItemRowProps {
  item: ExtractedLineItem;
  index: number;
  products?: Product[];
  onUpdate: (index: number, updated: Partial<ExtractedLineItem>) => void;
  onRemove: (index: number) => void;
}

export const HUDLineItemRow: React.FC<HUDLineItemRowProps> = ({
  item,
  index,
  products = [],
  onUpdate,
  onRemove,
}) => {
  const stock = item.stockAvailable ?? 0;
  const isMatched = Boolean(item.matchedSku);
  const isOutOfStock = isMatched && stock === 0;
  const isLowStock = isMatched && stock > 0 && stock < item.quantity;
  const isSufficient = isMatched && stock >= item.quantity;

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const newQty = isNaN(val) ? 0 : Math.max(0, val);
    const price = item.unitPrice ?? 0;
    onUpdate(index, {
      quantity: newQty,
      lineTotal: Math.round(newQty * price * 100) / 100,
    });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const newPrice = isNaN(val) ? 0 : Math.max(0, val);
    const qty = item.quantity;
    onUpdate(index, {
      unitPrice: newPrice,
      lineTotal: Math.round(qty * newPrice * 100) / 100,
    });
  };

  const handleSkuSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedSku = e.target.value;
    const foundProduct = products.find((p) => p.sku === selectedSku);
    if (foundProduct) {
      onUpdate(index, {
        matchedSku: foundProduct.sku,
        matchedName: foundProduct.name,
        unitPrice: foundProduct.unitPrice,
        unit: foundProduct.unit,
        stockAvailable: foundProduct.stock,
        lineTotal: Math.round(item.quantity * foundProduct.unitPrice * 100) / 100,
        warning: undefined,
      });
    }
  };

  return (
    <div className="group flex flex-col p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50 hover:border-zinc-600 transition-all gap-2">
      <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        {/* Item Name & SKU selector */}
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-100 text-sm">
              {item.matchedName || item.rawName}
            </span>
            {item.rawName !== item.matchedName && item.matchedName && (
              <span className="text-xs text-zinc-400 italic">
                (from: &ldquo;{item.rawName}&rdquo;)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            {isMatched ? (
              <span className="inline-flex items-center text-xs font-mono px-2 py-0.5 rounded bg-zinc-700/80 text-zinc-300">
                {item.matchedSku}
              </span>
            ) : (
              <div className="flex items-center gap-1 text-xs text-rose-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Unmatched SKU:</span>
                <select
                  value=""
                  onChange={handleSkuSelect}
                  className="bg-zinc-900 border border-rose-500/50 rounded px-1.5 py-0.5 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="">Select Catalog Item...</option>
                  {products.map((p) => (
                    <option key={p.sku} value={p.sku}>
                      {p.name} ({p.sku}) - RM {p.unitPrice.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Stock status badge */}
            {isMatched && (
              <>
                {isSufficient && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                    <CheckCircle2 className="w-3 h-3" />
                    In Stock ({stock})
                  </span>
                )}
                {isLowStock && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-400 border border-amber-800/60">
                    <AlertTriangle className="w-3 h-3" />
                    Low Stock ({stock}/{item.quantity})
                  </span>
                )}
                {isOutOfStock && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-400 border border-rose-800/60">
                    <AlertCircle className="w-3 h-3" />
                    Out of Stock (0)
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Quantity & Unit input */}
        <div className="flex items-center gap-1">
          <label className="text-[11px] text-zinc-400 mr-1">Qty:</label>
          <input
            type="number"
            min="1"
            value={item.quantity}
            onChange={handleQtyChange}
            className="w-16 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-center text-zinc-100 focus:outline-none focus:border-emerald-500"
          />
          <span className="text-xs text-zinc-400 font-mono w-12 text-left truncate">
            {item.unit || 'unit'}
          </span>
        </div>

        {/* Unit Price input */}
        <div className="flex items-center gap-1">
          <label className="text-[11px] text-zinc-400 mr-1">Price (RM):</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={item.unitPrice ?? 0}
            onChange={handlePriceChange}
            className="w-20 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-right text-zinc-100 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Line Total */}
        <div className="w-24 text-right">
          <div className="text-xs text-zinc-400">Total</div>
          <div className="text-sm font-semibold text-emerald-400">
            RM {(item.lineTotal ?? (item.quantity * (item.unitPrice ?? 0))).toFixed(2)}
          </div>
        </div>

        {/* Delete button */}
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-zinc-700/50 transition-colors"
          title="Remove line item"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Amber alert warning message if item has specific warning */}
      {item.warning && (
        <div className="text-xs text-amber-400 bg-amber-950/40 border border-amber-900/60 rounded-md px-2 py-1 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{item.warning}</span>
        </div>
      )}
    </div>
  );
};
