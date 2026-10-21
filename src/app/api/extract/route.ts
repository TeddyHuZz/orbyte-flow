import { NextRequest } from 'next/server';
import { extractOrderFromText } from '../../../lib/llm/client';
import { validateAndEnrichOrder } from '../../../lib/rules/validator';
import { orbyteDb } from '../../../lib/orbyte/db';
import { jsonResponse, handleOptions } from '../../../lib/api-helper';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body.text !== 'string' || !body.text.trim()) {
      return jsonResponse(
        {
          success: false,
          error: 'Missing or empty "text" parameter in request body',
        },
        { status: 400 }
      );
    }

    const { text, sender, senderPhone } = body;

    // 1. Run multi-tier LLM extraction cascade (DeepSeek -> Gemini -> Malaysian SME Mock)
    const extractionResult = await extractOrderFromText(text);

    // 2. Run deterministic business rules & LHDN validation engine
    const draft = validateAndEnrichOrder(extractionResult, {
      senderPhone: senderPhone || sender,
    });

    // 3. Record audit trail entry for extraction event
    orbyteDb.addAuditLog({
      user: sender || 'ai_pipeline',
      action: 'EXTRACTION_COMPLETED',
      details: {
        provider: extractionResult.providerUsed,
        customerName: draft.customerName,
        itemsCount: draft.items.length,
        warningsCount: draft.warnings.length,
        hasLowStock: draft.warnings.some((w) => w.includes('LOW_STOCK')),
      },
      status: draft.warnings.length > 0 ? 'warning' : 'success',
    });

    return jsonResponse({
      success: true,
      draft,
      result: draft, // alias for backwards compatibility
      data: extractionResult,
      provider: extractionResult.providerUsed,
      providerUsed: extractionResult.providerUsed,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error during order extraction';
    console.error('Error in /api/extract:', error);
    return jsonResponse(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
