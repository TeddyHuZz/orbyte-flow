/**
 * Orbyte Flow — Deterministic Heuristic & Regex Parser for Malaysian SME Chats
 * 
 * Handles colloquial Malaysian business communication patterns including:
 * - Manglish idioms, shorthand, and mixed Malay/English phrasing
 * - Common order formats: "<qty> <unit> <product>", "<product> <qty> <unit>", "<qty>x <product>"
 * - Malaysian wholesale packaging units (carton/ctn/kotak, tin/can, bag/beg/guni, bottle/botol, tray/papan)
 * - Customer recognition via seed customer alias database and heuristic headers
 * - Delivery dates and notes extraction (e.g. "deliver Friday PJ", "hantar esok pagi")
 */

import { SEED_CUSTOMERS } from '../orbyte/seed-data';
import { ExtractionResult, ExtractionResultItem } from '../orbyte/types';

const UNIT_MAP: Record<string, string> = {
  carton: 'carton',
  cartons: 'carton',
  ctn: 'carton',
  ctns: 'carton',
  kotak: 'carton',
  box: 'carton',
  boxes: 'carton',
  tin: 'tin',
  tins: 'tin',
  can: 'tin',
  cans: 'tin',
  bag: 'bag',
  bags: 'bag',
  beg: 'bag',
  guni: 'bag',
  sack: 'bag',
  sacks: 'bag',
  bottle: 'bottle',
  bottles: 'bottle',
  botol: 'bottle',
  btl: 'bottle',
  btls: 'bottle',
  tray: 'tray',
  trays: 'tray',
  papan: 'tray',
  packet: 'pack',
  packets: 'pack',
  pack: 'pack',
  packs: 'pack',
  pkt: 'pack',
  pkts: 'pack',
  bungkus: 'pack',
  biji: 'pcs',
  pcs: 'pcs',
  piece: 'pcs',
  pieces: 'pcs',
  unit: 'unit',
  units: 'unit',
  kg: 'kg',
  kilogram: 'kg',
  kilo: 'kg',
  g: 'g',
  gram: 'g',
};

// Sort unit patterns by length descending so longer words match first (e.g. cartons before ctn)
const UNITS_PATTERN = Object.keys(UNIT_MAP).sort((a, b) => b.length - a.length).join('|');

const DELIVERY_KEYWORDS = ['deliver', 'delivery', 'hantar', 'send to', 'ship to', 'drop off', 'urgent deliver'];
const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'isnin', 'selasa', 'rabu', 'khamis', 'jumaat', 'sabtu', 'ahad'];
const RELATIVE_DATES = ['today', 'tomorrow', 'tonight', 'esok pagi', 'esok petang', 'esok', 'hari ini', 'pagi ini', 'petang ini'];

function normalizeUnit(unitStr: string): string {
  const clean = unitStr.toLowerCase().trim();
  return UNIT_MAP[clean] || clean;
}

/**
 * Deterministically parses unstructured chat text into an ExtractionResult.
 */
