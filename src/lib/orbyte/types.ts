/**
 * Orbyte Flow — Core Domain Types
 * Defines data structures for Products, Customers, Orders, AI Extraction, and Audit Logs.
 */

export interface Product {
  id: string;
  sku: string;
  name: string;
  unitPrice: number;
  stock: number;
  category: string;
  unit: string;
  aliases?: string[];
  description?: string;
  taxExempt?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  tin: string;
  sstRegistered: boolean;
  brn?: string; // Business Registration Number (e.g., 202301048291 / 123456-X)
  aliases?: string[];
}

export interface ExtractedLineItem {
  rawName: string;
  quantity: number;
  unit: string;
  matchedSku?: string;
  matchedName?: string;
  unitPrice?: number;
  lineTotal?: number;
  stockAvailable?: number;
  warning?: string;
}

export type OrderStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type DocumentType = 'quotation' | 'purchase_order' | 'tax_invoice';

export interface OrderDraft {
  id: string;
  customerName: string;
  customerId?: string;
  customerTin?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: ExtractedLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  status: OrderStatus;
  docType?: DocumentType;
  createdAt: string;
  updatedAt?: string;
}

export type AuditAction =
  | 'SYSTEM_INITIALIZED'
  | 'ORDER_CREATED'
  | 'ORDER_APPROVED'
  | 'ORDER_REJECTED'
  | 'PO_CREATED'
  | 'QUOTATION_CREATED'
  | 'INVOICE_CREATED'
  | 'STOCK_ADJUSTMENT'
  | 'STOCK_DEDUCTED'
  | 'CUSTOMER_UPDATED'
  | 'CATALOG_UPDATED'
  | 'EXTRACTION_COMPLETED';

export type AuditStatus = 'success' | 'warning' | 'error' | 'info' | 'VERIFIED' | 'REJECTED';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: AuditAction | string;
  details: Record<string, unknown> | string;
  status: AuditStatus;
}

export interface ExtractionResultItem {
  rawName: string;
  quantity: number;
  unit: string;
}

export interface ExtractionResult {
  success: boolean;
  providerUsed: 'deepseek' | 'gemini' | 'mock';
  customerName?: string;
  deliveryDate?: string;
  notes?: string;
  items: ExtractionResultItem[];
  rawText?: string;
  error?: string;
}

export interface EnrichedOrderDraft extends OrderDraft {
  warnings: string[];
  sstRate: number; // e.g. 0.00, 0.06, or 0.08
  isLhdnCompliant: boolean;
  canApprove: boolean;
}
