import { NextRequest, NextResponse } from 'next/server';
import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import {
  db,
  abandonedCarts,
  behaviorEvents,
  products,
  productImages,
  users,
} from '@lojeo/db';
import { TENANT_ID } from '../../../../lib/roles';
import { authorizeCronRequest } from '../../../../lib/cron-auth';
import {
  aggregateAbandonedCarts,
  shouldNotify,
  type AbandonedCartEventLike,
  type ProductSummary,
} from '../../../../lib/abandoned-cart';
import { sendRecoverCartEmail } from '../../../../lib/email/transactional';
import { sendWhatsapp } from '../../../../lib/whatsapp';

export const dynamic = 'force-dynamic';

const LOOKBACK_HOURS = 25;
const ABANDONED_AFTER_MIN = 60;
const DEDUP_HOURS = 24;

export async function POST(req: NextRequest) {
  const auth = await authorizeCronRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const tid = TENANT_ID;
  const now = new Date();
  const since = new Date(now.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000);
  const abandonedCutoff = new Date(now.getTime() - ABANDONED_AFTER_MIN * 60 * 1000);

  // 1) Behavior events recentes (cart_add + checkout_complete)
  const rawEvents = await db
    .select({
      sessionId: behaviorEvents.sessionId,
      anonymousId: behaviorEvents.anonymousId,
      userId: behaviorEvents.userId,
      eventType: behaviorEvents.eventType,
      entityId: behaviorEvents.entityId,
      metadata: behaviorEvents.metadata,
      createdAt: behaviorEvents.createdAt,
    })
    .from(behaviorEvents)
    .where(
      and(
        eq(behaviorEvents.tenantId, tid),
        gte(behaviorEvents.createdAt, since),
        inArray(behaviorEvents.eventType, ['cart_add', 'checkout_complete']),
      ),
    );

  const events: AbandonedCartEventLike[] = rawEvents.map((e) => ({
    sessionId: e.sessionId,
    anonymousId: e.anonymousId,
    userId: e.userId,
    eventType: e.eventType,
    entityId: e.entityId,
    metadata: e.metadata,
    createdAt: e.createdAt instanceof Date ? e.createdAt : new Date(e.createdAt),
  }));

  // 2) Resolve products dos cart_add events
  const productIds = [
    ...new Set(events.filter((e) => e.eventType === 'cart_add' && e.entityId).map((e) => e.entityId!)),
  ];

  const productsMap = new Map<string, ProductSummary>();
  if (productIds.length > 0) {
    const productRows = await db
      .select({
        id: products.id,
        name: products.name,
        priceCents: products.priceCents,
      })
      .from(products)
      .where(and(eq(products.tenantId, tid), inArray(products.id, productIds)));

    const imageRows = await db
      .select({
        productId: productImages.productId,
        url: productImages.url,
      })
      .from(productImages)
      .where(and(eq(productImages.tenantId, tid), inArray(productImages.productId, productIds)));

    const imgByProduct = new Map<string, string>();
    for (const img of imageRows) {
      if (!imgByProduct.has(img.productId)) imgByProduct.set(img.productId, img.url);
    }
    for (const p of productRows) {
      productsMap.set(p.id, {
        id: p.id,
        name: p.name,
        priceCents: p.priceCents,
        imageUrl: imgByProduct.get(p.id) ?? null,
      });
    }
  }

  // 3) Agregação pura
  const allCarts = aggregateAbandonedCarts(events, productsMap);
  const carts = allCarts.filter((c) => c.lastEventAt.getTime() <= abandonedCutoff.getTime());

  // 4) Resolve emails: userId → users.email
  const userIds = [...new Set(carts.map((c) => c.userId).filter((id): id is string => !!id))];
  const usersMap = new Map<string, { email: string; name: string | null }>();
  if (userIds.length > 0) {
    const userRows = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(inArray(users.id, userIds));
    for (const u of userRows) usersMap.set(u.id, { email: u.email, name: u.name });
  }

  let detected = 0;
  let inserted = 0;
  let updated = 0;
  let emailSent = 0;
  let whatsappSent = 0;
  let skipped = 0;

  for (const cart of carts) {
    detected++;
    const userInfo = cart.userId ? usersMap.get(cart.userId) : undefined;
    const email = userInfo?.email ?? null;

    // Upsert manual: SELECT por session_id, depois UPDATE ou INSERT
    const existing = await db
      .select({
        id: abandonedCarts.id,
        lastNotifiedAt: abandonedCarts.lastNotifiedAt,
        status: abandonedCarts.status,
      })
      .from(abandonedCarts)
      .where(and(eq(abandonedCarts.tenantId, tid), eq(abandonedCarts.sessionId, cart.sessionId)))
      .limit(1);

    let cartRowId: string;
    let lastNotifiedAt: Date | null = null;
    if (existing.length > 0) {
      const row = existing[0]!;
      if (row.status !== 'active') {
        skipped++;
        continue;
      }
      cartRowId = row.id;
      lastNotifiedAt = row.lastNotifiedAt;
      await db
        .update(abandonedCarts)
        .set({
          items: cart.items,
          subtotalCents: cart.subtotalCents,
          lastEventAt: cart.lastEventAt,
          contactEmail: email,
          updatedAt: now,
        })
        .where(eq(abandonedCarts.id, row.id));
      updated++;
    } else {
      const insertRow = await db
        .insert(abandonedCarts)
        .values({
          tenantId: tid,
          sessionId: cart.sessionId,
          anonymousId: cart.anonymousId,
          userId: cart.userId,
          contactEmail: email,
          items: cart.items,
          subtotalCents: cart.subtotalCents,
          status: 'active',
          lastEventAt: cart.lastEventAt,
        })
        .returning({ id: abandonedCarts.id });
      cartRowId = insertRow[0]!.id;
      inserted++;
    }

    if (!shouldNotify(email, lastNotifiedAt, now, DEDUP_HOURS)) {
      skipped++;
      continue;
    }

    const channels: string[] = [];
    const emailRes = await sendRecoverCartEmail({
      customerEmail: email!,
      customerName: userInfo?.name ?? undefined,
      items: cart.items.map((it) => ({
        name: it.name,
        qty: it.qty,
        priceCents: it.priceCents,
        imageUrl: it.imageUrl,
      })),
      subtotalCents: cart.subtotalCents,
      currency: 'BRL',
    });
    if (emailRes.ok) {
      emailSent++;
      channels.push('email');
    }

    // WhatsApp degraded — sempre tenta; sem keys retorna mocked sem enviar
    const phone = (userInfo as unknown as { phone?: string } | undefined)?.phone;
    if (phone) {
      const wa = await sendWhatsapp({
        to: phone,
        body: `Você esqueceu itens no seu carrinho. Volte em https://lojeo.app/carrinho`,
      });
      if (wa.ok) {
        whatsappSent++;
        channels.push('whatsapp');
      }
    }

    if (channels.length > 0) {
      await db
        .update(abandonedCarts)
        .set({
          lastNotifiedAt: now,
          notifyChannelsTried: sql`COALESCE(${abandonedCarts.notifyChannelsTried}, '[]'::jsonb) || ${JSON.stringify(channels)}::jsonb`,
        })
        .where(eq(abandonedCarts.id, cartRowId));
    }
  }

  return NextResponse.json({
    ok: true,
    detected,
    inserted,
    updated,
    emailSent,
    whatsappSent,
    skipped,
  });
}
