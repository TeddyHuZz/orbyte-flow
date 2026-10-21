'use client';

import React from 'react';
import { AuditLogEntry } from '@/types';
import { CheckCircle2, XCircle, Clock, User, FileCheck, RefreshCw } from 'lucide-react';

interface AuditTrailProps {
  entries: AuditLogEntry[];
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const AuditTrail: React.FC<AuditTrailProps> = ({
  entries,
  onRefresh,
  isLoading = false,
}) => {
  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Immutable Orbyte Audit Log</h3>
          <p className="text-xs text-zinc-400">
            Real-time compliance ledger recording every approval, rejection, and inventory mutation.
          </p>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Ledger</span>
          </button>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="flex-1 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/60">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="bg-zinc-900/80 text-zinc-400 font-semibold border-b border-zinc-800 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Actor / User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Transaction Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 font-mono text-[11px]">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-zinc-500 font-sans">
                  No audit log entries recorded yet.
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const isVerified = entry.status === 'VERIFIED' || entry.status === 'success';
                const isRejected = entry.status === 'REJECTED' || entry.status === 'error';
                const detailsStr =
                  typeof entry.details === 'string'
                    ? entry.details
                    : JSON.stringify(entry.details);

                return (
                  <tr key={entry.id} className="hover:bg-zinc-900/40 transition-colors">
                    {/* Timestamp */}
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                        <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </td>

                    {/* Actor */}
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-300">
                      <div className="flex items-center gap-1.5 font-sans">
                        <User className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                        <span>{entry.user}</span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-white">
                      <div className="flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span>{entry.action}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-sans">
                          <CheckCircle2 className="w-3 h-3" />
                          VERIFIED
                        </span>
                      ) : isRejected ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950/80 text-rose-400 border border-rose-800/60 font-sans">
                          <XCircle className="w-3 h-3" />
                          REJECTED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-300 font-sans">
                          {entry.status}
                        </span>
                      )}
                    </td>

                    {/* Details Summary */}
                    <td className="px-4 py-3 max-w-xs truncate text-zinc-400" title={detailsStr}>
                      {detailsStr}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