export function parseWithMockParser(rawText: string): ExtractionResult {
  if (!rawText || !rawText.trim()) {
    return {
      success: false,
      providerUsed: 'mock',
      items: [],
      rawText: rawText || '',
      error: 'Empty order text provided',
    };
  }

  const cleanText = rawText.trim();
  let customerName: string | undefined;
  let deliveryDate: string | undefined;
  let notes: string | undefined;
  const items: ExtractionResultItem[] = [];

  // 1. Identify Customer Name from Seed Customer Aliases
  const lowerText = cleanText.toLowerCase();
  for (const customer of SEED_CUSTOMERS) {
    if (lowerText.includes(customer.name.toLowerCase())) {
      customerName = customer.name;
      break;
    }
    if (customer.aliases) {
      for (const alias of customer.aliases) {
        const aliasRegex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (aliasRegex.test(lowerText)) {
          customerName = customer.name;
          break;
        }
      }
    }
    if (customerName) break;
  }

  // 2. Identify Delivery & Date information
  // Date patterns: YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
  const dateRegex = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b/;
  const dateMatch = cleanText.match(dateRegex);
  if (dateMatch) {
    deliveryDate = dateMatch[1];
  }

  // Check for relative date or day of week
  for (const day of [...RELATIVE_DATES, ...DAYS_OF_WEEK]) {
    const dayRegex = new RegExp(`\\b(${day}(?:\\s+(?:morning|afternoon|petang|pagi))?)\\b`, 'i');
    const dayMatch = cleanText.match(dayRegex);
    if (dayMatch && !deliveryDate) {
      deliveryDate = dayMatch[1];
      break;
    }
  }

  // Extract full delivery instruction clause
  const deliveryRegex = /(?:deliver(?:y)?|hantar|send to|ship to|urgent deliver)[^.\n;]*/i;
  const deliveryMatch = cleanText.match(deliveryRegex);
  if (deliveryMatch) {
    notes = deliveryMatch[0].trim();
  }

  // 3. Pre-process text to separate sentences and delivery clauses
  const rawLines = cleanText.split(/\r?\n/);
  const segments: string[] = [];

  for (const line of rawLines) {
    let processLine = line.trim();
    if (!processLine) continue;

    // Check if line has a customer header prefix like "Boss, order for Restoran Maju Curry House: 10 bag..."
    const colonIdx = processLine.indexOf(':');
    if (colonIdx !== -1) {
      const prefix = processLine.substring(0, colonIdx).trim();
      const suffix = processLine.substring(colonIdx + 1).trim();

      if (!customerName) {
        const custMatch = prefix.match(/(?:order\s+(?:for|from)|customer|bill\s+to|send\s+to|dari|from)\s+([A-Za-z0-9\s&'.()/-]+)/i);
        if (custMatch) {
          customerName = custMatch[1].trim();
        } else {
          const hereMatch = prefix.match(/^([A-Za-z0-9\s&'.()/-]+?)\s*(?:here|sini)?$/i);
          if (hereMatch && !/^(?:order|items?|senarai|pesanan|delivery|hantar)$/i.test(hereMatch[1])) {
            customerName = hereMatch[1].replace(/^(?:hi\s+boss|boss|salam|hello)[,\s]*/i, '').trim();
          }
        }
      }

      if (suffix) {
        processLine = suffix;
      } else {
        continue;
      }
    } else {
      if (!customerName) {
        const hereMatch = processLine.match(/^(?:hi\s+boss[,\s]*)?([A-Za-z0-9\s&'.()/-]+?)\s+(?:here|sini)\b/i);
        if (hereMatch) {
          customerName = hereMatch[1].trim();
        }
      }
    }

    // Split sentences if period is followed by a delivery phrase or capitalized sentence
    processLine = processLine.replace(/\.\s+(?=[A-Z]|deliver|hantar|send|urgent|tolong)/gi, ' , ');

    // Conjunctions (and, dan, +, &) connecting line items (e.g. "10 ctn milo and 5 tin susu")
    processLine = processLine.replace(/\s+(?:and|dan|\+)\s+(?=\d+)/gi, ' , ');

    // Split by commas, semicolons
    const subSegments = processLine.split(/[,;]/);
    for (const sub of subSegments) {
      const s = sub.trim();
      if (s) segments.push(s);
    }
  }

  // Regex patterns for line items:
  // Pattern 1: Qty + [Unit] + Product (e.g. "15 carton milo", "5 tin susu pekat", "10 bag beras jasmine 10kg")
  const pattern1 = new RegExp(
    `^(?:(?:\\d+[\\.\\)\\-:]|[-*•])\\s*)?(\\d+(?:\\.\\d+)?)\\s*(?:x\\s*)?(${UNITS_PATTERN})?\\b\\s*(?:of\\s+)?(.+)$`,
    'i'
  );

  // Pattern 2: Product + Qty + Unit (e.g. "Milo 15 ctn", "Susu pekat 10 tin", "Minyak masak 5 botol", "fn susu 10tin")
  const pattern2 = new RegExp(
    `^(?:(?:\\d+[\\.\\)\\-:]|[-*•])\\s*)?(.+?)\\s*[:\\-]?\\s*(\\d+(?:\\.\\d+)?)\\s*(${UNITS_PATTERN})$`,
    'i'
  );

  // Pattern 3: Product + 'x' + Qty (e.g. "Milo 1kg x 10")
  const pattern3 = /^(?:(?:\d+[\.\)\-:]|[-*•])\s*)?(.+?)\s*x\s*(\d+(?:\.\d+)?)$/i;

  // Pattern 4: Qty + 'x' + Product (e.g. "10x Milo 1kg", "5x susu")
  const pattern4 = /^(?:(?:\d+[\.\)\-:]|[-*•])\s*)?(\d+(?:\.\d+)?)\s*x\s*(.+)$/i;

  for (const seg of segments) {
    let cleanSeg = seg.replace(/^(?:(?:\d+[\.\)\-:]|[-*•])\s*)/, '').trim();
    if (!cleanSeg) continue;

    // Filter out common greetings & conversational non-item segments
    if (/^(?:hi\s+boss|boss|salam|hello|morning|good morning|mau\s+order|nak\s+order|thx|thanks|tq|tqvm|terima\s+kasih|kamsiah)$/i.test(cleanSeg)) {
      continue;
    }

    // Filter out delivery notes
    if (DELIVERY_KEYWORDS.some(kw => cleanSeg.toLowerCase().startsWith(kw)) || /^(?:delivery|hantar|deliver|ship|tolong hantar)\b/i.test(cleanSeg)) {
      if (!notes) notes = cleanSeg;
      continue;
    }

    // If segment starts with order intent prefix ("nak order ...", "mau order ..."), strip prefix
    const intentMatch = cleanSeg.match(/^(?:.*?\b(?:nak\s+order|mau\s+order|order|pesanan)\b)\s*(.+)$/i);
    if (intentMatch) {
      cleanSeg = intentMatch[1].trim();
    }

    // Strip greeting from the start if still attached: e.g. "salam boss, 5 kotak milo"
    cleanSeg = cleanSeg.replace(/^(?:salam\s+boss|hi\s+boss|boss)[,\s]*/i, '').trim();

    // Strip trailing delivery phrases if still attached, e.g. "minyak seri murni. Hantar ke Kajang Friday"
    const trailingDeliveryIdx = cleanSeg.search(/\s+(?:deliver|hantar|tolong\s+hantar|send\s+to)\b/i);
    if (trailingDeliveryIdx !== -1) {
      const trailingPart = cleanSeg.substring(trailingDeliveryIdx).trim();
      if (!notes) notes = trailingPart;
      cleanSeg = cleanSeg.substring(0, trailingDeliveryIdx).trim();
    }

    let matched = false;

    // Try Pattern 1: Qty + [Unit] + Product
    const m1 = cleanSeg.match(pattern1);
    if (m1) {
      const qty = parseFloat(m1[1]);
      const rawUnit = m1[2] ? normalizeUnit(m1[2]) : 'unit';
      let rawName = m1[3].trim();

      rawName = rawName.replace(/[,;.\-]+$/, '').replace(/\b(?:ya|tq|pls|please|urgent)$/i, '').trim();

      if (rawName && !DELIVERY_KEYWORDS.some(k => rawName.toLowerCase().startsWith(k)) && !DAYS_OF_WEEK.includes(rawName.toLowerCase())) {
        items.push({
          rawName,
          quantity: qty,
          unit: rawUnit,
        });
        matched = true;
      }
    }

    if (!matched) {
      // Try Pattern 2: Product + Qty + Unit
      const m2 = cleanSeg.match(pattern2);
      if (m2) {
        let rawName = m2[1].trim();
        const qty = parseFloat(m2[2]);
        const rawUnit = normalizeUnit(m2[3]);
        rawName = rawName.replace(/[,;.\-]+$/, '').trim();

        if (rawName && !DELIVERY_KEYWORDS.some(k => rawName.toLowerCase().startsWith(k))) {
          items.push({
            rawName,
            quantity: qty,
            unit: rawUnit,
          });
          matched = true;
        }
      }
    }

    if (!matched) {
      // Try Pattern 3: Product + x + Qty
      const m3 = cleanSeg.match(pattern3);
      if (m3) {
        let rawName = m3[1].trim();
        const qty = parseFloat(m3[2]);
        rawName = rawName.replace(/[,;.\-]+$/, '').trim();
        if (rawName && !DELIVERY_KEYWORDS.some(k => rawName.toLowerCase().startsWith(k))) {
          items.push({
            rawName,
            quantity: qty,
            unit: 'unit',
          });
          matched = true;
        }
      }
    }

    if (!matched) {
      // Try Pattern 4: Qty + x + Product
      const m4 = cleanSeg.match(pattern4);
      if (m4) {
        const qty = parseFloat(m4[1]);
        let rawName = m4[2].trim();
        rawName = rawName.replace(/[,;.\-]+$/, '').trim();
        if (rawName && !DELIVERY_KEYWORDS.some(k => rawName.toLowerCase().startsWith(k))) {
          items.push({
            rawName,
            quantity: qty,
            unit: 'unit',
          });
          matched = true;
        }
      }
    }
  }

  return {
    success: items.length > 0,
    providerUsed: 'mock',
    customerName,
    deliveryDate,
    notes,
    items,
    rawText: cleanText,
  };
}
