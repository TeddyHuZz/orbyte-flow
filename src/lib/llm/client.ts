/**
 * Orbyte Flow — AI Order Extraction Engine Orchestrator
 * 
 * Implements a resilient 3-Tier Multi-LLM Fallback Cascade:
 *   Tier 1: DeepSeek Chat API (primary high-speed reasoning model via OpenAI SDK)
 *   Tier 2: Google Gemini 1.5 Flash (secondary high-throughput structured model)
 *   Tier 3: Malaysian SME Mock Parser (zero-dependency deterministic regex engine)
 */

import { ExtractionResult } from '../orbyte/types';
import { extractWithDeepSeek } from './deepseek';
import { extractWithGemini } from './gemini';
import { parseWithMockParser } from './mock-parser';

export { parseWithMockParser } from './mock-parser';
export { extractWithDeepSeek } from './deepseek';
export { extractWithGemini } from './gemini';
export type { ExtractionResult, ExtractionResultItem } from '../orbyte/types';

/**
 * Extracts structured order data (customer, items, delivery, notes) from unstructured message text.
 * Cascades seamlessly across configured LLM tiers and falls back to deterministic heuristic parsing.
 */
export async function extractOrderFromText(rawText: string): Promise<ExtractionResult> {
  const trimmed = rawText ? rawText.trim() : '';

  if (!trimmed) {
    return {
      success: false,
      providerUsed: 'mock',
      items: [],
      rawText: rawText || '',
      error: 'Empty order text provided',
    };
  }

  // Tier 1: DeepSeek API (if configured)
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (deepseekKey && deepseekKey.trim()) {
    try {
      const result = await extractWithDeepSeek(trimmed);
      if (result && result.success && result.items && result.items.length > 0) {
        return result;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[AI Extraction Cascade] DeepSeek tier failed (${msg}). Falling back to Gemini...`);
    }
  }

  // Tier 2: Google Gemini API (if configured)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey.trim()) {
    try {
      const result = await extractWithGemini(trimmed);
      if (result && result.success && result.items && result.items.length > 0) {
        return result;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[AI Extraction Cascade] Gemini tier failed (${msg}). Falling back to Mock Parser...`);
    }
  }

  // Tier 3: Deterministic Malaysian SME Heuristic & Regex Parser
  return parseWithMockParser(trimmed);
}
