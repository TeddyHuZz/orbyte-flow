/**
 * Orbyte Flow — Global Application Types
 * Re-exports domain types and provides API & UI contract types.
 */

export * from '@/lib/orbyte/types';
export * from '@/lib/rules/validator';

// API Payloads
export interface ExtractRequestBody {
  text: string;
  sender?: string;
  senderPhone?: string;
}

export interface ExtractResponseData {
  success: boolean;
  provider: 'deepseek' | 'gemini' | 'mock';
  data: {
    customerName?: string;
    deliveryDate?: string;
    notes?: string;
    items: Array<{
      rawName: string;
      quantity: number;
      unit: string;
    }>;
  };
  error?: string;
}

export interface ValidateRequestBody {
  draft?: import('@/lib/orbyte/types').EnrichedOrderDraft;
  customerName?: string;
  items?: Array<{
    rawName: string;
    quantity: number;
    unit: string;
    matchedSku?: string;
    unitPrice?: number;
  }>;
  notes?: string;
  deliveryDate?: string;
  docType?: 'quotation' | 'purchase_order' | 'tax_invoice';
  senderPhone?: string;
}

export interface ApproveRequestBody {
  draft?: import('@/lib/orbyte/types').EnrichedOrderDraft | import('@/lib/orbyte/types').OrderDraft;
  orderDraft?: import('@/lib/orbyte/types').OrderDraft;
  action?: 'APPROVE' | 'REJECT';
  docType?: 'PO' | 'QUOTATION' | 'INVOICE' | import('@/lib/orbyte/types').DocumentType;
  editedItems?: import('@/lib/orbyte/types').ExtractedLineItem[];
  user?: string;
  deductStock?: boolean;
}

export interface ApproveResponseData {
  success: boolean;
  action?: 'APPROVE' | 'REJECT';
  order: import('@/lib/orbyte/types').OrderDraft;
  draft?: import('@/lib/orbyte/types').OrderDraft;
  poNumber?: string;
  auditEntry: import('@/lib/orbyte/types').AuditLogEntry;
  whatsappMessage?: string;
  error?: string;
}
