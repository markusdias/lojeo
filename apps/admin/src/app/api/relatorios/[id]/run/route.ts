import { NextRequest, NextResponse } from 'next/server';
import { eq, and, gte, sql, inArray } from 'drizzle-orm';
import { db, scheduledReports, orders, behaviorEvents, productVariants, products } from '@lojeo/db';
import { auth } from '../../../../../auth';
import { TENANT_ID, requirePermission, recordAuditLog } from '../../../../../lib/roles';

export const dynamic = 'force-dynamic';

interface RouteCtx {
  params: Promise<{ id: string }>;
}

const PAID_STATUSES = ['paid', 'preparing', 'shipped', 'delivered'];

function csvEscape(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const head = headers.map(csvEscape).join(',');
  const body = rows.map((r) => headers.map((h) => csvEscape(r[h])).join(',')).join('\n');
  return `${head}\n${body}\n`;
}

async function generateRevenueSummary(): Promise<string> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      day: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM-DD')`,
      orders: sql<number>`COUNT(*)::int`,
      revenue: sql<number>`COALESCE(SUM(${orders.totalCents}), 0)::bigint`,
    })
    .from(orders)
    .where(and(
      eq(orders.tenantId, TENANT_ID),
      gte(orders.createdAt, since),
      inArray(orders.status, PAID_STATUSES),
    ))
    .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD') DESC`);

  return rowsToCsv(
    ['day', 'orders', 'revenue_cents'],
    rows.map((r) => ({
      day: r.day,
      orders: Number(r.orders),
      revenue_cents: Number(r.revenue),
    })),
  );
}

async function generateConversionFunnel(): Promise<string> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sessions = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${behaviorEvents.anonymousId})::int` })
    .from(behaviorEvents)
    .where(and(eq(behaviorEvents.tenantId, TENANT_ID), gte(behaviorEvents.createdAt, since)));
  const productViews = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(behaviorEvents)
    .where(and(
      eq(behaviorEvents.tenantId, TENANT_ID),
      gte(behaviorEvents.createdAt, since),
      eq(behaviorEvents.eventType, 'product_view'),
    ));
  const addToCart = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(behaviorEvents)
    .where(and(
      eq(behaviorEvents.tenantId, TENANT_ID),
      gte(behaviorEvents.createdAt, since),
      eq(behaviorEvents.eventType, 'add_to_cart'),
    ));
  const ordersCount = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(orders)
    .where(and(
      eq(orders.tenantId, TENANT_ID),
      gte(orders.createdAt, since),
      inArray(orders.status, PAID_STATUSES),
    ));

  return rowsToCsv(
    ['stage', 'count'],
    [
      { stage: 'sessions', count: Number(sessions[0]?.count ?? 0) },
      { stage: 'product_view', count: Number(productViews[0]?.count ?? 0) },
      { stage: 'add_to_cart', count: Number(addToCart[0]?.count ?? 0) },
      { stage: 'orders_paid', count: Number(ordersCount[0]?.count ?? 0) },
    ],
  );
}

async function generateInventoryLow(threshold: number): Promise<string> {
  const rows = await db
    .select({
      sku: productVariants.sku,
      productName: products.name,
      stock: productVariants.stockQty,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(and(
      eq(productVariants.tenantId, TENANT_ID),
      sql`${productVariants.stockQty} <= ${threshold}`,
    ))
    .orderBy(productVariants.stockQty)
    .limit(500);

  return rowsToCsv(
    ['sku', 'product_name', 'stock'],
    rows.map((r) => ({ sku: r.sku, product_name: r.productName, stock: r.stock ?? 0 })),
  );
}

export async function POST(_req: NextRequest, ctx: RouteCtx) {
  const session = await auth();
  try {
    await requirePermission(session, 'insights', 'read');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const [report] = await db
    .select()
    .from(scheduledReports)
    .where(and(eq(scheduledReports.id, id), eq(scheduledReports.tenantId, TENANT_ID)))
    .limit(1);

  if (!report) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  let csv = '';
  try {
    if (report.reportType === 'revenue_summary') {
      csv = await generateRevenueSummary();
    } else if (report.reportType === 'conversion_funnel') {
      csv = await generateConversionFunnel();
    } else if (report.reportType === 'inventory_low') {
      const filters = (report.filters ?? {}) as { stockThreshold?: number };
      csv = await generateInventoryLow(filters.stockThreshold ?? 5);
    } else {
      return NextResponse.json({ error: 'reportType não suportado' }, { status: 400 });
    }

    // Marca lastRunAt
    await db
      .update(scheduledReports)
      .set({ lastRunAt: new Date() })
      .where(eq(scheduledReports.id, id));

    await recordAuditLog({
      session,
      action: 'scheduled_report.run',
      entityType: 'scheduled_report',
      entityId: id,
      metadata: {
        reportType: report.reportType,
        delivered: false,
        reason: process.env.RESEND_API_KEY ? 'manual_run' : 'resend_not_configured',
      },
    });

    const filename = `${report.reportType}_${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
