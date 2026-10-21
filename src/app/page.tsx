'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Product,
  Customer,
  AuditLogEntry,
  EnrichedOrderDraft,
  DocumentType,
} from '@/types';
import { TopNavbar, DemoViewMode } from '@/components/TopNavbar';
import { WhatsAppView } from '@/components/simulator/WhatsAppView';
import { FloatingHUD } from '@/components/simulator/FloatingHUD';
import { HubDashboard } from '@/components/orbyte/HubDashboard';
import { ChatContact } from '@/components/simulator/sample-chats';

export default function HomePage() {
  const [viewMode, setViewMode] = useState<DemoViewMode>('split');
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  
  const [activeDraft, setActiveDraft] = useState<EnrichedOrderDraft | null>(null);
  const [isHudOpen, setIsHudOpen] = useState<boolean>(false);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [activeProvider, setActiveProvider] = useState<string>('mock');
  const [hasCopiedSummary, setHasCopiedSummary] = useState<boolean>(false);

  // Fetch initial catalog and audit records
  const fetchHubData = useCallback(async () => {
    try {
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
    } catch (err) {
      console.error('Error loading Orbyte Hub data:', err);
    }
  }, []);

  useEffect(() => {
    fetchHubData();
  }, [fetchHubData]);

  // Handle Extraction Trigger (Highlight + Alt+O or Click)
  const handleExtractText = async (text: string, contact?: ChatContact) => {
    if (!text || text.trim().length === 0) return;
    setIsExtracting(true);

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          sender: contact?.name,
          senderPhone: contact?.phone,
        }),
      });

      if (!res.ok) {
        throw new Error(`Extraction failed: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.draft || data.result) {
        const draft: EnrichedOrderDraft = data.draft || data.result;
        setActiveDraft(draft);
        setActiveProvider(data.provider || 'mock');
        setIsHudOpen(true);
      }
    } catch (err) {
      console.error('Extraction error:', err);
      alert('Could not parse order. Please check console or try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle Approval & Outcome
  const handleApproveOrder = async (draft: EnrichedOrderDraft, docType: DocumentType) => {
    setIsApproving(true);
    try {
      const res = await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft,
          action: 'APPROVE',
          docType,
        }),
      });

      if (!res.ok) {
        throw new Error(`Approval failed: ${res.statusText}`);
      }

      const result = await res.json();

      // Copy WhatsApp reply summary to clipboard
      if (result.whatsappMessage) {
        try {
          await navigator.clipboard.writeText(result.whatsappMessage);
          setHasCopiedSummary(true);
          setTimeout(() => setHasCopiedSummary(false), 4500);
        } catch {
          console.warn('Clipboard write prevented by browser permission');
        }
      }

      // Close modal and refresh Hub data (stock decremented, audit entry added)
      setIsHudOpen(false);
      setActiveDraft(null);
      await fetchHubData();
    } catch (err) {
      console.error('Approval error:', err);
      alert('Approval failed. Please check inputs and try again.');
    } finally {
      setIsApproving(false);
    }
  };

  // Handle Rejection
  const handleRejectOrder = async (draft: EnrichedOrderDraft) => {
    setIsApproving(true);
    try {
      await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft,
          action: 'REJECT',
        }),
      });

      setIsHudOpen(false);
      setActiveDraft(null);
      await fetchHubData();
    } catch (err) {
      console.error('Rejection error:', err);
      setIsHudOpen(false);
      setActiveDraft(null);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top Header Navbar */}
      <TopNavbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        activeProvider={activeProvider}
        hasCopiedSummary={hasCopiedSummary}
      />

      {/* Main Container */}
      <main className="flex-1 p-3 sm:p-5 flex flex-col overflow-hidden">
        {viewMode === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 h-[calc(100vh-80px)]">
            {/* Left Column: WhatsApp Simulator */}
            <div className="h-full flex flex-col">
              <WhatsAppView
                onExtractText={handleExtractText}
                isExtracting={isExtracting}
              />
            </div>

            {/* Right Column: Orbyte Business Hub */}
            <div className="h-full flex flex-col">
              <HubDashboard
                products={products}
                customers={customers}
                auditLogs={auditLogs}
                onRefreshAll={fetchHubData}
              />
            </div>
          </div>
        )}

        {viewMode === 'simulator' && (
          <div className="h-[calc(100vh-80px)] max-w-5xl mx-auto w-full">
            <WhatsAppView
              onExtractText={handleExtractText}
              isExtracting={isExtracting}
            />
          </div>
        )}

        {viewMode === 'hub' && (
          <div className="h-[calc(100vh-80px)] max-w-6xl mx-auto w-full">
            <HubDashboard
              products={products}
              customers={customers}
              auditLogs={auditLogs}
              onRefreshAll={fetchHubData}
            />
          </div>
        )}
      </main>

      {/* Raycast Floating Command Overlay (FloatingHUD) */}
      <FloatingHUD
        draft={activeDraft}
        isOpen={isHudOpen}
        onClose={() => setIsHudOpen(false)}
        onApprove={handleApproveOrder}
        onReject={handleRejectOrder}
        onUpdateDraft={setActiveDraft}
        products={products}
        isApproving={isApproving}
      />
    </div>
  );
}
