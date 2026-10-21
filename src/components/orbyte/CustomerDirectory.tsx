'use client';

import React, { useState } from 'react';
import { Customer } from '@/types';
import { Search, ShieldCheck, ShieldAlert, Building2, Phone, MapPin } from 'lucide-react';

interface CustomerDirectoryProps {
  customers: Customer[];
}

export const CustomerDirectory: React.FC<CustomerDirectoryProps> = ({ customers }) => {
  const [search, setSearch] = useState('');

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.tin && c.tin.toLowerCase().includes(search.toLowerCase())) ||
      (c.brn && c.brn.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
        <input
          type="text"
          placeholder="Search customer name, phone, or LHDN TIN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-600"
        />
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="col-span-2 text-center py-8 text-zinc-500 text-xs">
            No customers found.
          </div>
        ) : (
          filtered.map((customer) => {
            const hasTin = Boolean(customer.tin && customer.tin.trim().length > 0);
            return (
              <div
                key={customer.id}
                className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/60 hover:border-zinc-700 transition-colors flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">{customer.name}</h4>
                        {customer.brn && (
                          <span className="text-[10px] text-zinc-400 font-mono">
                            BRN: {customer.brn}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* TIN Badge */}
                    {hasTin ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                        <ShieldCheck className="w-3 h-3" />
                        Verified TIN
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/60">
                        <ShieldAlert className="w-3 h-3" />
                        Missing TIN
                      </span>
                    )}
                  </div>

                  {/* LHDN TIN Value */}
                  <div className="mt-3 p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs flex items-center justify-between">
                    <span className="text-zinc-400 text-[11px]">LHDN e-Invoice TIN:</span>
                    <span className="font-mono font-medium text-zinc-200">
                      {customer.tin || 'Not Registered'}
                    </span>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-3 space-y-1 text-xs text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="font-mono">{customer.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                      <span className="truncate">{customer.address}</span>
                    </div>
                  </div>
                </div>

                {/* Footer status */}
                <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>SST Registered: {customer.sstRegistered ? 'Yes' : 'No'}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
