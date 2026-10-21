'use client';

import React, { useState } from 'react';
import { Product } from '@/types';
import { Search, AlertTriangle, CheckCircle2, AlertCircle, Package } from 'lucide-react';

interface InventoryTableProps {
  products: Product[];
  onRefresh?: () => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({ products, onRefresh }) => {
  const [search, setSearch] = useState('');

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search SKU, product name, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-600"
          />
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition-colors"
          >
            Refresh Stock
          </button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/60">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="bg-zinc-900/80 text-zinc-400 font-semibold border-b border-zinc-800 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Product Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Unit Price</th>
              <th className="px-4 py-3 text-center">Stock Level</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-zinc-500">
                  No products found.
                </td>
              </tr>
            ) : (
              filtered.map((product) => {
                const isOutOfStock = product.stock <= 0;
                const isLowStock = product.stock > 0 && product.stock <= 10;
                return (
                  <tr key={product.id || product.sku} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-zinc-200">
                      {product.sku}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">
                      <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 capitalize">
                      {product.category}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-400">
                      RM {product.unitPrice.toFixed(2)}
                      <span className="text-[10px] text-zinc-500 block">/ {product.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-zinc-100">
                      {product.stock}
                    </td>
                    <td className="px-4 py-3">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950/80 text-rose-400 border border-rose-800/60">
                          <AlertCircle className="w-3 h-3" />
                          Out of Stock
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/60">
                          <AlertTriangle className="w-3 h-3" />
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                          <CheckCircle2 className="w-3 h-3" />
                          Healthy
                        </span>
                      )}
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
