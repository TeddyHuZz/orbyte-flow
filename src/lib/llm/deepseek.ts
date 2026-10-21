/**
 * Orbyte Flow — DeepSeek LLM Extraction Client
 * Primary AI Extraction Tier using DeepSeek Chat API via OpenAI SDK
 */

import OpenAI from 'openai';
import { ExtractionResult, ExtractionResultItem } from '../orbyte/types';

const SYSTEM_PROMPT = `You are an expert wholesale and SME order extraction AI specializing in Malaysian business communication (Manglish, Malay, English).
Your task is to parse unstructured order texts (e.g. WhatsApp, SMS, or informal purchase messages) into structured JSON.

You must respond with ONLY a valid JSON object strictly matching this schema:
{
  "customerName": "string or null (customer or business name if mentioned)",
  "deliveryDate": "string or null (delivery date or timeframe, e.g. 'Friday', '2026-10-25', 'tomorrow morning', 'esok pagi')",
  "notes": "string or null (special instructions, delivery address/location like 'PJ site', 'urgent')",
  "items": [
    {
      "rawName": "string (the product name or description, e.g. 'Milo 1kg', 'Susu Pekat F&N')",
      "quantity": 10,
      "unit": "string (packaging unit, e.g. 'carton', 'tin', 'bag', 'bottle', 'tray', 'pack', 'pcs', 'unit')"
    }
  ]
}

Rules:
1. Normalize units: carton/ctn/kotak -> carton; tin/can -> tin; bag/beg/guni -> bag; bottle/botol -> bottle; tray/papan -> tray; packet/pack/bungkus -> pack. If unit is unspecified, use 'unit' or 'pcs'.
2. Quantities must be numbers (integer or float).
3. Do not include packaging unit or quantity in the rawName.
4. If no items are found in the text, return items as an empty array [].
5. Never wrap output in markdown code fences. Output raw JSON only.`;

export async function extractWithDeepSeek(rawText: string): Promise<ExtractionResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  const client = new OpenAI({
    apiKey: apiKey.trim(),
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    timeout: 10000,
  });

  const completion = await client.chat.completions.create({
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: rawText },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('DeepSeek API returned empty response content');
  }

  // Handle potential markdown fences if returned
  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed = JSON.parse(cleaned);

  const items: ExtractionResultItem[] = Array.isArray(parsed.items)
    ? parsed.items
        .map((it: Record<string, unknown>) => ({
          rawName: String(it.rawName || '').trim(),
          quantity: Number(it.quantity) || 1,
          unit: String(it.unit || 'unit').trim().toLowerCase(),
        }))
        .filter((it: ExtractionResultItem) => it.rawName.length > 0)
    : [];

  return {
    success: items.length > 0,
    providerUsed: 'deepseek',
    customerName: parsed.customerName ? String(parsed.customerName).trim() : undefined,
    deliveryDate: parsed.deliveryDate ? String(parsed.deliveryDate).trim() : undefined,
    notes: parsed.notes ? String(parsed.notes).trim() : undefined,
    items,
    rawText,
  };
}
