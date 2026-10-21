import { Product, Customer, AuditLogEntry } from './types';

/**
 * Seed Products: Malaysian Sundry & F&B Wholesale Staples
 */
export const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod_milo_1kg',
    sku: 'MILO-1KG',
    name: 'Nestle Milo Softpack 1kg',
    unitPrice: 21.50,
    stock: 45,
    category: 'Beverages',
    unit: 'pack',
    aliases: [
      'milo',
      'milo 1kg',
      'nestle milo',
      'milo softpack',
      'milo serbuk',
      'milo powder',
      'milo bag',
      'milo ctn'
    ],
    description: 'Nestle Milo Activ-Go Chocolate Malt Powder 1kg Softpack',
    taxExempt: false,
  },
  {
    id: 'prod_fn_susu_500g',
    sku: 'FN-SUSU-500G',
    name: 'Susu Pekat Manis F&N 500g',
    unitPrice: 4.20,
    stock: 120,
    category: 'Dairy',
    unit: 'tin',
    aliases: [
      'susu pekat',
      'susu f&n',
      'susu fn',
      'fn susu',
      'f&n condensed milk',
      'susu tin',
      'susu manis',
      'susu pekat 500g',
      'f&n susu'
    ],
    description: 'F&N Sweetened Condensed Milk 500g Tin',
    taxExempt: false,
  },
  {
    id: 'prod_beras_jasmine_10kg',
    sku: 'BERAS-JASMINE-10KG',
    name: 'Beras Jasmine Super Special Tempatan 10kg',
    unitPrice: 39.80,
    stock: 28,
    category: 'Grains & Rice',
    unit: 'bag',
    aliases: [
      'beras jasmine',
      'beras 10kg',
      'jasmine super',
      'jasmine 10kg',
      'beras super',
      'jasmine rice',
      'rice 10kg',
      'beras tempatan'
    ],
    description: 'Jasmine Super Special Tempatan 5% Broken Local White Rice 10kg',
    taxExempt: true, // Essential food staple in Malaysia
  },
  {
    id: 'prod_minyak_sm_5kg',
    sku: 'MINYAK-SM-5KG',
    name: 'Minyak Masak Seri Murni 5kg',
    unitPrice: 31.90,
    stock: 6, // Intentional low stock (triggers Amber Warning when > 6 ordered)
    category: 'Cooking Essentials',
    unit: 'bottle',
    aliases: [
      'minyak seri murni',
      'minyak 5kg',
      'seri murni 5kg',
      'minyak masak 5kg',
      'cooking oil 5kg',
      'seri murni',
      'minyak botol'
    ],
    description: 'Seri Murni Double Fractionated Pure Palm Vegetable Cooking Oil 5kg',
    taxExempt: true,
  },
  {
    id: 'prod_telur_gred_a',
    sku: 'TELUR-GRED-A',
    name: 'Telur Ayam Segar Gred A (30 biji)',
    unitPrice: 15.60,
    stock: 55,
    category: 'Poultry & Eggs',
    unit: 'tray',
    aliases: [
      'telur gred a',
      'telur a',
      'telur 30s',
      'papan telur',
      'tray telur',
      'egg grade a',
      'telur ayam',
      'telur'
    ],
    description: 'Fresh Farm Chicken Eggs Grade A Tray of 30',
    taxExempt: true,
  },
  {
    id: 'prod_nescafe_200g',
    sku: 'NESCAFE-200G',
    name: 'Nescafe Classic Refill 200g',
    unitPrice: 16.90,
    stock: 32,
    category: 'Beverages',
    unit: 'pack',
    aliases: [
      'nescafe classic',
      'nescafe 200g',
      'nescafe refill',
      'kopi nescafe',
      'nescafe',
      'nescafe pack'
    ],
    description: 'Nescafe Classic 100% Pure Soluble Coffee Refill Pack 200g',
    taxExempt: false,
  },
  {
    id: 'prod_gula_prai_1kg',
    sku: 'GULA-PRAI-1KG',
    name: 'Gula Pasir Kasar Prai 1kg',
    unitPrice: 2.85,
    stock: 95,
    category: 'Pantry Staples',
    unit: 'bag',
    aliases: [
      'gula prai',
      'gula pasir',
      'gula 1kg',
      'prai sugar',
      'white sugar 1kg',
      'gula kasar'
    ],
    description: 'Central Sugars Prai Premium Coarse White Sugar 1kg',
    taxExempt: true,
  },
  {
    id: 'prod_tepung_sauh_1kg',
    sku: 'TEPUNG-SAUH-1KG',
    name: 'Tepung Gandum Cap Sauh 1kg',
    unitPrice: 3.50,
    stock: 65,
    category: 'Baking & Flour',
    unit: 'bag',
    aliases: [
      'tepung sauh',
      'tepung gandum',
      'tepung 1kg',
      'anchor flour',
      'sauh flour',
      'wheat flour'
    ],
    description: 'FFM Cap Sauh (Anchor) Enriched Wheat Flour 1kg',
    taxExempt: true,
  },
  {
    id: 'prod_kicap_jalen_650ml',
    sku: 'KICAP-JALEN-650ML',
    name: 'Kicap Lemak Manis Jalen 650ml',
    unitPrice: 6.80,
    stock: 42,
    category: 'Condiments',
    unit: 'bottle',
    aliases: [
      'kicap jalen',
      'kicap lemak manis',
      'jalen kicap',
      'kicap manis',
      'jalen soy sauce',
      'kicap botol'
    ],
    description: 'Jalen Kicap Lemak Manis Sweet Soy Sauce 650ml',
    taxExempt: false,
  },
  {
    id: 'prod_maggi_kari_5s',
    sku: 'MAGGI-KARI-5S',
    name: 'Maggi 2-Minit Mi Kari (5 x 79g)',
    unitPrice: 5.60,
    stock: 80,
    category: 'Instant Noodles',
    unit: 'packet',
    aliases: [
      'maggi kari',
      'maggie kari',
      'maggi 2 minit',
      'curry mee',
      'maggi 5s',
      'mi segera kari'
    ],
    description: 'Nestle Maggi 2-Minute Curry Instant Noodles Multi-Pack 5 x 79g',
    taxExempt: false,
  },
];

