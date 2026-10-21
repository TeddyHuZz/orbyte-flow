'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  EnrichedOrderDraft,
  ExtractedLineItem,
  DocumentType,
  Product,
} from '@/types';
import { HUDLineItemRow } from './HUDLineItemRow';
import {
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Command,
  Loader2,
} from 'lucide-react';

interface FloatingHUDProps {
  draft: EnrichedOrderDraft | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (draft: EnrichedOrderDraft, docType: DocumentType) => Promise<void> | void;
  onReject: (draft: EnrichedOrderDraft) => Promise<void> | void;
  onUpdateDraft?: (updatedDraft: EnrichedOrderDraft) => void;
  products?: Product[];
  isApproving?: boolean;
}

export const FloatingHUD: React.FC<FloatingHUDProps> = ({
  draft,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onUpdateDraft,
  products = [],
  isApproving = false,
}) => {
  const [docType, setDocType] = useState<DocumentType>(draft?.docType || 'purchase_order');
  const [currentDraft, setCurrentDraft] = useState<EnrichedOrderDraft | null>(draft);

  // Sync draft prop changes
  useEffect(() => {
    setCurrentDraft(draft);
    if (draft?.docType) {
      setDocType(draft.docType);
    }
  }, [draft]);

  // Recalculate totals
  const recalculateDraft = useCallback((items: ExtractedLineItem[]): EnrichedOrderDraft | null => {
    if (!currentDraft) return null;
    const subtotal = items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
    const sstRate = currentDraft.sstRate ?? 0.06;
    const tax = Math.round(subtotal * sstRate * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    const updated: EnrichedOrderDraft = {
      ...currentDraft,
      items,
      subtotal,
      tax,
      total,
      updatedAt: new Date().toISOString(),
    };
    return updated;
  }, [currentDraft]);

  const handleItemUpdate = (index: number, updatedItem: Partial<ExtractedLineItem>) => {
    if (!currentDraft) return;
    const newItems = [...currentDraft.items];
    newItems[index] = { ...newItems[index], ...updatedItem };
    const refreshed = recalculateDraft(newItems);
    if (refreshed) {
      setCurrentDraft(refreshed);
      onUpdateDraft?.(refreshed);
    }
  };

  const handleItemRemove = (index: number) => {
    if (!currentDraft) return;
    const newItems = currentDraft.items.filter((_, i) => i !== index);
    const refreshed = recalculateDraft(newItems);
    if (refreshed) {
      setCurrentDraft(refreshed);
      onUpdateDraft?.(refreshed);
    }
  };

  const handleAddItem = () => {
    if (!currentDraft) return;
    const defaultProduct = products[0];
    const newItem: ExtractedLineItem = {
      rawName: defaultProduct ? defaultProduct.name : 'New Item',
      quantity: 1,
      unit: defaultProduct ? defaultProduct.unit : 'unit',
      matchedSku: defaultProduct ? defaultProduct.sku : undefined,
      matchedName: defaultProduct ? defaultProduct.name : undefined,
      unitPrice: defaultProduct ? defaultProduct.unitPrice : 0,
      lineTotal: defaultProduct ? defaultProduct.unitPrice : 0,
      stockAvailable: defaultProduct ? defaultProduct.stock : 0,
    };
    const newItems = [...currentDraft.items, newItem];
    const refreshed = recalculateDraft(newItems);
    if (refreshed) {
      setCurrentDraft(refreshed);
      onUpdateDraft?.(refreshed);
    }
  };

  const handleDocTypeChange = (type: DocumentType) => {
    setDocType(type);
    if (currentDraft) {
      const updated = { ...currentDraft, docType: type };
      setCurrentDraft(updated);
      onUpdateDraft?.(updated);
    }
  };

  const handleApprove = () => {
    if (currentDraft && !isApproving) {
      onApprove(currentDraft, docType);
    }
  };

  const handleReject = () => {
    if (currentDraft && !isApproving) {
      onReject(currentDraft);
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
        // Prevent default only if not in an input
        const target = e.target as HTMLElement;
        const isInputField = target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA';
        if (!isInputField || e.metaKey || e.ctrlKey) {
          e.preventDefault();
          handleApprove();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentDraft, isApproving]);

  if (!isOpen || !currentDraft) return null;

  const hasWarnings = (currentDraft.warnings && currentDraft.warnings.length > 0) || !currentDraft.isLhdnCompliant;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      {/* Raycast HUD Window */}
      <div className="w-full max-w-3xl bg-zinc-900 border border-zinc-700/80 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[92vh] text-zinc-100 ring-1 ring-white/10">
        
        {/* Top Header / Command Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">Orbyte Flow HUD</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 border border-zinc-700 text-zinc-400 flex items-center gap-1">
                  <Command className="w-3 h-3" /> Alt + O
                </span>
              </div>
              <p className="text-xs text-zinc-400">Instant AI Reconciliation & LHDN Validation</p>
            </div>
          </div>

          {/* Doc Type Selector */}
          <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => handleDocTypeChange('purchase_order')}
              className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
                docType === 'purchase_order'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Purchase Order
            </button>
            <button
              type="button"
              onClick={() => handleDocTypeChange('quotation')}
              className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
                docType === 'quotation'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Quotation
            </button>
            <button
              type="button"
              onClick={() => handleDocTypeChange('tax_invoice')}
              className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
                docType === 'tax_invoice'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              e-Invoice Draft
            </button>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer & LHDN Compliance Header */}
        <div className="px-5 py-3.5 bg-zinc-900/90 border-b border-zinc-800/80 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <span className="text-zinc-400 text-xs block">Customer:</span>
              <span className="font-semibold text-white">
                {currentDraft.customerName || 'Walk-in / Unregistered Buyer'}
              </span>
            </div>
            {currentDraft.notes && (
              <div className="text-xs text-zinc-400 bg-zinc-800/80 px-2.5 py-1 rounded-md border border-zinc-700/60 max-w-xs truncate">
                Delivery: <span className="text-zinc-200">{currentDraft.notes}</span>
              </div>
            )}
          </div>

          {/* LHDN TIN Badge */}
          <div>
            {currentDraft.customerTin ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>LHDN TIN: {currentDraft.customerTin} (Verified)</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-950/80 text-amber-300 border border-amber-800/60 animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>⚠️ Missing LHDN TIN (e-Invoice Incomplete)</span>
              </div>
            )}
          </div>
        </div>

        {/* Amber Warnings Banner */}
        {hasWarnings && (
          <div className="px-5 py-2.5 bg-amber-950/30 border-b border-amber-900/50 flex flex-col gap-1">
            {currentDraft.warnings.map((warn, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>{warn}</span>
              </div>
            ))}
            {!currentDraft.customerTin && (
              <div className="flex items-center gap-2 text-xs text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>LHDN e-invoicing requires valid TIN. You may approve as Quotation/PO, but official e-Invoice requires TIN registration.</span>
              </div>
            )}
          </div>
        )}

        {/* Line Items Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-[180px] max-h-[45vh]">
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1 font-medium">
            <span>EXTRACTED LINE ITEMS ({currentDraft.items.length})</span>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline"
            >
              <Plus className="w-3 h-3" /> Add Item
            </button>
          </div>

          {currentDraft.items.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">
              No line items detected. Click &ldquo;Add Item&rdquo; to add products manually.
            </div>
          ) : (
            currentDraft.items.map((item, idx) => (
              <HUDLineItemRow
                key={idx}
                item={item}
                index={idx}
                products={products}
                onUpdate={handleItemUpdate}
                onRemove={handleItemRemove}
              />
            ))
          )}
        </div>

        {/* Financial Summary & Actions Footer */}
        <div className="p-5 border-t border-zinc-800 bg-zinc-950/80 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Totals Breakdown */}
            <div className="flex items-center gap-6">
              <div>
                <span className="text-xs text-zinc-400 block">Subtotal</span>
                <span className="text-sm font-medium text-zinc-200">
                  RM {currentDraft.subtotal.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-xs text-zinc-400 block">
                  SST ({((currentDraft.sstRate ?? 0.06) * 100).toFixed(0)}%)
                </span>
                <span className="text-sm font-medium text-zinc-200">
                  RM {currentDraft.tax.toFixed(2)}
                </span>
              </div>
              <div className="pl-4 border-l border-zinc-700/80">
                <span className="text-xs text-zinc-400 block">Grand Total</span>
                <span className="text-xl font-bold text-emerald-400">
                  RM {currentDraft.total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleReject}
                disabled={isApproving}
                className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-300 hover:text-rose-400 hover:bg-rose-950/30 border border-zinc-700/80 hover:border-rose-800/60 transition-colors disabled:opacity-50"
              >
                Reject / Discard
              </button>

              <button
                type="button"
                onClick={handleApprove}
                disabled={isApproving}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Generate ({docType === 'purchase_order' ? 'PO' : docType === 'quotation' ? 'Quote' : 'Invoice'})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Keyboard hint */}
          <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/60">
            <span>Press <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400 font-mono">Esc</kbd> to discard</span>
            <span>Press <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400 font-mono">Enter</kbd> to approve</span>
          </div>
        </div>

      </div>
    </div>
  );
};
