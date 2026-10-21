import { NextRequest } from 'next/server';
import { orbyteDb } from '../../../lib/orbyte/db';
import { jsonResponse, handleOptions } from '../../../lib/api-helper';
import { AuditStatus } from '../../../lib/orbyte/types';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/audit-log
 * Returns the immutable audit log trail (most recent events first).
 */
export async function GET() {
  try {
    const auditLogs = orbyteDb.getAuditLogs();

    return jsonResponse({
      success: true,
      auditLogs,
      logs: auditLogs, // alias for convenience
      count: auditLogs.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error retrieving audit log trail';
    return jsonResponse(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/audit-log
 * Allows manual recording of audit trail events (e.g., from extension or operator actions).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || !body.action) {
      return jsonResponse(
        {
          success: false,
          error: 'Missing required "action" in request body',
        },
        { status: 400 }
      );
    }

    const entry = orbyteDb.addAuditLog({
      user: body.user || 'operator',
      action: body.action,
      details: body.details || {},
      status: (body.status as AuditStatus) || 'info',
    });

    return jsonResponse({
      success: true,
      auditEntry: entry,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error recording audit log';
    return jsonResponse(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
