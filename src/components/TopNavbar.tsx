'use client';

import React from 'react';
import {
  Sparkles,
  Smartphone,
  Database,
  Columns,
  Cpu,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

export type DemoViewMode = 'split' | 'simulator' | 'hub';

interface TopNavbarProps {
  viewMode: DemoViewMode;
  onViewModeChange: (mode: DemoViewMode) => void;
  activeProvider?: string;
  hasCopiedSummary?: boolean;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  viewMode,
  onViewModeChange,
  activeProvider = 'mock',
  hasCopiedSummary = false,
}) => {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 flex-wrap">
      {/* Brand & Project Info */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-950/40">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold text-white tracking-tight">
              Orbyte Flow
            </h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Domain 2 • Smart SME
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 hidden sm:block">
            AI Floating HUD for WhatsApp Web • Instant Quotations, POs & LHDN e-Invoicing
          </p>
        </div>
      </div>

      {/* Center: View Switcher (Split Screen vs Tabs) */}
      <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs">
        <button
          type="button"
          onClick={() => onViewModeChange('split')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-medium ${
            viewMode === 'split'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Side-by-side presentation view for judges and projector"
        >
          <Columns className="w-3.5 h-3.5" />
          <span>Split Screen</span>
        </button>

        <button
          type="button"
          onClick={() => onViewModeChange('simulator')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-medium ${
            viewMode === 'simulator'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>WhatsApp View</span>
        </button>

        <button
          type="button"
          onClick={() => onViewModeChange('hub')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-medium ${
            viewMode === 'hub'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Orbyte Hub</span>
        </button>
      </div>

      {/* Right: AI Engine Status & Clipboard Alert */}
      <div className="flex items-center gap-3">
        {hasCopiedSummary && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700/60 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Copied to Clipboard!</span>
          </div>
        )}

        {/* AI Provider Status Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono">
          <Cpu className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-[11px] text-zinc-400">AI Engine:</span>
          {activeProvider === 'deepseek' ? (
            <span className="text-emerald-400 font-semibold">DeepSeek (Active)</span>
          ) : activeProvider === 'gemini' ? (
            <span className="text-blue-400 font-semibold">Gemini (Fallback)</span>
          ) : (
            <span className="text-amber-400 font-semibold">Offline Heuristic</span>
          )}
        </div>
      </div>
    </header>
  );
};
