import { Product, Customer, AuditLogEntry, OrderDraft } from './types';
import { SEED_PRODUCTS, SEED_CUSTOMERS, SEED_AUDIT_LOGS } from './seed-data';

/**
 * In-Memory Database representing Orbyte Business Hub
 * Stores Products, Customers, Orders, and an Immutable Audit Trail.
 */
export class OrbyteDatabase {
  private products: Map<string, Product> = new Map();
  private customers: Map<string, Customer> = new Map();
  private orders: Map<string, OrderDraft> = new Map();
  private auditLogs: AuditLogEntry[] = [];

  constructor() {
    this.init();
  }

  /**
   * Initializes / Resets the in-memory database with realistic seed data
   */
  public init(): void {
    this.products.clear();
    this.customers.clear();
    this.orders.clear();
    this.auditLogs = [];

    // Deep clone products
    for (const p of SEED_PRODUCTS) {
      this.products.set(p.sku.toUpperCase(), {
        ...p,
        aliases: p.aliases ? [...p.aliases] : [],
      });
    }

    // Deep clone customers
    for (const c of SEED_CUSTOMERS) {
      this.customers.set(c.id, {
        ...c,
        aliases: c.aliases ? [...c.aliases] : [],
      });
    }

    // Deep clone audit logs
    this.auditLogs = SEED_AUDIT_LOGS.map((log) => ({
      ...log,
      details: typeof log.details === 'object' && log.details !== null
        ? { ...log.details }
        : log.details,
    }));
  }

  // ==========================================
  // Product Operations
  // ==========================================

  /**
   * Returns all products in the catalog
   */
  public getProducts(): Product[] {
    return Array.from(this.products.values()).map((p) => ({ ...p }));
  }

  /**
   * Looks up a product by its exact SKU (case-insensitive)
   */
  public getProductBySku(sku: string): Product | undefined {
    if (!sku) return undefined;
    const item = this.products.get(sku.trim().toUpperCase());
    return item ? { ...item } : undefined;
  }

  /**
   * Looks up a product by its ID
   */
  public getProductById(id: string): Product | undefined {
    if (!id) return undefined;
    for (const p of this.products.values()) {
      if (p.id === id) return { ...p };
    }
    return undefined;
  }

  /**
   * Fuzzy/heuristic product search by SKU, name, or alias
   */
  public findProduct(query: string): Product | undefined {
    if (!query || !query.trim()) return undefined;
    const q = query.trim().toLowerCase();

    // 1. Direct SKU match
    const bySku = this.getProductBySku(query);
    if (bySku) return bySku;

    // 2. Exact name match
    for (const p of this.products.values()) {
      if (p.name.toLowerCase() === q) {
        return { ...p };
      }
    }

    // 3. Exact alias match
    for (const p of this.products.values()) {
      if (p.aliases?.some((alias) => alias.toLowerCase() === q)) {
        return { ...p };
      }
    }

    // 4. Name contains query or query contains name
    for (const p of this.products.values()) {
      const pName = p.name.toLowerCase();
      if (pName.includes(q) || q.includes(pName)) {
        return { ...p };
      }
    }

    // 5. Alias contains query or query contains alias
    for (const p of this.products.values()) {
      if (
        p.aliases?.some((alias) => {
          const a = alias.toLowerCase();
          return a.includes(q) || q.includes(a);
        })
      ) {
        return { ...p };
      }
    }

    return undefined;
  }

  /**
   * Updates product stock by delta (positive to restock, negative to deduct)
   * Prevents stock from falling below zero.
   */
  public updateStock(sku: string, delta: number): Product | undefined {
    if (!sku) return undefined;
    const key = sku.trim().toUpperCase();
    const existing = this.products.get(key);
    if (!existing) return undefined;

    const previousStock = existing.stock;
    const newStock = Math.max(0, previousStock + delta);
    existing.stock = newStock;
    this.products.set(key, existing);

    // Record internal audit log for stock change
    this.addAuditLog({
      user: 'orbyte_engine',
      action: delta < 0 ? 'STOCK_DEDUCTED' : 'STOCK_ADJUSTMENT',
      details: {
        sku: existing.sku,
        productName: existing.name,
        delta,
        previousStock,
        currentStock: newStock,
      },
      status: newStock <= 5 ? 'warning' : 'success',
    });

    return { ...existing };
  }

  // ==========================================
  // Customer Operations
  // ==========================================

  /**
   * Returns all registered customers
   */
  public getCustomers(): Customer[] {
    return Array.from(this.customers.values()).map((c) => ({ ...c }));
  }

  /**
   * Looks up a customer by ID
   */
  public getCustomerById(id: string): Customer | undefined {
    if (!id) return undefined;
    const c = this.customers.get(id);
    return c ? { ...c } : undefined;
  }

