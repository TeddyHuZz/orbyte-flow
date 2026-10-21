/**
 * Orbyte Flow — Deterministic Business Rules Engine Verification Suite
 * Tests SKU matching, stock reconciliation, LHDN TIN compliance, and SST calculations.
 */

import { orbyteDb } from '../orbyte/db';
import {
  validateAndEnrichOrder,
  matchProduct,
  validateLhdnTin,
  roundCurrency,
  hasWarning,
  WARNING_CODES,
} from './validator';
import { parseWithMockParser } from '../llm/mock-parser';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ Passed: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAILED: ${message}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('\n--- Starting Business Rules Engine & Validator Verification Suite ---\n');

  // Reset database to pristine state
  orbyteDb.reset();

  // ==========================================
  // Suite 1: Product / SKU Matching
  // ==========================================
  console.log('📌 Suite 1: Product & SKU Matching');

  // Test 1.1: Exact SKU matching
  const p1 = matchProduct('MILO-1KG');
  assert(p1 !== undefined && p1.sku === 'MILO-1KG', 'Test 1.1: Exact SKU match MILO-1KG');

  // Test 1.2: Exact alias matching
  const p2 = matchProduct('milo');
  assert(p2 !== undefined && p2.sku === 'MILO-1KG', 'Test 1.2: Matched "milo" to MILO-1KG');

  const p3 = matchProduct('susu pekat');
  assert(p3 !== undefined && p3.sku === 'FN-SUSU-500G', 'Test 1.3: Matched "susu pekat" to FN-SUSU-500G');

  const p4 = matchProduct('beras jasmine');
  assert(p4 !== undefined && p4.sku === 'BERAS-JASMINE-10KG', 'Test 1.4: Matched "beras jasmine" to BERAS-JASMINE-10KG');

  const p5 = matchProduct('minyak seri murni');
  assert(p5 !== undefined && p5.sku === 'MINYAK-SM-5KG', 'Test 1.5: Matched "minyak seri murni" to MINYAK-SM-5KG');

  // Test 1.6: Packaging prefix stripping ("10 ctn milo 1kg")
  const p6 = matchProduct('10 ctn milo 1kg');
  assert(p6 !== undefined && p6.sku === 'MILO-1KG', 'Test 1.6: Stripped "10 ctn" prefix and matched Milo');

  const p7 = matchProduct('5 tin susu pekat');
  assert(p7 !== undefined && p7.sku === 'FN-SUSU-500G', 'Test 1.7: Stripped "5 tin" prefix and matched Susu Pekat');

  // Test 1.8: Unrecognized product -> returns undefined
  const p8 = matchProduct('industrial hydraulic pump 5000');
  assert(p8 === undefined, 'Test 1.8: Unrecognized item returns undefined');

  // ==========================================
  // Suite 2: Stock Reconciliation & Amber Alerts (LOW_STOCK)
  // ==========================================
  console.log('\n📌 Suite 2: Stock Reconciliation & Amber Alerts');

  // Test 2.1: Order within stock limits -> No LOW_STOCK warning
  // Milo has 45 in stock
  const draftSufficientStock = validateAndEnrichOrder({
    customerName: 'Kedai Runcit Ah Seng',
    items: [
      { rawName: 'milo 1kg', quantity: 10, unit: 'pack' },
    ],
  });
  assert(!hasWarning(draftSufficientStock, WARNING_CODES.LOW_STOCK), 'Test 2.1: No LOW_STOCK warning when stock is sufficient (10 of 45)');
  assert(draftSufficientStock.items[0]?.stockAvailable === 45, 'Test 2.1: stockAvailable correctly populated as 45');
  assert(draftSufficientStock.items[0]?.warning === undefined, 'Test 2.1: Line item warning is undefined');

  // Test 2.2: Order exceeding stock limits -> LOW_STOCK Amber warning
  // Minyak Seri Murni has 6 in stock, ordering 15
  const draftLowStock = validateAndEnrichOrder({
    customerName: 'Restoran Maju Curry House',
    items: [
      { rawName: 'minyak seri murni', quantity: 15, unit: 'bottle' },
    ],
  });
  assert(hasWarning(draftLowStock, WARNING_CODES.LOW_STOCK), 'Test 2.2: LOW_STOCK warning triggered when ordering 15 of 6');
  assert(draftLowStock.items[0]?.stockAvailable === 6, 'Test 2.2: Line item reflects available stock of 6');
  assert(
    !!draftLowStock.items[0]?.warning && draftLowStock.items[0].warning.includes('LOW_STOCK'),
    'Test 2.2: Line item has LOW_STOCK warning string'
  );
  assert(
    draftLowStock.items[0]?.warning?.includes('Only 6 available') === true,
    'Test 2.2: Warning specifies "Only 6 available"'
  );

  // ==========================================
  // Suite 3: Customer & LHDN TIN Validation
  // ==========================================
  console.log('\n📌 Suite 3: Customer & LHDN TIN Validation');

  // Test 3.1: Valid LHDN Company TIN format validation
  const tinCompany = validateLhdnTin('C2459102901');
  assert(tinCompany.isValid === true, 'Test 3.1: C2459102901 is valid LHDN Company TIN');
  assert(tinCompany.tinType === 'COMPANY', 'Test 3.1: Identified as COMPANY');

  // Test 3.2: Valid LHDN Individual TIN format validation
  const tinIndividual = validateLhdnTin('IG3948201948');
  assert(tinIndividual.isValid === true, 'Test 3.2: IG3948201948 is valid LHDN Individual TIN');
  assert(tinIndividual.tinType === 'INDIVIDUAL', 'Test 3.2: Identified as INDIVIDUAL');

  // Test 3.3: Missing TIN detection
  const tinMissing = validateLhdnTin('');
  assert(tinMissing.isValid === false, 'Test 3.3: Empty TIN is invalid');
  assert(tinMissing.isMissing === true, 'Test 3.3: Empty TIN marked as isMissing');

  // Test 3.4: Invalid format TIN
  const tinInvalid = validateLhdnTin('INVALID_TIN_123');
  assert(tinInvalid.isValid === false, 'Test 3.4: Malformed TIN is invalid');
  assert(tinInvalid.isMissing === false, 'Test 3.4: Malformed TIN is not marked missing');

  // Test 3.5: Order for Ah Seng (Valid TIN) -> LHDN compliant, no warning
  const draftAhSeng = validateAndEnrichOrder({
    customerName: 'Ah Seng',
    items: [{ rawName: 'milo 1kg', quantity: 5, unit: 'pack' }],
  });
  assert(draftAhSeng.customerName === 'Kedai Runcit Ah Seng', 'Test 3.5: Resolved customer name to Kedai Runcit Ah Seng');
  assert(draftAhSeng.customerTin === 'C2459102901', 'Test 3.5: Customer TIN populated');
  assert(draftAhSeng.isLhdnCompliant === true, 'Test 3.5: Ah Seng is LHDN compliant');
  assert(!hasWarning(draftAhSeng, WARNING_CODES.MISSING_TIN), 'Test 3.5: No MISSING_TIN warning');

  // Test 3.6: Order for Jaya Hardware (Missing TIN in DB) -> Amber Warning
  const draftJaya = validateAndEnrichOrder({
    customerName: 'Jaya Hardware',
    items: [{ rawName: 'milo 1kg', quantity: 2, unit: 'pack' }],
  });
  assert(draftJaya.customerName === 'Perniagaan Jaya Hardware', 'Test 3.6: Resolved to Perniagaan Jaya Hardware');
  assert(draftJaya.isLhdnCompliant === false, 'Test 3.6: Jaya Hardware is not LHDN compliant');
  assert(hasWarning(draftJaya, WARNING_CODES.MISSING_TIN), 'Test 3.6: MISSING_TIN Amber warning generated');

  // Test 3.7: Customer lookup by phone number
  const draftByPhone = validateAndEnrichOrder(
    {
      items: [{ rawName: 'beras jasmine', quantity: 2, unit: 'bag' }],
    },
    { senderPhone: '+6012-3849102' }
  );
  assert(draftByPhone.customerName === 'Kedai Runcit Ah Seng', 'Test 3.7: Resolved customer by phone number');
  assert(draftByPhone.isLhdnCompliant === true, 'Test 3.7: Customer matched by phone is LHDN compliant');

  // ==========================================
  // Suite 4: Unmatched SKU Handling & Approval Eligibility
  // ==========================================
  console.log('\n📌 Suite 4: Unmatched SKU & Approval Eligibility');

  // Test 4.1: Order with an unknown item generates UNMATCHED_SKU
  const draftUnmatched = validateAndEnrichOrder({
    customerName: 'Ah Seng',
    items: [
      { rawName: 'milo 1kg', quantity: 2, unit: 'pack' },
      { rawName: 'special imported coffee beans xyz', quantity: 1, unit: 'bag' },
    ],
  });
  assert(hasWarning(draftUnmatched, WARNING_CODES.UNMATCHED_SKU), 'Test 4.1: UNMATCHED_SKU warning generated');
  assert(draftUnmatched.items[1]?.warning?.includes('UNMATCHED_SKU') === true, 'Test 4.1: Item warning flagged');
  assert(draftUnmatched.canApprove === false, 'Test 4.1: canApprove is false when unmatched items exist');

  // Test 4.2: Fully matched order has canApprove = true (even with advisory warnings)
  assert(draftLowStock.canApprove === true, 'Test 4.2: Low stock order can still be approved by human operator');

  // ==========================================
  // Suite 5: Deterministic Financial Calculations & Malaysian SST
  // ==========================================
  console.log('\n📌 Suite 5: Financials & SST Calculations');

  // Round currency helper test
  assert(roundCurrency(10.005) === 10.01, 'Test 5.1: roundCurrency rounds correctly');

  // Test 5.2: Essential food items (Rice, Cooking Oil) are 0% SST (tax exempt)
  const draftExempt = validateAndEnrichOrder({
    customerName: 'Ah Seng',
    items: [
      { rawName: 'beras jasmine 10kg', quantity: 2, unit: 'bag' }, // 2 * 39.80 = 79.60 (exempt)
      { rawName: 'minyak seri murni', quantity: 1, unit: 'bottle' }, // 1 * 31.90 = 31.90 (exempt)
    ],
  });
  assert(draftExempt.subtotal === 111.50, `Test 5.2: Subtotal is 111.50, got ${draftExempt.subtotal}`);
  assert(draftExempt.tax === 0.00, `Test 5.2: Tax on exempt food staples is RM 0.00, got ${draftExempt.tax}`);
  assert(draftExempt.total === 111.50, `Test 5.2: Grand total is 111.50, got ${draftExempt.total}`);

  // Test 5.3: Taxable items with 6% SST
  // Milo 1kg @ RM 21.50 (taxable): 10 * 21.50 = 215.00
  // Tax at 6%: 215.00 * 0.06 = 12.90
  // Total: 227.90
  const draftTaxable = validateAndEnrichOrder({
    customerName: 'Ah Seng',
    items: [
      { rawName: 'milo 1kg', quantity: 10, unit: 'pack' },
    ],
  }, { defaultSstRate: 0.06 });
  assert(draftTaxable.subtotal === 215.00, `Test 5.3: Subtotal is 215.00, got ${draftTaxable.subtotal}`);
  assert(draftTaxable.tax === 12.90, `Test 5.3: 6% SST is 12.90, got ${draftTaxable.tax}`);
  assert(draftTaxable.total === 227.90, `Test 5.3: Grand total is 227.90, got ${draftTaxable.total}`);

  // Test 5.4: Mixed basket with taxable and tax-exempt items
  // Milo 1kg: 10 * 21.50 = 215.00 (taxable 6% -> 12.90)
  // Susu Pekat: 5 * 4.20 = 21.00 (taxable 6% -> 1.26)
  // Beras Jasmine: 2 * 39.80 = 79.60 (exempt -> 0.00)
  // Subtotal: 215.00 + 21.00 + 79.60 = 315.60
  // Tax: 12.90 + 1.26 = 14.16
  // Grand Total: 315.60 + 14.16 = 329.76
  const draftMixed = validateAndEnrichOrder({
    customerName: 'Ah Seng',
    items: [
      { rawName: 'milo 1kg', quantity: 10, unit: 'pack' },
      { rawName: 'susu pekat', quantity: 5, unit: 'tin' },
      { rawName: 'beras jasmine', quantity: 2, unit: 'bag' },
    ],
  }, { defaultSstRate: 0.06 });
  assert(draftMixed.subtotal === 315.60, `Test 5.4: Mixed subtotal is 315.60, got ${draftMixed.subtotal}`);
  assert(draftMixed.tax === 14.16, `Test 5.4: Mixed SST is 14.16, got ${draftMixed.tax}`);
  assert(draftMixed.total === 329.76, `Test 5.4: Mixed grand total is 329.76, got ${draftMixed.total}`);

  // Test 5.5: Configurable 8% SST rate
  // Milo 1kg: 10 * 21.50 = 215.00 (taxable 8% -> 17.20)
  // Total: 232.20
  const draft8Percent = validateAndEnrichOrder({
    customerName: 'Ah Seng',
    items: [{ rawName: 'milo 1kg', quantity: 10, unit: 'pack' }],
  }, { defaultSstRate: 0.08 });
  assert(draft8Percent.tax === 17.20, `Test 5.5: 8% SST is 17.20, got ${draft8Percent.tax}`);
  assert(draft8Percent.total === 232.20, `Test 5.5: 8% grand total is 232.20, got ${draft8Percent.total}`);

  // ==========================================
  // Suite 6: End-to-End Pipeline Integration (Extractor -> Validator)
  // ==========================================
  console.log('\n📌 Suite 6: End-to-End Extraction & Validation Pipeline');

  const rawChat = 'Ah Seng here. Mau order: 5 carton milo, 10 bottle minyak seri murni. Hantar ke Kajang Friday.';
  const extracted = parseWithMockParser(rawChat);

  assert(extracted.success === true, 'Test 6.1: Mock parser extracts successfully');
  assert(extracted.customerName === 'Kedai Runcit Ah Seng', 'Test 6.1: Customer identified');

  const enrichedDraft = validateAndEnrichOrder(extracted);

  assert(enrichedDraft.customerName === 'Kedai Runcit Ah Seng', 'Test 6.2: Enriched customer name matches');
  assert(enrichedDraft.isLhdnCompliant === true, 'Test 6.2: Ah Seng is LHDN compliant');
  assert(enrichedDraft.items.length === 2, `Test 6.2: Enriched 2 line items, got ${enrichedDraft.items.length}`);
  assert(enrichedDraft.items[0]?.matchedSku === 'MILO-1KG', 'Test 6.2: First item matched MILO-1KG');
  assert(enrichedDraft.items[1]?.matchedSku === 'MINYAK-SM-5KG', 'Test 6.2: Second item matched MINYAK-SM-5KG');
  // Minyak Seri Murni stock is 6, requested 10 -> LOW_STOCK warning!
  assert(hasWarning(enrichedDraft, WARNING_CODES.LOW_STOCK), 'Test 6.2: Generated LOW_STOCK warning for Minyak Seri Murni');
  assert(enrichedDraft.notes?.includes('Friday') === true, 'Test 6.2: Delivery date preserved in notes');
  assert(enrichedDraft.canApprove === true, 'Test 6.2: Draft is ready for human confirmation in HUD');

  // ==========================================
  // Summary
  // ==========================================
  console.log('\n==========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error(`💥 ${failed} test(s) failed.`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${passed} BUSINESS RULES & VALIDATOR TESTS PASSED!`);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
