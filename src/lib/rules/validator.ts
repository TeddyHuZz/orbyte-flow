/**
 * Orbyte Flow — Deterministic Business Rules Engine & Order Validator
 * 
 * Reconciles AI-extracted order drafts against Orbyte Hub catalog and customer directory:
 *   1. Product / SKU Matching: Fuzzy & alias matching against Malaysian wholesale catalog.
 *   2. Stock Reconciliation: Flags Amber warning (LOW_STOCK) when requested quantity > inventory.
 *   3. Customer & LHDN TIN Compliance: Validates tax identification numbers against LHDN e-Invoicing rules.
 *   4. Deterministic Financial Calculations: Subtotal, product-level SST (exempt vs 6%/8%), and grand totals.
 *   5. Generates fully typed EnrichedOrderDraft ready for Floating HUD review or direct approval.
 */

import {
  Product,
  Customer,
  ExtractionResult,
  ExtractionResultItem,
  ExtractedLineItem,
  EnrichedOrderDraft,
  DocumentType,
} from '../orbyte/types';
import { orbyteDb, OrbyteDatabase } from '../orbyte/db';

export const WARNING_CODES = {
  LOW_STOCK: 'LOW_STOCK',
  MISSING_TIN: 'MISSING_TIN',
  UNMATCHED_SKU: 'UNMATCHED_SKU',
  INVALID_TIN: 'INVALID_TIN',
  UNREGISTERED_CUSTOMER: 'UNREGISTERED_CUSTOMER',
} as const;

export type WarningCode = (typeof WARNING_CODES)[keyof typeof WARNING_CODES];

export interface ValidationOptions {
  docType?: DocumentType;
  defaultSstRate?: number; // e.g. 0.06 (default 6%) or 0.08 (8%)
  senderPhone?: string;
  orderId?: string;
  db?: OrbyteDatabase;
  strictMode?: boolean; // if true, warnings prevent canApprove
}

export interface TinValidationResult {
  isValid: boolean;
  isMissing: boolean;
  cleanTin?: string;
  tinType?: 'COMPANY' | 'INDIVIDUAL' | 'NON_RESIDENT' | 'OTHER';
  error?: string;
}

export interface ValidatableLineItem {
  rawName: string;
  quantity: number;
  unit?: string;
  matchedSku?: string;
  matchedName?: string;
  unitPrice?: number;
}

export type ValidatableOrderInput =
  | (Omit<ExtractionResult, 'items'> & {
      items: (ExtractionResultItem | ValidatableLineItem)[];
      docType?: DocumentType;
      senderPhone?: string;
    })
  | {
      customerName?: string;
      items: (ExtractionResultItem | ValidatableLineItem)[];
      deliveryDate?: string;
      notes?: string;
      docType?: DocumentType;
      senderPhone?: string;
    };

/**
 * Rounds monetary amounts to 2 decimal places to prevent floating-point anomalies
 */
export function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Normalizes a product query string by removing noisy punctuation and conversational filler
 */
export function normalizeProductQuery(raw: string): string {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/[^\w\s&]/g, ' ') // preserve & for F&N
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips leading/trailing quantity, unit, and conversational prefixes
 * e.g. "10 ctn milo 1kg" -> "milo 1kg"
 *      "5 tin susu pekat" -> "susu pekat"
 */
export function cleanRawItemName(rawName: string): string {
  if (!rawName) return '';
  let cleaned = normalizeProductQuery(rawName);

  // Strip leading numbers or multipliers (e.g. "10x ", "15 ", "2-minit" should keep minit)
  cleaned = cleaned.replace(/^(\d+[\s*xX]+|\d+\s+)/, '');

  // Strip common packaging unit words if they are leading prefixes
  const unitPrefixRegex = /^(carton|ctn|tin|can|bag|beg|botol|bottle|tray|papan|kotak|pack|packet|pkt|biji|pcs)\s+/i;
  cleaned = cleaned.replace(unitPrefixRegex, '');

  // Strip polite conversational prefixes
  const fillerPrefixRegex = /^(nak|mau|order|tolong\s+hantar|hantar|bagi)\s+/i;
  cleaned = cleaned.replace(fillerPrefixRegex, '');

  return cleaned.trim();
}