  /**
   * Finds customer by name, alias, phone, or TIN
   */
  public findCustomer(query: string): Customer | undefined {
    if (!query || !query.trim()) return undefined;
    const raw = query.trim().toLowerCase();
    // Normalize phone search: remove spaces, dashes, +60 / 60
    const cleanPhone = raw.replace(/\D/g, '').replace(/^(60|0)/, '');

    for (const customer of this.customers.values()) {
      const custName = customer.name.toLowerCase();
      const custPhone = customer.phone.replace(/\D/g, '').replace(/^(60|0)/, '');

      // 1. Direct or partial Name match
      if (custName === raw || custName.includes(raw) || raw.includes(custName)) {
        return { ...customer };
      }

      // 2. Alias match
      if (
        customer.aliases?.some((alias) => {
          const a = alias.toLowerCase();
          return a === raw || a.includes(raw) || raw.includes(a);
        })
      ) {
        return { ...customer };
      }

      // 3. Phone number match
      if (cleanPhone.length >= 7 && custPhone.includes(cleanPhone)) {
        return { ...customer };
      }

      // 4. LHDN TIN match
      if (customer.tin && customer.tin.toLowerCase() === raw) {
        return { ...customer };
      }

      // 5. BRN match
      if (customer.brn && customer.brn.toLowerCase() === raw) {
        return { ...customer };
      }
    }

    return undefined;
  }

  // ==========================================
  // Order Operations
  // ==========================================

  /**
   * Records or creates an order draft / purchase order
   */
  public createOrder(order: Partial<OrderDraft> & { customerName: string; items: OrderDraft['items'] }): OrderDraft {
    const id = order.id || `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const timestamp = order.createdAt || new Date().toISOString();

    const newOrder: OrderDraft = {
      id,
      customerName: order.customerName,
      customerId: order.customerId,
      customerTin: order.customerTin,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      items: order.items.map((item) => ({ ...item })),
      subtotal: order.subtotal ?? order.items.reduce((sum, item) => sum + (item.lineTotal ?? 0), 0),
      tax: order.tax ?? 0,
      total: order.total ?? 0,
      notes: order.notes,
      status: order.status || 'draft',
      docType: order.docType || 'purchase_order',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.orders.set(id, newOrder);
    return { ...newOrder };
  }

  /**
   * Returns all recorded orders (most recent first)
   */
  public getOrders(): OrderDraft[] {
    return Array.from(this.orders.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((o) => ({ ...o }));
  }

  /**
   * Looks up an order by ID
   */
  public getOrderById(id: string): OrderDraft | undefined {
    if (!id) return undefined;
    const o = this.orders.get(id);
    return o ? { ...o } : undefined;
  }

  /**
   * Updates an order status or fields
   */
  public updateOrder(id: string, updates: Partial<OrderDraft>): OrderDraft | undefined {
    const existing = this.orders.get(id);
    if (!existing) return undefined;

    const updated: OrderDraft = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.orders.set(id, updated);
    return { ...updated };
  }

  // ==========================================
  // Audit Trail Operations
  // ==========================================

  /**
   * Appends an entry to the immutable audit trail (newest first)
   */
  public addAuditLog(entry: {
    id?: string;
    timestamp?: string;
    user?: string;
    action: string;
    details: Record<string, unknown> | string;
    status?: AuditLogEntry['status'];
  }): AuditLogEntry {
    const newEntry: AuditLogEntry = {
      id: entry.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      user: entry.user || 'system',
      action: entry.action,
      details: entry.details,
      status: entry.status || 'info',
    };

    // Prepend to show newest events first
    this.auditLogs.unshift(newEntry);
    return { ...newEntry };
  }

  /**
   * Returns all audit log entries (newest first)
   */
  public getAuditLogs(): AuditLogEntry[] {
    return this.auditLogs.map((l) => ({ ...l }));
  }

  /**
   * Quick summary statistics for Hub Dashboard
   */
  public getStats() {
    const products = Array.from(this.products.values());
    const lowStockCount = products.filter((p) => p.stock <= 10).length;

    return {
      totalProducts: products.length,
      totalCustomers: this.customers.size,
      totalOrders: this.orders.size,
      totalAuditLogs: this.auditLogs.length,
      lowStockCount,
    };
  }

  /**
   * Resets database state to fresh seed data
   */
  public reset(): void {
    this.init();
  }
}

// Global singleton declaration to preserve state across Next.js HMR in dev mode
const globalForOrbyte = globalThis as unknown as {
  orbyteDbInstance: OrbyteDatabase | undefined;
};

export const orbyteDb = globalForOrbyte.orbyteDbInstance ?? new OrbyteDatabase();

if (process.env.NODE_ENV !== 'production') {
  globalForOrbyte.orbyteDbInstance = orbyteDb;
}