/**
 * Seed Customers: Malaysian SME Buyers with LHDN MyInvois TIN Status
 */
export const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'cust_ah_seng',
    name: 'Kedai Runcit Ah Seng',
    phone: '+6012-3849102',
    address: 'No. 18, Jalan Pasar, 43000 Kajang, Selangor',
    tin: 'C2459102901', // Valid Company LHDN TIN
    sstRegistered: true,
    brn: '201801039482',
    aliases: [
      'ah seng',
      'kedai ah seng',
      'uncle seng',
      'runcit ah seng',
      'kedai runcit ah seng'
    ],
  },
  {
    id: 'cust_maju_curry',
    name: 'Restoran Maju Curry House',
    phone: '+6019-8765432',
    address: 'No. 45, Jalan Telawi 3, Bangsar Baru, 59100 Kuala Lumpur',
    tin: 'C1849204802', // Valid Company LHDN TIN
    sstRegistered: true,
    brn: '201501092831',
    aliases: [
      'maju curry',
      'restoran maju',
      'maju curry house',
      'anep maju',
      'restoran maju curry'
    ],
  },
  {
    id: 'cust_jaya_hardware',
    name: 'Perniagaan Jaya Hardware',
    phone: '+6013-4567890',
    address: 'Lot 12, Kawasan Perindustrian Puchong, 47100 Puchong, Selangor',
    tin: '', // MISSING TIN -> Non-compliant alert for LHDN e-Invoicing
    sstRegistered: false,
    brn: '202003019485',
    aliases: [
      'jaya hardware',
      'perniagaan jaya',
      'jaya puchong',
      'perniagaan jaya hardware'
    ],
  },
  {
    id: 'cust_kafe_belakang',
    name: 'Kafe Jalan Belakang',
    phone: '+6016-2233445',
    address: '34-A, Jalan Tun H.S. Lee, City Centre, 50000 Kuala Lumpur',
    tin: 'IG3948201948', // Valid Individual/Sole Proprietor LHDN TIN
    sstRegistered: true,
    brn: '202203001923',
    aliases: [
      'kafe jalan belakang',
      'jalan belakang cafe',
      'belakang cafe',
      'kafe belakang'
    ],
  },
  {
    id: 'cust_uncle_bob',
    name: 'Pasar Mini Uncle Bob',
    phone: '+6011-1234567',
    address: '77, Jalan SS 2/67, 47300 Petaling Jaya, Selangor',
    tin: '', // MISSING TIN -> Non-compliant alert
    sstRegistered: false,
    brn: '202102049182',
    aliases: [
      'uncle bob',
      'pasar mini uncle bob',
      'pasar uncle bob',
      'bob mini market'
    ],
  },
];

/**
 * Seed Audit Logs: Initial system trace records
 */
export const SEED_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log_seed_001',
    timestamp: '2026-10-21T06:00:00.000Z',
    user: 'system',
    action: 'SYSTEM_INITIALIZED',
    details: {
      message: 'Orbyte SME datastore initialized with Malaysian wholesale catalog',
      productsCount: SEED_PRODUCTS.length,
      customersCount: SEED_CUSTOMERS.length,
    },
    status: 'info',
  },
  {
    id: 'log_seed_002',
    timestamp: '2026-10-21T07:15:30.000Z',
    user: 'sales_ops@orbyte.my',
    action: 'ORDER_APPROVED',
    details: {
      orderId: 'PO-20261021-0081',
      customerName: 'Restoran Maju Curry House',
      tin: 'C1849204802',
      totalAmount: 384.40,
      itemCount: 4,
      docType: 'purchase_order',
    },
    status: 'success',
  },
  {
    id: 'log_seed_003',
    timestamp: '2026-10-21T07:45:00.000Z',
    user: 'warehouse@orbyte.my',
    action: 'STOCK_ADJUSTMENT',
    details: {
      sku: 'MINYAK-SM-5KG',
      adjustment: -14,
      remainingStock: 6,
      reason: 'Dispatched 14 bottles to Subang Jaya distribution depot',
    },
    status: 'warning',
  },
];
