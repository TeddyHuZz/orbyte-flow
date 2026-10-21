import { OrderDraft, EnrichedOrderDraft } from './types';

/**
 * Formats an approved order into a clean, human-readable Malaysian business WhatsApp message
 * optimized for 1-click clipboard copy into WhatsApp Web or mobile chat.
 */
export function formatWhatsAppConfirmation(
  order: OrderDraft | EnrichedOrderDraft,
  options?: { customNotes?: string; deliveryDate?: string }
): string {
  const customer = order.customerName || 'Valued Customer';
  const orderRef = order.id || 'PO-PENDING';
  const formattedDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-MY', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-MY');

  const lines: string[] = [
    `✅ *Order Confirmation — ${customer}*`,
    `Ref: ${orderRef}`,
    `Date: ${formattedDate}`,
    `Status: Confirmed & In Progress`,
    '',
    `📦 *Items Ordered:*`,
  ];

  for (const item of order.items) {
    const qty = item.quantity;
    const unit = item.unit || 'unit';
    const name = item.matchedName || item.rawName || 'Item';
    const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice.toFixed(2) : '0.00';
    const lineTotal = typeof item.lineTotal === 'number'
      ? item.lineTotal.toFixed(2)
      : (qty * (item.unitPrice || 0)).toFixed(2);

    lines.push(`• ${qty} ${unit} x ${name} @ RM ${unitPrice} = RM ${lineTotal}`);
  }

  lines.push('');
  lines.push(`Subtotal: RM ${order.subtotal.toFixed(2)}`);
  if (order.tax > 0) {
    lines.push(`SST: RM ${order.tax.toFixed(2)}`);
  }
  lines.push(`*Total: RM ${order.total.toFixed(2)}*`);

  const delivery = options?.deliveryDate || (order.notes?.match(/Requested Delivery:\s*([^|]+)/i)?.[1]?.trim());
  if (delivery) {
    lines.push('');
    lines.push(`🚚 *Delivery:* ${delivery}`);
  } else if (order.notes) {
    lines.push('');
    lines.push(`📝 *Notes:* ${order.notes}`);
  }

  lines.push('');
  lines.push(`Thank you for ordering with Orbyte Flow!`);

  return lines.join('\n');
}

/**
 * Formats a rejected order notification message for WhatsApp
 */
export function formatWhatsAppRejection(
  order: OrderDraft | EnrichedOrderDraft,
  reason?: string
): string {
  const customer = order.customerName || 'Customer';
  const orderRef = order.id || 'ORDER';

  return [
    `⚠️ *Order Notice — ${customer}*`,
    `Ref: ${orderRef}`,
    `Status: Cancelled / Not Approved`,
    reason ? `Reason: ${reason}` : 'Reason: Manual verification rejected by operator',
    '',
    `Please review the order details and re-submit if needed.`,
  ].join('\n');
}
