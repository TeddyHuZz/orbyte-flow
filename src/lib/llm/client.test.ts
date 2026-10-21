/**
 * Orbyte Flow — AI Extraction Engine Verification Suite
 * Tests deterministic heuristic parser, Malaysian SME chat idioms, and multi-tier fallback cascade.
 */

import { parseWithMockParser } from './mock-parser';
import { extractOrderFromText } from './client';

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
  console.log('\n--- Starting AI Extraction Engine Verification Suite ---\n');

  // ==========================================
  // Suite 1: Malaysian SME Chat Idioms (Mock Parser)
  // ==========================================
  console.log('📌 Suite 1: Malaysian SME Chat Idiom Parsing');

  // Test 1.1: Comma-separated Manglish chat
  const t1 = parseWithMockParser('15 carton milo, 5 tin susu pekat, deliver Friday PJ');
  assert(t1.success === true, 'Test 1.1: Should succeed on Manglish comma-separated order');
  assert(t1.items.length === 2, `Test 1.1: Expected 2 items, got ${t1.items.length}`);
  assert(t1.items[0]?.rawName.toLowerCase() === 'milo', 'Test 1.1: First item is milo');
  assert(t1.items[0]?.quantity === 15, 'Test 1.1: Milo quantity is 15');
  assert(t1.items[0]?.unit === 'carton', 'Test 1.1: Milo unit is carton');
  assert(t1.items[1]?.rawName.toLowerCase() === 'susu pekat', 'Test 1.1: Second item is susu pekat');
  assert(t1.items[1]?.quantity === 5, 'Test 1.1: Susu pekat quantity is 5');
  assert(t1.items[1]?.unit === 'tin', 'Test 1.1: Susu pekat unit is tin');
  assert(t1.deliveryDate === 'Friday', 'Test 1.1: Delivery date is Friday');
  assert(!!t1.notes && t1.notes.includes('PJ'), 'Test 1.1: Notes capture PJ delivery location');

  // Test 1.2: Multiline numbered order with customer header
  const t2 = parseWithMockParser(
    'Boss, order for Restoran Maju Curry House:\n1. 10 bag beras jasmine 10kg\n2. 2 tin susu pekat\n3. 5 carton milo\nDeliver tomorrow morning'
  );
  assert(t2.success === true, 'Test 1.2: Multiline order succeeds');
  assert(t2.customerName === 'Restoran Maju Curry House', `Test 1.2: Customer name is Restoran Maju Curry House, got ${t2.customerName}`);
  assert(t2.items.length === 3, `Test 1.2: Expected 3 items, got ${t2.items.length}`);
  assert(t2.items[0]?.quantity === 10 && t2.items[0]?.unit === 'bag', 'Test 1.2: Item 1 is 10 bag');
  assert(t2.items[1]?.quantity === 2 && t2.items[1]?.unit === 'tin', 'Test 1.2: Item 2 is 2 tin');
  assert(t2.items[2]?.quantity === 5 && t2.items[2]?.unit === 'carton', 'Test 1.2: Item 3 is 5 carton');
  assert(t2.deliveryDate === 'tomorrow morning', `Test 1.2: Delivery date is tomorrow morning, got ${t2.deliveryDate}`);

  // Test 1.3: Malay conversational order with greetings & aliases
  const t3 = parseWithMockParser(
    'Salam boss, dari Maju Curry House nak order 5 kotak milo 1kg, 10 tin susu manis, 2 botol minyak masak seri murni. Tolong hantar esok pagi.'
  );
  assert(t3.success === true, 'Test 1.3: Malay order succeeds');
  assert(t3.customerName === 'Restoran Maju Curry House', 'Test 1.3: Matched customer via alias Maju Curry House');
  assert(t3.items.length === 3, `Test 1.3: Expected 3 items, got ${t3.items.length}`);
  assert(t3.items[0]?.quantity === 5 && t3.items[0]?.unit === 'carton', 'Test 1.3: Milo 1kg has unit carton (from kotak)');
  assert(t3.items[1]?.quantity === 10 && t3.items[1]?.unit === 'tin', 'Test 1.3: Susu manis has unit tin');
  assert(t3.items[2]?.quantity === 2 && t3.items[2]?.unit === 'bottle', 'Test 1.3: Minyak has unit bottle (from botol)');
  assert(t3.deliveryDate === 'esok pagi', 'Test 1.3: Delivery date is esok pagi');

  // Test 1.4: Ah Seng customer alias and shorthand
  const t4 = parseWithMockParser(
    'Ah Seng here. Mau order: 3 carton milo, 2 tray telur gred A, 5 bottle minyak seri murni. Hantar ke Kajang Friday.'
  );
  assert(t4.customerName === 'Kedai Runcit Ah Seng', `Test 1.4: Resolved Ah Seng alias to Kedai Runcit Ah Seng, got ${t4.customerName}`);
  assert(t4.items.length === 3, `Test 1.4: Expected 3 items, got ${t4.items.length}`);
  assert(t4.items[1]?.unit === 'tray', 'Test 1.4: Telur unit is tray');
  assert(t4.deliveryDate === 'Friday', 'Test 1.4: Delivery date is Friday');

  // Test 1.5: Reverse ordering format: <Product> <Quantity> <Unit>
  const t5 = parseWithMockParser('Order: Milo 15 ctn, Susu pekat 10 tin, Minyak masak 5 botol');
  assert(t5.success === true, 'Test 1.5: Reverse format succeeds');
  assert(t5.items.length === 3, `Test 1.5: Expected 3 items, got ${t5.items.length}`);
  assert(t5.items[0]?.rawName === 'Milo' && t5.items[0]?.quantity === 15, 'Test 1.5: Milo 15 ctn');
  assert(t5.items[1]?.rawName === 'Susu pekat' && t5.items[1]?.quantity === 10, 'Test 1.5: Susu pekat 10 tin');

  // Test 1.6: Multiplier shorthand "10x Milo 1kg"
  const t6 = parseWithMockParser('10x Milo 1kg, 5x Susu Pekat F&N, 2x Beras Jasmine');
  assert(t6.success === true, 'Test 1.6: Multiplier shorthand succeeds');
  assert(t6.items.length === 3, `Test 1.6: Expected 3 items, got ${t6.items.length}`);
  assert(t6.items[0]?.quantity === 10 && t6.items[0]?.rawName === 'Milo 1kg', 'Test 1.6: 10x Milo 1kg');

  // Test 1.7: Customer with missing TIN alert scenario (Jaya Hardware)
  const t7 = parseWithMockParser(
    'Hi boss, order from Jaya Hardware:\n1. 50 ctn milo\n2. 20 tin susu fn\n3. 10 bag beras jasmine\nDeliver to Puchong by Friday'
  );
  assert(t7.customerName === 'Perniagaan Jaya Hardware', 'Test 1.7: Matched Perniagaan Jaya Hardware');
  assert(t7.items.length === 3, 'Test 1.7: Extracted 3 items');

  // ==========================================
  // Suite 2: Edge Cases & Validation
  // ==========================================
  console.log('\n📌 Suite 2: Edge Cases & Conversational Filters');

  // Test 2.1: Empty or whitespace input
  const emptyRes = parseWithMockParser('   ');
  assert(emptyRes.success === false, 'Test 2.1: Empty input returns success false');
  assert(emptyRes.items.length === 0, 'Test 2.1: Empty input returns 0 items');

  // Test 2.2: Pure conversation without order items
  const convoRes = parseWithMockParser('Hello boss, how are you today? What time is your store open?');
  assert(convoRes.success === false, 'Test 2.2: Conversational text returns success false');
  assert(convoRes.items.length === 0, 'Test 2.2: Conversational text yields 0 items');

  // ==========================================
  // Suite 3: Multi-Tier Fallback Cascade
  // ==========================================
  console.log('\n📌 Suite 3: Multi-Tier Fallback Cascade');

  // Preserve original env
  const origDeepseekKey = process.env.DEEPSEEK_API_KEY;
  const origGeminiKey = process.env.GEMINI_API_KEY;
  const origDeepseekUrl = process.env.DEEPSEEK_BASE_URL;

  try {
    // Test 3.1: Offline fallback when no API keys are configured
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const offlineRes = await extractOrderFromText('15 carton milo, 5 tin susu pekat, deliver Friday PJ');
    assert(offlineRes.success === true, 'Test 3.1: Offline cascade succeeds');
    assert(offlineRes.providerUsed === 'mock', `Test 3.1: Provider used is mock, got ${offlineRes.providerUsed}`);
    assert(offlineRes.items.length === 2, 'Test 3.1: Parsed 2 items in offline mode');

    // Test 3.2: DeepSeek failure cascade to mock parser
    process.env.DEEPSEEK_API_KEY = 'mock_invalid_deepseek_key';
    process.env.DEEPSEEK_BASE_URL = 'http://127.0.0.1:54321'; // unreachable port triggers fast connection refusal
    delete process.env.GEMINI_API_KEY;

    const fallbackRes = await extractOrderFromText('Ah Seng: 10 ctn milo, 4 botol minyak seri murni');
    assert(fallbackRes.success === true, 'Test 3.2: Recovers from DeepSeek failure seamlessly');
    assert(fallbackRes.providerUsed === 'mock', 'Test 3.2: Falls back to mock provider');
    assert(fallbackRes.items.length === 2, 'Test 3.2: Extracts 2 items after fallback');

    // Test 3.3: Both DeepSeek and Gemini failure cascade to mock parser
    process.env.DEEPSEEK_API_KEY = 'invalid_key';
    process.env.DEEPSEEK_BASE_URL = 'http://127.0.0.1:54321';
    process.env.GEMINI_API_KEY = 'invalid_gemini_key';

    const multiFallbackRes = await extractOrderFromText('Order for Maju Curry: 20 bag beras jasmine 10kg');
    assert(multiFallbackRes.success === true, 'Test 3.3: Recovers from multi-tier failure');
    assert(multiFallbackRes.providerUsed === 'mock', 'Test 3.3: Falls back to mock provider');
    assert(multiFallbackRes.items.length === 1, 'Test 3.3: Extracts 1 item after 2-tier fallback');
    assert(multiFallbackRes.items[0]?.rawName === 'beras jasmine 10kg', 'Test 3.3: Correct item extracted');

  } finally {
    // Restore environment variables
    if (origDeepseekKey) process.env.DEEPSEEK_API_KEY = origDeepseekKey;
    else delete process.env.DEEPSEEK_API_KEY;

    if (origGeminiKey) process.env.GEMINI_API_KEY = origGeminiKey;
    else delete process.env.GEMINI_API_KEY;

    if (origDeepseekUrl) process.env.DEEPSEEK_BASE_URL = origDeepseekUrl;
    else delete process.env.DEEPSEEK_BASE_URL;
  }

  // ==========================================
  // Summary
  // ==========================================
  console.log('\n==========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error(`💥 ${failed} test(s) failed.`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${passed} AI EXTRACTION TESTS PASSED!`);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
