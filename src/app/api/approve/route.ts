import { NextRequest } from 'next/server';
import { orbyteDb } from '../../../lib/orbyte/db';
import { validateAndEnrichOrder } from '../../../lib/rules/validator';
import { formatWhatsAppConfirmation, formatWhatsAppRejection } from '../../../lib/orbyte/formatters';
import { jsonResponse, handleOptions } from '../../../lib/api-helper';
import { AuditAction, AuditStatus, DocumentType, EnrichedOrderDraft, OrderDraft } from '../../../lib/orbyte/types';

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

    // Support both `draft` and `orderDraft` parameter names
    let draft: EnrichedOrderDraft | OrderDraft | undefined = body.draft || body.orderDraft;

    if (!draft) {
      return jsonResponse(
        {
          success: false,
          error: 'Missing order draft to approve or reject',
        },
        { status: 400 }
      );
    }

    // Validate action if supplied
    let action: 'APPROVE' | 'REJECT' = 'APPROVE';
    if (body.action !== undefined && body.action !== null) {
      const rawAction = String(body.action).trim().toUpperCase();
      if (rawAction === 'APPROVE') {
        action = 'APPROVE';
      } else if (rawAction === 'REJECT') {
        action = 'REJECT';
      } else {
        return jsonResponse(
          {
            success: false,
            error: `Invalid action "${body.action}". Must be "APPROVE" or "REJECT".`,
          },
          { status: 400 }
        );
      }
    }

    const user = body.user || 'operator';
    const rawDocType = body.docType || draft.docType || 'purchase_order';

    // Normalize docType
    let docType: DocumentType = 'purchase_order';
    if (rawDocType === 'QUOTATION' || rawDocType === 'quotation') {
      docType = 'quotation';
    } else if (rawDocType === 'INVOICE' || rawDocType === 'tax_invoice') {
      docType = 'tax_invoice';
    }

    // If editedItems are passed in, re-run enrichment so financials match
    if (body.editedItems && Array.isArray(body.editedItems)) {
      draft = validateAndEnrichOrder(
        {
          customerName: draft.customerName,
          items: body.editedItems,
          notes: draft.notes,
          docType,
        },
        {
          orderId: draft.id,
          docType,
          senderPhone: draft.customerPhone,
        }
      );
    }

    // ==========================================
    // ACTION: REJECT
    // ==========================================
    if (action === 'REJECT') {
      const rejectedOrder: OrderDraft = {
        ...draft,
        status: 'rejected',
        updatedAt: new Date().toISOString(),
      };

      // Record in DB without mutating stock
      const savedOrder = orbyteDb.createOrder(rejectedOrder);

      const auditEntry = orbyteDb.addAuditLog({
        user,
        action: 'ORDER_REJECTED',
        details: {
          orderId: savedOrder.id,
          customerName: savedOrder.customerName,
          reason: body.reason || draft.notes || 'Rejected by human operator',
          itemsCount: savedOrder.items.length,
          total: savedOrder.total,
        },
        status: 'REJECTED' as AuditStatus,
      });

      const whatsappMessage = formatWhatsAppRejection(
        savedOrder,
        body.reason || 'Manual verification rejected by operator'
      );

      return jsonResponse({
        success: true,
        action: 'REJECT',
        order: savedOrder,
        draft: savedOrder,
        poNumber: savedOrder.id,
        auditEntry,
        whatsappMessage,
      });
    }

    // ==========================================
    // ACTION: APPROVE
    // ==========================================
    const deductStock = body.deductStock !== false;

    // 1. Decrement inventory stock for all matched items
    const stockDeductionSummary: Array<{ sku: string; deducted: number; remainingStock: number }> = [];

    if (deductStock) {
      for (const item of draft.items) {
        if (item.matchedSku && item.quantity > 0) {
          const updatedProduct = orbyteDb.updateStock(item.matchedSku, -item.quantity);
          if (updatedProduct) {
            stockDeductionSummary.push({
              sku: item.matchedSku,
              deducted: item.quantity,
              remainingStock: updatedProduct.stock,
            });
          }
        }
      }
    }

    // 2. Determine Audit Action based on Document Type
    let auditAction: AuditAction = 'PO_CREATED';
    if (docType === 'quotation') {
      auditAction = 'QUOTATION_CREATED';
    } else if (docType === 'tax_invoice') {
      auditAction = 'INVOICE_CREATED';
    }

    // 3. Persist Approved Order
    const approvedOrder: OrderDraft = {
      ...draft,
      docType,
      status: 'approved',
      updatedAt: new Date().toISOString(),
    };
    const savedOrder = orbyteDb.createOrder(approvedOrder);

    // 4. Record Audit Trail with status VERIFIED
    const auditEntry = orbyteDb.addAuditLog({
      user,
      action: auditAction,
      details: {
        orderId: savedOrder.id,
        customerName: savedOrder.customerName,
        total: savedOrder.total,
        docType: savedOrder.docType,
        itemsCount: savedOrder.items.length,
        stockDeductions: stockDeductionSummary,
        lhdnCompliant: 'isLhdnCompliant' in draft ? draft.isLhdnCompliant : false,
      },
      status: 'VERIFIED' as AuditStatus,
    });

    // 5. Generate 1-Click Clipboard WhatsApp Confirmation Message
    const whatsappMessage = formatWhatsAppConfirmation(savedOrder);

    return jsonResponse({
      success: true,
      action: 'APPROVE',
      order: savedOrder,
      draft: savedOrder,
      poNumber: savedOrder.id,
      auditEntry,
      whatsappMessage,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error approving order';
    console.error('Error in /api/approve:', error);
    return jsonResponse(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
