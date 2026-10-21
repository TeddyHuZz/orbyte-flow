import { NextRequest } from 'next/server';
import { orbyteDb } from '../../lib/orbyte/db';
import { POST as extractPOST, OPTIONS as extractOPTIONS } from './extract/route';
import { POST as validatePOST, OPTIONS as validateOPTIONS } from './validate/route';
import { POST as approvePOST, OPTIONS as approveOPTIONS } from './approve/route';
import { GET as catalogGET, POST as catalogPOST } from './catalog/route';
import { GET as auditLogGET, POST as auditLogPOST } from './audit-log/route';
import { EnrichedOrderDraft } from '../../lib/orbyte/types';

/**
 * Automated Verification Suite for Next.js 16 API Endpoints:
 *   1. /api/extract
 *   2. /api/validate
 *   3. /api/approve
 *   4. /api/catalog
 *   5. /api/audit-log
 */

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`✅ Passed: ${message}`);
}

function makeRequest(url: string, method: string = 'GET', body?: unknown): NextRequest {
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

export async function runApiRoutesTests() {
  console.log('\n--- Starting Orbyte Flow Next.js API Routes Verification Suite ---\n');

  // Reset database to ensure isolated test state
  orbyteDb.reset();

  // ========================================================
  // Suite 1: /api/extract
  // ========================================================
  console.log('📌 Suite 1: /api/extract Route Handler');

  // Test 1.1: Options preflight
  const optRes = await extractOPTIONS();
  assert(optRes.status === 204, 'Test 1.1: OPTIONS returns 204 No Content');
  assert(optRes.headers.get('Access-Control-Allow-Origin') === '*', 'Test 1.1: Returns CORS Allow-Origin header');

  // Test 1.2: Empty body validation
  const emptyReq = makeRequest('http://localhost:3000/api/extract', 'POST', {});
  const emptyRes = await extractPOST(emptyReq);
  assert(emptyRes.status === 400, 'Test 1.2: Empty body rejected with 400');
  const emptyJson = await emptyRes.json();
  assert(emptyJson.success === false, 'Test 1.2: success is false');

  // Test 1.3: Successful extraction & enrichment of Manglish order
  const orderText = 'Hai bos, nak order 10 ctn milo 1kg and 5 tin susu pekat utk Kedai Runcit Ah Seng. Delivery Friday please.';
  const extractReq = makeRequest('http://localhost:3000/api/extract', 'POST', {
    text: orderText,
    sender: 'Ah Seng WhatsApp',
  });
  const extractRes = await extractPOST(extractReq);
  assert(extractRes.status === 200, 'Test 1.3: Valid extraction returns 200 OK');
  const extractData = await extractRes.json();

  assert(extractData.success === true, 'Test 1.3: Extraction marked success true');
  assert(!!extractData.draft, 'Test 1.3: EnrichedOrderDraft returned in response');
  assert(extractData.draft.customerName === 'Kedai Runcit Ah Seng', `Test 1.3: Customer matched Ah Seng, got ${extractData.draft.customerName}`);
  assert(extractData.draft.isLhdnCompliant === true, 'Test 1.3: Ah Seng has valid LHDN TIN');
  assert(extractData.draft.items.length === 2, `Test 1.3: Extracted 2 line items, got ${extractData.draft.items.length}`);

  const miloItem = extractData.draft.items.find((i: { matchedSku?: string }) => i.matchedSku === 'MILO-1KG');
  assert(!!miloItem, 'Test 1.3: Matched SKU MILO-1KG');
  assert(miloItem.quantity === 10, `Test 1.3: Milo quantity is 10, got ${miloItem.quantity}`);
  assert(miloItem.unitPrice === 21.50, `Test 1.3: Milo unit price is RM 21.50`);
  assert(miloItem.lineTotal === 215.00, `Test 1.3: Milo line total is RM 215.00`);

  const susuItem = extractData.draft.items.find((i: { matchedSku?: string }) => i.matchedSku === 'FN-SUSU-500G');
  assert(!!susuItem, 'Test 1.3: Matched SKU FN-SUSU-500G');
  assert(susuItem.quantity === 5, `Test 1.3: Susu quantity is 5, got ${susuItem.quantity}`);

  assert(extractData.draft.subtotal === 236.00, `Test 1.3: Subtotal is RM 236.00, got ${extractData.draft.subtotal}`);
  assert(extractData.draft.canApprove === true, 'Test 1.3: Order draft canApprove is true');

  // Verify extraction audit log entry created
  const latestLog = orbyteDb.getAuditLogs()[0];
  assert(latestLog.action === 'EXTRACTION_COMPLETED', 'Test 1.4: Extraction logged in audit trail');

  // ========================================================
  // Suite 2: /api/validate
  // ========================================================
  console.log('\n📌 Suite 2: /api/validate Route Handler');

  // Test 2.1: Preflight
  const valOpt = await validateOPTIONS();
  assert(valOpt.status === 204, 'Test 2.1: Validate OPTIONS returns 204');

  // Test 2.2: Reject missing items
  const valBadReq = makeRequest('http://localhost:3000/api/validate', 'POST', { items: [] });
  const valBadRes = await validatePOST(valBadReq);
  assert(valBadRes.status === 400, 'Test 2.2: Validate rejects empty items with 400');

  // Test 2.3: Re-validate draft with updated quantity & low stock trigger
  const modifiedDraft: EnrichedOrderDraft = {
    ...extractData.draft,
    items: [
      {
        rawName: 'minyak masak seri murni 5kg',
        quantity: 20, // Only 6 in stock!
        unit: 'botol',
        matchedSku: 'MINYAK-SM-5KG',
      },
    ],
  };

  const valReq = makeRequest('http://localhost:3000/api/validate', 'POST', { draft: modifiedDraft });
  const valRes = await validatePOST(valReq);
  assert(valRes.status === 200, 'Test 2.3: Validate returns 200 OK');
  const valData = await valRes.json();
  assert(valData.success === true, 'Test 2.3: Validation success');
  assert(valData.draft.items[0].stockAvailable === 6, 'Test 2.3: Correctly identifies available stock of 6');
  assert(
    valData.draft.warnings.some((w: string) => w.includes('LOW_STOCK')),
    'Test 2.3: Generates LOW_STOCK Amber warning for 20 requested vs 6 available'
  );
  assert(valData.draft.total === 638.00, `Test 2.3: Financial total recalculated: RM 638.00, got ${valData.draft.total}`);

  // ========================================================
  // Suite 3: /api/approve
  // ========================================================
  console.log('\n📌 Suite 3: /api/approve Route Handler');

  // Test 3.1: Preflight
  const appOpt = await approveOPTIONS();
  assert(appOpt.status === 204, 'Test 3.1: Approve OPTIONS returns 204');

  // Test 3.2: Rejection without stock mutation
  const initialMiloStock = orbyteDb.getProductBySku('MILO-1KG')?.stock ?? 0;
  assert(initialMiloStock === 45, `Test 3.2: Initial Milo stock is 45, got ${initialMiloStock}`);

  const rejectReq = makeRequest('http://localhost:3000/api/approve', 'POST', {
    draft: extractData.draft,
    action: 'REJECT',
    reason: 'Customer requested cancellation',
    user: 'sarah_operator',
  });
  const rejectRes = await approvePOST(rejectReq);
  assert(rejectRes.status === 200, 'Test 3.2: Rejection returns 200');
  const rejectData = await rejectRes.json();
  assert(rejectData.success === true, 'Test 3.2: Rejection success is true');
  assert(rejectData.action === 'REJECT', 'Test 3.2: Rejection action is REJECT');
  assert(rejectData.order.status === 'rejected', 'Test 3.2: Order status is rejected');
  assert(rejectData.auditEntry.action === 'ORDER_REJECTED', 'Test 3.2: Audit entry action is ORDER_REJECTED');
  assert(rejectData.auditEntry.status === 'REJECTED', 'Test 3.2: Audit entry status is REJECTED');

  // Verify stock was NOT deducted
  const miloStockAfterReject = orbyteDb.getProductBySku('MILO-1KG')?.stock ?? 0;
  assert(miloStockAfterReject === 45, 'Test 3.2: Milo stock unchanged after rejection');

  // Test 3.3: Approval with stock deduction and WhatsApp clipboard text
  const initialSusuStock = orbyteDb.getProductBySku('FN-SUSU-500G')?.stock ?? 0;
  assert(initialSusuStock === 120, 'Test 3.3: Initial Susu stock is 120');

  const approveReq = makeRequest('http://localhost:3000/api/approve', 'POST', {
    draft: extractData.draft,
    action: 'APPROVE',
    docType: 'PO',
    user: 'ahmad_supervisor',
  });
  const approveRes = await approvePOST(approveReq);
  assert(approveRes.status === 200, 'Test 3.3: Approval returns 200');
  const approveData = await approveRes.json();

  assert(approveData.success === true, 'Test 3.3: Approval marked success true');
  assert(approveData.action === 'APPROVE', 'Test 3.3: Action is APPROVE');
  assert(approveData.order.status === 'approved', 'Test 3.3: Order status is approved');
  assert(!!approveData.poNumber, `Test 3.3: Generated PO Number ${approveData.poNumber}`);
  assert(approveData.auditEntry.action === 'PO_CREATED', 'Test 3.3: Audit action is PO_CREATED');
  assert(approveData.auditEntry.status === 'VERIFIED', 'Test 3.3: Audit status is VERIFIED');

  // Verify stock was deducted: Milo -10 (45 -> 35), Susu -5 (120 -> 115)
  const miloAfterApprove = orbyteDb.getProductBySku('MILO-1KG')?.stock;
  const susuAfterApprove = orbyteDb.getProductBySku('FN-SUSU-500G')?.stock;
  assert(miloAfterApprove === 35, `Test 3.3: Milo stock decremented to 35, got ${miloAfterApprove}`);
  assert(susuAfterApprove === 115, `Test 3.3: Susu stock decremented to 115, got ${susuAfterApprove}`);

  // Verify formatted WhatsApp clipboard text
  const wa = approveData.whatsappMessage;
  assert(!!wa, 'Test 3.3: WhatsApp message returned');
  assert(wa.includes('Order Confirmation — Kedai Runcit Ah Seng'), 'Test 3.3: WA contains Customer name in bold');
  assert(wa.includes(approveData.poNumber), 'Test 3.3: WA contains PO reference number');
  assert(wa.includes('Nestle Milo Softpack 1kg'), 'Test 3.3: WA lists Milo line item');
  assert(wa.includes('Susu Pekat Manis F&N 500g'), 'Test 3.3: WA lists Susu Pekat line item');
  assert(wa.includes('Total: RM 250.16'), 'Test 3.3: WA contains Total RM 250.16');
  assert(wa.includes('Friday') && wa.includes('Delivery'), 'Test 3.3: WA preserves Friday delivery request');

  // Test 3.4: Approval with Quotation and Tax Invoice document types
  const quoteReq = makeRequest('http://localhost:3000/api/approve', 'POST', {
    draft: { ...extractData.draft, id: 'QT-9901' },
    action: 'APPROVE',
    docType: 'QUOTATION',
    deductStock: false, // quote doesn't deduct stock
  });
  const quoteRes = await approvePOST(quoteReq);
  const quoteData = await quoteRes.json();
  assert(quoteData.auditEntry.action === 'QUOTATION_CREATED', 'Test 3.4: DocType QUOTATION logged QUOTATION_CREATED');

  // ========================================================
  // Suite 4: /api/catalog
  // ========================================================
  console.log('\n📌 Suite 4: /api/catalog Route Handler');

  // Test 4.1: GET returns catalog, customers, and stats
  const catGetRes = await catalogGET();
  assert(catGetRes.status === 200, 'Test 4.1: Catalog GET returns 200');
  const catData = await catGetRes.json();
  assert(catData.success === true, 'Test 4.1: Catalog success is true');
  assert(catData.products.length === 10, `Test 4.1: Returned 10 products, got ${catData.products.length}`);
  assert(catData.customers.length === 5, `Test 4.1: Returned 5 customers, got ${catData.customers.length}`);
  assert(typeof catData.stats.totalProducts === 'number', 'Test 4.1: Stats summary included');

  // Test 4.2: POST updates product stock level
  const stockReq = makeRequest('http://localhost:3000/api/catalog', 'POST', {
    action: 'update_stock',
    sku: 'MILO-1KG',
    delta: 15,
  });
  const stockRes = await catalogPOST(stockReq);
  assert(stockRes.status === 200, 'Test 4.2: Stock update returns 200');
  const stockData = await stockRes.json();
  assert(stockData.product.stock === 50, `Test 4.2: Milo restocked to 50 (35 + 15), got ${stockData.product.stock}`);

  // Test 4.3: POST reset restores original seed data
  const resetReq = makeRequest('http://localhost:3000/api/catalog', 'POST', { action: 'reset' });
  const resetRes = await catalogPOST(resetReq);
  assert(resetRes.status === 200, 'Test 4.3: Catalog reset returns 200');
  const resetMilo = orbyteDb.getProductBySku('MILO-1KG');
  assert(resetMilo?.stock === 45, `Test 4.3: Milo stock reset back to seed 45, got ${resetMilo?.stock}`);

  // ========================================================
  // Suite 5: /api/audit-log
  // ========================================================
  console.log('\n📌 Suite 5: /api/audit-log Route Handler');

  // Test 5.1: GET returns audit trail entries
  const auditGetRes = await auditLogGET();
  assert(auditGetRes.status === 200, 'Test 5.1: Audit log GET returns 200');
  const auditData = await auditGetRes.json();
  assert(auditData.success === true, 'Test 5.1: Audit log success is true');
  assert(Array.isArray(auditData.auditLogs), 'Test 5.1: auditLogs is array');
  assert(auditData.auditLogs.length > 0, `Test 5.1: Has audit logs, count=${auditData.auditLogs.length}`);

  // Test 5.2: POST creates new manual audit log entry
  const manualLogReq = makeRequest('http://localhost:3000/api/audit-log', 'POST', {
    user: 'compliance_officer',
    action: 'LHDN_TIN_VERIFICATION',
    details: { customer: 'Kedai Runcit Ah Seng', status: 'Compliant' },
    status: 'success',
  });
  const manualLogRes = await auditLogPOST(manualLogReq);
  assert(manualLogRes.status === 200, 'Test 5.2: Manual audit log returns 200');
  const manualLogData = await manualLogRes.json();
  assert(manualLogData.auditEntry.action === 'LHDN_TIN_VERIFICATION', 'Test 5.2: Log action stored');

  const refreshedAuditLogs = orbyteDb.getAuditLogs();
  assert(refreshedAuditLogs[0].action === 'LHDN_TIN_VERIFICATION', 'Test 5.2: Newest log entry is first');

  console.log('\n==========================================');
  console.log('🎉 ALL NEXT.JS API ROUTES TESTS PASSED CLEANLY!\n');
}

// Auto-run when executed directly
runApiRoutesTests().catch((err) => {
  console.error('API Routes test failure:', err);
  process.exit(1);
});