/**
 * Fuzzy & Alias Product Matcher
 * Matches raw extracted line item text to official Orbyte catalog SKUs
 */
export function matchProduct(
  rawName: string,
  dbInstance: OrbyteDatabase = orbyteDb,
  explicitSku?: string
): Product | undefined {
  if (explicitSku && explicitSku.trim()) {
    const bySku = dbInstance.getProductBySku(explicitSku.trim());
    if (bySku) return bySku;
  }

  if (!rawName || !rawName.trim()) return undefined;

  const raw = rawName.trim();
  const cleaned = cleanRawItemName(raw);

  // 1. Direct match with original query
  const directMatch = dbInstance.findProduct(raw);
  if (directMatch) return directMatch;

  // 2. Direct match with cleaned query
  if (cleaned && cleaned !== raw.toLowerCase()) {
    const cleanedMatch = dbInstance.findProduct(cleaned);
    if (cleanedMatch) return cleanedMatch;
  }

  // 3. Multi-token scoring against all products in catalog
  const products = dbInstance.getProducts();
  const queryTokens = (cleaned || raw.toLowerCase()).split(/\s+/).filter((t) => t.length > 1);

  if (queryTokens.length === 0) return undefined;

  let bestMatch: Product | undefined = undefined;
  let highestScore = 0;

  for (const product of products) {
    let score = 0;
    const pName = product.name.toLowerCase();
    const pSku = product.sku.toLowerCase();
    const aliases = product.aliases ? product.aliases.map((a) => a.toLowerCase()) : [];

    // Exact SKU substring
    if (raw.toLowerCase().includes(pSku) || pSku.includes(raw.toLowerCase())) {
      score = Math.max(score, 0.95);
    }

    // Exact alias check
    for (const alias of aliases) {
      if (alias === cleaned || alias === raw.toLowerCase()) {
        score = Math.max(score, 1.0);
        break;
      }
      if (cleaned.includes(alias) || alias.includes(cleaned)) {
        score = Math.max(score, 0.85);
      }
    }

    // Exact product name check
    if (pName.includes(cleaned) || cleaned.includes(pName)) {
      score = Math.max(score, 0.8);
    }

    // Token overlap calculation
    const allKeywords = [pName, pSku, ...aliases].join(' ');
    let matchedTokens = 0;
    for (const token of queryTokens) {
      if (allKeywords.includes(token)) {
        matchedTokens++;
      }
    }

    const tokenRatio = matchedTokens / queryTokens.length;
    if (tokenRatio > 0.5) {
      score = Math.max(score, 0.5 + tokenRatio * 0.4);
    }

    if (score > highestScore && score >= 0.6) {
      highestScore = score;
      bestMatch = product;
    }
  }

  return bestMatch;
}

/**
 * Validates Malaysian LHDN e-Invoicing Tax Identification Number (TIN)
 * Compliant with Inland Revenue Board of Malaysia (IRBM / LHDN MyInvois) format guidelines.
 */
export function validateLhdnTin(tin: string | undefined | null): TinValidationResult {
  if (!tin || !tin.trim()) {
    return {
      isValid: false,
      isMissing: true,
      error: 'Customer TIN missing — non-compliant for LHDN e-Invoicing',
    };
  }

  const clean = tin.trim().toUpperCase().replace(/[\s-]/g, '');

  // LHDN Malaysia TIN prefixes:
  // C: Companies (10 digits, total 11 chars) e.g. C2459102901
  // IG: Individuals with business income (10 digits) e.g. IG3948201948
  // SG: Individuals without business income
  // OG: Non-resident individuals
  // CS: Co-operative society
  // D: Partnership
  // F: Trust body
  // TP / TF: Police / Military personnel
  // EI: General / Non-TIN buyer e-Invoice reference
  // Standard format: 1-3 letter prefix + 8-11 digits
  const lhdnStandardRegex = /^(C|IG|SG|OG|CS|D|F|TP|TF|EI|PE|TR|PT)\d{8,11}$/;
  const generalTinRegex = /^[A-Z]{1,3}\d{8,12}$/;

  if (lhdnStandardRegex.test(clean) || generalTinRegex.test(clean)) {
    let tinType: TinValidationResult['tinType'] = 'OTHER';
    if (clean.startsWith('C')) tinType = 'COMPANY';
    else if (clean.startsWith('IG') || clean.startsWith('SG') || clean.startsWith('OG')) tinType = 'INDIVIDUAL';
    else if (clean.startsWith('PE')) tinType = 'NON_RESIDENT';

    return {
      isValid: true,
      isMissing: false,
      cleanTin: clean,
      tinType,
    };
  }

  return {
    isValid: false,
    isMissing: false,
    cleanTin: clean,
    error: `Customer TIN format invalid (${tin}) — non-compliant for LHDN e-Invoicing`,
  };
}

