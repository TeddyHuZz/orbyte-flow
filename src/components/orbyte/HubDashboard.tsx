'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Product, Customer, AuditLogEntry } from '@/types';
import { InventoryTable } from './InventoryTable';
import { CustomerDirectory } from './CustomerDirectory';
import { AuditTrail } from './AuditTrail';
import { Package, Users, History, Database, RefreshCw } from 'lucide-react';

interface HubDashboardProps {
  products: Product[];
  customers: Customer[];
  auditLogs: AuditLogEntry[];
  onRefreshAll?: () => Promise<void> | void;
  isLoading?: boolean;
}

export const HubDashboard: React.FC<HubDashboardProps> = ({
  products: initialProducts,
  customers: initialCustomers,
  auditLogs: initialAuditLogs,
  onRefreshAll,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'customers' | 'audit'>('inventory');
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(initialAuditLogs);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync props
  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    setCustomers(initialCustomers);
  }, [initialCustomers]);

  useEffect(() => {
    setAuditLogs(initialAuditLogs);
  }, [initialAuditLogs]);

  // Fetch updated catalog and audit trail
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (onRefreshAll) {
        await onRefreshAll();
      } else {
        const [catRes, auditRes] = await Promise.all([
          fetch('/api/catalog'),
          fetch('/api/audit-log'),
        ]);
        if (catRes.ok) {
          const catData = await catRes.json();
          if (catData.products) setProducts(catData.products);
          if (catData.customers) setCustomers(catData.customers);
        }
        if (auditRes.ok) {
          const auditData = await auditRes.json();
          if (auditData.logs) setAuditLogs(auditData.logs);
        }
      }
    } catch (err) {
      console.error('Failed to refresh Orbyte Hub:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefreshAll]);

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Orbyte Hub Top Navigation */}
      <div className="p-3.5 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">Orbyte Business Hub</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                Connected Core
              </span>
            </div>
            <p className="text-xs text-zinc-400">Stock Book, LHDN TIN Registry & Immutable Ledger</p>
          </div>
        </div>

        {/* Tab Controls & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-medium ${
                activeTab === 'inventory'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Catalog & Stock ({products.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-medium ${
                activeTab === 'customers'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Customer TINs ({customers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-medium ${
                activeTab === 'audit'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Log ({auditLogs.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={refreshData}
            disabled={isRefreshing || isLoading}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors"
            title="Refresh Orbyte Hub"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Tab View */}
      <div className="flex-1 p-5 overflow-y-auto">
        {activeTab === 'inventory' && (
          <InventoryTable products={products} onRefresh={refreshData} />
        )}
        {activeTab === 'customers' && (
          <CustomerDirectory customers={customers} />
        )}
        {activeTab === 'audit' && (
          <AuditTrail entries={auditLogs} onRefresh={refreshData} isLoading={isRefreshing} />
        )}
      </div>
    </div>
  );
};
