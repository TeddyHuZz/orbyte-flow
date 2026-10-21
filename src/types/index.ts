/**
 * Orbyte Flow — Global Application Types
 * Re-exports domain types and provides API & UI contract types.
 */

export * from '@/lib/orbyte/types';

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
  customerName?: string;
  items: Array<{
    rawName: string;
    quantity: number;
    unit: string;
    matchedSku?: string;
    unitPrice?: number;
  }>;
  notes?: string;
  docType?: 'quotation' | 'purchase_order' | 'tax_invoice';
}

export interface ApproveRequestBody {
  orderDraft: import('@/lib/orbyte/types').OrderDraft;
  user?: string;
  deductStock?: boolean;
}

export interface ApproveResponseData {
  success: boolean;
  order: import('@/lib/orbyte/types').OrderDraft;
  auditEntry: import('@/lib/orbyte/types').AuditLogEntry;
  whatsappMessage?: string;
  error?: string;
}
