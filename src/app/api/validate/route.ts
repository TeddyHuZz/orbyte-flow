import { NextRequest } from 'next/server';
import { validateAndEnrichOrder } from '../../../lib/rules/validator';
import { jsonResponse, handleOptions } from '../../../lib/api-helper';
import { DocumentType } from '../../../lib/orbyte/types';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return jsonResponse(
        {
          success: false,
          error: 'Empty request body received',
        },
        { status: 400 }
      );
    }

    const draft = body.draft;
    const items = draft ? draft.items : body.items;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return jsonResponse(
        {
          success: false,
          error: 'No items provided for validation',
        },
        { status: 400 }
      );
    }

    const customerName = draft ? draft.customerName : body.customerName;
    const notes = draft ? draft.notes : body.notes;
    const deliveryDate = body.deliveryDate;
    const docType: DocumentType = (draft ? draft.docType : body.docType) || 'purchase_order';
    const senderPhone = body.senderPhone || (draft ? draft.customerPhone : undefined);
    const existingOrderId = draft?.id;

    // Run business validation and financial recalculation
    const refreshed = validateAndEnrichOrder(
      {
        customerName,
        items,
        notes,
        deliveryDate,
        docType,
      },
      {
        orderId: existingOrderId,
        docType,
        senderPhone,
      }
    );

    return jsonResponse({
      success: true,
      draft: refreshed,
      result: refreshed, // alias for backwards compatibility
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error validating order draft';
    console.error('Error in /api/validate:', error);
    return jsonResponse(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
