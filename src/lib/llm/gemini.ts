/**
 * Orbyte Flow — Google Gemini LLM Extraction Client
 * Secondary AI Extraction Tier using @google/generative-ai (Gemini 1.5 Flash)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
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

export async function extractWithGemini(rawText: string): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey.trim());
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
    systemInstruction: SYSTEM_PROMPT,
  });

  // 10-second timeout guard
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Gemini API call timed out after 10000ms')), 10000);
  });

  try {
    const generatePromise = model.generateContent(rawText);
    const result = await Promise.race([generatePromise, timeoutPromise]);
    if (timer) clearTimeout(timer);

    const responseText = result.response.text();
    if (!responseText) {
      throw new Error('Gemini API returned empty text');
    }

    const cleaned = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
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
      providerUsed: 'gemini',
      customerName: parsed.customerName ? String(parsed.customerName).trim() : undefined,
      deliveryDate: parsed.deliveryDate ? String(parsed.deliveryDate).trim() : undefined,
      notes: parsed.notes ? String(parsed.notes).trim() : undefined,
      items,
      rawText,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