/**
 * Calculates deterministic order financial totals:
 * Respects Malaysian SST zero-rating for basic essentials (rice, cooking oil, eggs, flour, sugar).
 */
export function calculateFinancials(
  items: ExtractedLineItem[],
  sstRate: number,
  dbInstance: OrbyteDatabase = orbyteDb
): {
  subtotal: number;
  tax: number;
  total: number;
  enrichedItems: ExtractedLineItem[];
} {
  let subtotal = 0;
  let tax = 0;

  const enrichedItems: ExtractedLineItem[] = items.map((item) => {
    const qty = Math.max(0, item.quantity || 0);
    const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
    const lineTotal = roundCurrency(qty * unitPrice);

    subtotal = roundCurrency(subtotal + lineTotal);

    // Determine tax status
    let isTaxExempt = false;
    if (item.matchedSku) {
      const prod = dbInstance.getProductBySku(item.matchedSku);
      if (prod) {
        isTaxExempt = prod.taxExempt ?? false;
      }
    }

    if (!isTaxExempt && sstRate > 0) {
      const lineTax = roundCurrency(lineTotal * sstRate);
      tax = roundCurrency(tax + lineTax);
    }

    return {
      ...item,
      quantity: qty,
      unitPrice,
      lineTotal,
    };
  });

  const total = roundCurrency(subtotal + tax);

  return {
    subtotal,
    tax,
    total,
    enrichedItems,
  };
}

/**
 * Validates and enriches an extracted order draft against Orbyte Catalog & Customer Directory.
 * Produces an EnrichedOrderDraft with Amber warnings, line pricing, and LHDN compliance status.
 */
