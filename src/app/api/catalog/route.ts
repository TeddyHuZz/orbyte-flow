import { NextRequest } from 'next/server';
import { orbyteDb } from '../../../lib/orbyte/db';
import { jsonResponse, handleOptions } from '../../../lib/api-helper';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/catalog
 * Returns all products (with stock levels & pricing), customers, and summary stats.
 */
export async function GET() {
  try {
    const products = orbyteDb.getProducts();
    const customers = orbyteDb.getCustomers();
    const stats = orbyteDb.getStats();

    return jsonResponse({
      success: true,
      products,
      customers,
      stats,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error retrieving catalog';
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
 * POST /api/catalog
 * Allows updating stock levels or resetting the database to initial seed data.
 */
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

    // Action: Reset Database
    if (body.action === 'reset') {
      orbyteDb.reset();
      return jsonResponse({
        success: true,
        message: 'Database reset to fresh Malaysian seed catalog',
        stats: orbyteDb.getStats(),
      });
    }

    // Action: Update Stock
    const sku = body.sku;
    const delta = typeof body.delta === 'number' ? body.delta : undefined;

    if (sku && typeof delta === 'number') {
      const updatedProduct = orbyteDb.updateStock(sku, delta);
      if (!updatedProduct) {
        return jsonResponse(
          {
            success: false,
            error: `Product with SKU "${sku}" not found`,
          },
          { status: 404 }
        );
      }

      return jsonResponse({
        success: true,
        product: updatedProduct,
        stats: orbyteDb.getStats(),
      });
    }

    return jsonResponse(
      {
        success: false,
        error: 'Invalid catalog action. Specify "reset" or "sku" with "delta".',
      },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error updating catalog';
    return jsonResponse(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
