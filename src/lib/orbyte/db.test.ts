import { orbyteDb } from './db';

/**
 * Automated Verification Suite for Orbyte Mock Database & Domain Types
 */
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`✅ Passed: ${message}`);
}

export function runOrbyteDbTests() {
  console.log('--- Starting Orbyte Database Verification Suite ---\n');

  // Reset to clean seed data
  orbyteDb.reset();

  // Test 1: Products retrieval
  const products = orbyteDb.getProducts();
  assert(products.length === 10, `Retrieved ${products.length} products, expected 10`);

  // Test 2: SKU lookup (exact & case-insensitive)
  const milo = orbyteDb.getProductBySku('MILO-1KG');
  assert(!!milo, 'Found Milo 1kg by SKU');
  assert(milo?.unitPrice === 21.50, `Milo price is RM 21.50, got ${milo?.unitPrice}`);
  assert(milo?.stock === 45, `Milo initial stock is 45, got ${milo?.stock}`);

  const fnSusu = orbyteDb.getProductBySku('fn-susu-500g');
  assert(!!fnSusu, 'Found Susu Pekat F&N by lowercase SKU');
  assert(fnSusu?.stock === 120, 'F&N Susu initial stock is 120');

  // Test 3: Product fuzzy search by alias/name
  const jasmineRice = orbyteDb.findProduct('beras jasmine');
  assert(!!jasmineRice && jasmineRice.sku === 'BERAS-JASMINE-10KG', 'Found Jasmine Rice via alias "beras jasmine"');

  const cookingOil = orbyteDb.findProduct('seri murni');
  assert(!!cookingOil && cookingOil.sku === 'MINYAK-SM-5KG', 'Found Seri Murni Oil via keyword');
  assert(cookingOil?.stock === 6, 'Seri Murni has low stock of 6 units');

  // Test 4: Stock deduction and clamp
  const updatedMilo = orbyteDb.updateStock('MILO-1KG', -5);
  assert(updatedMilo?.stock === 40, `Stock after -5 is 40, got ${updatedMilo?.stock}`);

  // Test deduction exceeding stock clamps to 0
  const clampedOil = orbyteDb.updateStock('MINYAK-SM-5KG', -100);
  assert(clampedOil?.stock === 0, `Stock clamped to 0 after deducting 100, got ${clampedOil?.stock}`);

  // Test 5: Customer lookups
  const customers = orbyteDb.getCustomers();
  assert(customers.length === 5, `Retrieved ${customers.length} customers, expected 5`);

  // Customer with valid TIN
  const ahSeng = orbyteDb.findCustomer('Ah Seng');
  assert(!!ahSeng, 'Found Kedai Runcit Ah Seng by partial name');
  assert(ahSeng?.tin === 'C2459102901', `Ah Seng has valid LHDN TIN C2459102901, got ${ahSeng?.tin}`);
  assert(ahSeng?.sstRegistered === true, 'Ah Seng is SST registered');

  // Customer via alias
  const majuCurry = orbyteDb.findCustomer('maju curry');
  assert(!!majuCurry, 'Found Restoran Maju Curry House via alias');
  assert(majuCurry?.tin === 'C1849204802', 'Maju Curry has valid TIN C1849204802');

  // Customer with MISSING TIN (crucial for Amber Alert testing)
  const jayaHardware = orbyteDb.findCustomer('Jaya Hardware');
  assert(!!jayaHardware, 'Found Perniagaan Jaya Hardware');
  assert(!jayaHardware?.tin, 'Jaya Hardware has missing TIN (compliant warning test)');

  // Customer lookup by phone number
  const byPhone = orbyteDb.findCustomer('012-3849102');
  assert(byPhone?.id === 'cust_ah_seng', 'Found Ah Seng by phone number');

  // Test 6: Audit log creation and tracking
  const initialLogs = orbyteDb.getAuditLogs();
  const initialLogCount = initialLogs.length;

  const newLog = orbyteDb.addAuditLog({
    user: 'test_runner',
    action: 'TEST_ACTION',
    details: { test: true, note: 'Verification test entry' },
    status: 'info',
  });
  assert(!!newLog.id && !!newLog.timestamp, 'Generated audit log has ID and timestamp');

  const afterLogs = orbyteDb.getAuditLogs();
  assert(afterLogs.length === initialLogCount + 1, 'Audit log count incremented');
  assert(afterLogs[0].action === 'TEST_ACTION', 'Newest audit log entry is first (descending timestamp)');

  // Test 7: Order Draft Creation
  const newOrder = orbyteDb.createOrder({
    customerName: 'Kedai Runcit Ah Seng',
    customerId: ahSeng?.id,
    customerTin: ahSeng?.tin,
    items: [
      {
        rawName: '10 ctn Milo 1kg',
        quantity: 10,
        unit: 'pack',
        matchedSku: 'MILO-1KG',
        matchedName: 'Nestle Milo Softpack 1kg',
        unitPrice: 21.50,
        lineTotal: 215.00,
        stockAvailable: 40,
      },
    ],
    subtotal: 215.00,
    tax: 0,
    total: 215.00,
    status: 'draft',
    docType: 'purchase_order',
  });

  assert(!!newOrder.id, 'Created order has generated ID');
  const retrievedOrder = orbyteDb.getOrderById(newOrder.id);
  assert(retrievedOrder?.customerName === 'Kedai Runcit Ah Seng', 'Retrieved order matches customer');

  // Test 8: Reset restores seed state
  orbyteDb.reset();
  const resetMilo = orbyteDb.getProductBySku('MILO-1KG');
  assert(resetMilo?.stock === 45, `Stock restored to initial seed value 45, got ${resetMilo?.stock}`);

  console.log('\n🎉 ALL 8 TEST SUITES PASSED CLEANLY!\n');
}

// Execute tests if run directly
runOrbyteDbTests();
