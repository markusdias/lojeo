import Link from 'next/link';
import {
  db,
  productReviews,
  returnRequests,
  orders,
} from '@lojeo/db';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { QueuesTabs, type Tab, type ReviewRow, type ReturnRow, type ShippingRow } from './tabs';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

async function fetchReviewsPending(): Promise<ReviewRow[]> {
  try {
    const rows = await db
      .select({
        id: productReviews.id,
        rating: productReviews.rating,
        title: productReviews.title,
        body: productReviews.body,
        customerName: productReviews.anonymousName,
        productId: productReviews.productId,
        verified: productReviews.verifiedPurchase,
        createdAt: productReviews.createdAt,
      })
      .from(productReviews)
      .where(and(eq(productReviews.tenantId, TENANT_ID), eq(productReviews.status, 'pending')))
      .orderBy(desc(productReviews.createdAt))
      .limit(50);
    return rows.map(r => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      customerName: r.customerName,
      productId: r.productId,
      verified: r.verified,
      createdAt: (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt as string)).toISOString(),
    }));
  } catch {
    return [];
  }
}

async function fetchReturnsActive(): Promise<ReturnRow[]> {
  try {
    const rows = await db
      .select({
        id: returnRequests.id,
        orderId: returnRequests.orderId,
        customerEmail: returnRequests.customerEmail,
        type: returnRequests.type,
        reason: returnRequests.reason,
        status: returnRequests.status,
        refundCents: returnRequests.refundCents,
        createdAt: returnRequests.createdAt,
      })
      .from(returnRequests)
      .where(
        and(
          eq(returnRequests.tenantId, TENANT_ID),
          inArray(returnRequests.status, ['requested', 'analyzing', 'approved', 'awaiting_product', 'received']),
        ),
      )
      .orderBy(desc(returnRequests.createdAt))
      .limit(30);

    if (rows.length === 0) return [];

    const orderIds = rows.map(r => r.orderId);
    const orderMap = new Map<string, { number: string | null; total: number | null }>();
    if (orderIds.length > 0) {
      const orderRows = await db
        .select({ id: orders.id, orderNumber: orders.orderNumber, totalCents: orders.totalCents })
        .from(orders)
        .where(and(eq(orders.tenantId, TENANT_ID), inArray(orders.id, orderIds)));
      for (const o of orderRows) {
        orderMap.set(o.id, { number: o.orderNumber, total: o.totalCents });
      }
    }

    return rows.map(r => ({
      id: r.id,
      orderNumber: orderMap.get(r.orderId)?.number ?? r.orderId.slice(0, 8),
      customerEmail: r.customerEmail,
      type: r.type,
      reason: r.reason,
      status: r.status,
      totalCents: r.refundCents ?? orderMap.get(r.orderId)?.total ?? 0,
      createdAt: (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt as string)).toISOString(),
    }));
  } catch {
    return [];
  }
}

async function fetchShippingPending(): Promise<ShippingRow[]> {
  try {
    const rows = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerEmail: orders.customerEmail,
        shippingAddress: orders.shippingAddress,
        shippingService: orders.shippingService,
        shippingDeadlineDays: orders.shippingDeadlineDays,
        totalCents: orders.totalCents,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, TENANT_ID),
          inArray(orders.status, ['paid', 'preparing']),
        ),
      )
      .orderBy(desc(orders.createdAt))
      .limit(50);

    return rows.map(r => {
      const addr = r.shippingAddress as Record<string, string> | null;
      const city = addr?.city ?? '—';
      const state = addr?.state ?? '';
      const slaDays = r.shippingDeadlineDays ?? 3;
      const createdAt = r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt as string);
      const slaDate = new Date(createdAt.getTime() + slaDays * 24 * 60 * 60 * 1000);
      const overdue = slaDate < new Date();
      return {
        id: r.id,
        orderNumber: r.orderNumber ?? r.id.slice(0, 8),
        customerEmail: r.customerEmail,
        city: state ? `${city} · ${state}` : city,
        method: r.shippingService ?? 'Sedex',
        slaText: overdue ? 'atrasada' : `até ${slaDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`,
        overdue,
        totalCents: r.totalCents ?? 0,
        createdAt: createdAt.toISOString(),
      };
    });
  } catch {
    return [];
  }
}

async function fetchCounts() {
  try {
    const [r, t, s] = await Promise.all([
      db.select({ c: sql<number>`cast(count(*) as int)` }).from(productReviews).where(and(eq(productReviews.tenantId, TENANT_ID), eq(productReviews.status, 'pending'))),
      db.select({ c: sql<number>`cast(count(*) as int)` }).from(returnRequests).where(and(eq(returnRequests.tenantId, TENANT_ID), inArray(returnRequests.status, ['requested', 'analyzing', 'approved', 'awaiting_product', 'received']))),
      db.select({ c: sql<number>`cast(count(*) as int)` }).from(orders).where(and(eq(orders.tenantId, TENANT_ID), inArray(orders.status, ['paid', 'preparing']))),
    ]);
    return {
      reviews: Number(r[0]?.c ?? 0),
      returns: Number(t[0]?.c ?? 0),
      shipping: Number(s[0]?.c ?? 0),
    };
  } catch {
    return { reviews: 0, returns: 0, shipping: 0 };
  }
}

export default async function FilasPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const initialTab: Tab = sp.tab === 'returns' || sp.tab === 'shipping' ? sp.tab : 'reviews';

  const [reviews, returns, shipping, counts] = await Promise.all([
    fetchReviewsPending(),
    fetchReturnsActive(),
    fetchShippingPending(),
    fetchCounts(),
  ]);

  const total = counts.reviews + counts.returns + counts.shipping;

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }}>
      <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>
        <Link href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>Loja</Link>
        <span style={{ margin: '0 6px', color: 'var(--fg-muted)' }}>/</span>
        <span style={{ color: 'var(--fg-secondary)' }}>Filas operacionais</span>
      </p>

      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-1)' }}>
          Filas operacionais
        </h1>
        <p className="body-s">
          Tudo que precisa do seu olho hoje · {total} {total === 1 ? 'item' : 'itens'}.
        </p>
      </div>

      <QueuesTabs
        initialTab={initialTab}
        counts={counts}
        reviews={reviews}
        returns={returns}
        shipping={shipping}
      />
    </div>
  );
}