export function validateAndEnrichOrder(
  input: ValidatableOrderInput,
  options: ValidationOptions = {}
): EnrichedOrderDraft {
  const db = options.db || orbyteDb;
  const sstRate = typeof options.defaultSstRate === 'number' ? options.defaultSstRate : 0.06;
  const docType: DocumentType = options.docType || ('docType' in input && input.docType ? input.docType : 'purchase_order');
  const now = new Date().toISOString();
  const orderId = options.orderId || `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const warnings: string[] = [];

  // ==========================================
  // 1. Customer Identification & LHDN Validation
  // ==========================================
  let matchedCustomer: Customer | undefined;
  const rawCustomerName = input.customerName?.trim();
  const searchPhone = options.senderPhone || ('senderPhone' in input ? input.senderPhone : undefined);

  if (rawCustomerName) {
    matchedCustomer = db.findCustomer(rawCustomerName);
  }
  if (!matchedCustomer && searchPhone) {
    matchedCustomer = db.findCustomer(searchPhone);
  }

  let customerName = rawCustomerName || 'Walk-in / Cash Customer';
  let customerId: string | undefined = undefined;
  let customerTin: string | undefined = undefined;
  let customerPhone: string | undefined = undefined;
  let customerAddress: string | undefined = undefined;
  let isLhdnCompliant = false;

  if (matchedCustomer) {
    customerId = matchedCustomer.id;
    customerName = matchedCustomer.name;
    customerTin = matchedCustomer.tin;
    customerPhone = matchedCustomer.phone;
    customerAddress = matchedCustomer.address;

    const tinCheck = validateLhdnTin(customerTin);
    if (!tinCheck.isValid) {
      isLhdnCompliant = false;
      if (tinCheck.isMissing) {
        warnings.push('[MISSING_TIN] Customer TIN missing — non-compliant for LHDN e-Invoicing');
      } else {
        warnings.push(`[MISSING_TIN] Customer TIN format invalid (${customerTin}) — non-compliant for LHDN e-Invoicing`);
      }
    } else {
      isLhdnCompliant = true;
    }
  } else {
    // Unregistered customer or no customer specified
    isLhdnCompliant = false;
    warnings.push('[MISSING_TIN] Customer TIN missing — non-compliant for LHDN e-Invoicing');
    if (rawCustomerName) {
      warnings.push(`[UNREGISTERED_CUSTOMER] Customer "${rawCustomerName}" is not registered in Orbyte directory`);
    }
  }

  // ==========================================
  // 2. Product Matching & Stock Reconciliation
  // ==========================================
  let hasUnmatchedItems = false;
  const initialItems: ExtractedLineItem[] = [];

  for (const item of input.items || []) {
    const rawName = item.rawName || '';
    const quantity = Math.max(1, item.quantity || 1);
    const requestedUnit = item.unit || 'unit';
    const explicitSku = 'matchedSku' in item && typeof item.matchedSku === 'string' ? item.matchedSku : undefined;
    const explicitPrice = 'unitPrice' in item && typeof item.unitPrice === 'number' ? item.unitPrice : undefined;

    const matchedProduct = matchProduct(rawName, db, explicitSku);

    if (!matchedProduct) {
      hasUnmatchedItems = true;
      const warningMsg = 'UNMATCHED_SKU: Unrecognized item — manual match required';
      warnings.push(`[UNMATCHED_SKU] ${rawName || 'Item'}: Unrecognized item — manual match required`);

      initialItems.push({
        rawName,
        quantity,
        unit: requestedUnit,
        matchedSku: undefined,
        matchedName: undefined,
        unitPrice: explicitPrice ?? 0,
        stockAvailable: 0,
        warning: warningMsg,
      });
    } else {
      // Product matched successfully
      const stock = matchedProduct.stock;
      let lineWarning: string | undefined = undefined;

      // Stock check
      if (quantity > stock) {
        lineWarning = `LOW_STOCK: Requested ${quantity}, Only ${stock} available in stock`;
        warnings.push(`[LOW_STOCK] ${matchedProduct.name} (SKU: ${matchedProduct.sku}): Requested ${quantity}, Only ${stock} available in stock`);
      }

      initialItems.push({
        rawName,
        quantity,
        unit: requestedUnit && requestedUnit !== 'unit' ? requestedUnit : matchedProduct.unit,
        matchedSku: matchedProduct.sku,
        matchedName: matchedProduct.name,
        unitPrice: typeof explicitPrice === 'number' ? explicitPrice : matchedProduct.unitPrice,
        stockAvailable: stock,
        warning: lineWarning,
      });
    }
  }

  // ==========================================
  // 3. Financial Calculations
  // ==========================================
  const financials = calculateFinancials(initialItems, sstRate, db);

  // ==========================================
  // 4. Notes & Delivery Information
  // ==========================================
  const notesParts: string[] = [];
  if (input.deliveryDate) {
    notesParts.push(`Requested Delivery: ${input.deliveryDate}`);
  }
  if (input.notes) {
    notesParts.push(input.notes);
  }
  const combinedNotes = notesParts.length > 0 ? notesParts.join(' | ') : undefined;

  // ==========================================
  // 5. Approval Eligibility
  // ==========================================
  // An order can be approved if it has at least one item and all items are matched.
  // Amber warnings (Low stock, Missing TIN) are advisory and do not strictly block human approval unless strictMode is enabled.
  let canApprove = initialItems.length > 0 && !hasUnmatchedItems;
  if (options.strictMode && warnings.length > 0) {
    canApprove = false;
  }

  return {
    id: orderId,
    customerName,
    customerId,
    customerTin,
    customerPhone,
    customerAddress,
    items: financials.enrichedItems,
    subtotal: financials.subtotal,
    tax: financials.tax,
    total: financials.total,
    notes: combinedNotes,
    status: 'draft',
    docType,
    createdAt: now,
    updatedAt: now,
    warnings,
    sstRate,
    isLhdnCompliant,
    canApprove,
  };
}

/**
 * Checks whether an EnrichedOrderDraft contains a specific Amber warning code
 */
export function hasWarning(draft: EnrichedOrderDraft, code: WarningCode): boolean {
  if (!draft || !draft.warnings) return false;
  return draft.warnings.some((w) => w.includes(`[${code}]`) || w.includes(code));
}
