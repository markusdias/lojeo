import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql, like, inArray } from 'drizzle-orm';
import {
  db,
  products,
  productVariants,
  wishlistItems,
  giftCards,
  restockNotifications,
  ugcPosts,
  productReviews,
  supportTickets,
  ticketMessages,
} from '@lojeo/db';
import { auth } from '../../../../auth';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const SEED_PREFIX = 'seed_';

async function authorized(req: NextRequest): Promise<boolean> {
  const seedToken = process.env.SEED_TOKEN;
  if (seedToken) {
    const headerToken = req.headers.get('x-seed-token');
    if (headerToken && headerToken === seedToken) return true;
  }
  const session = await auth();
  return !!session?.user;
}

/**
 * POST /api/seed/all
 *
 * Popula dados demo em todas as telas que dependem de:
 * - wishlist_items (admin /wishlist tab Wishlists)
 * - gift_cards (admin /wishlist tab Gift cards)
 * - restock_notifications (admin /wishlist tab Back-in-stock)
 * - ugc_posts (storefront Home seção UGC + admin /ugc moderação)
 * - product_reviews (storefront PDP + admin /avaliacoes)
 * - support_tickets (admin /tickets + storefront /conta tickets)
 *
 * Marker: campos com prefix 'seed_' (anonymousId/email/customerEmail) → cleanup via DELETE.
 *
 * Auth: session admin OU header x-seed-token=$SEED_TOKEN.
 */
export async function POST(req: NextRequest) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    return await runSeed();
  } catch (e) {
    console.error('seed/all global failure', e);
    return NextResponse.json({ error: 'seed_failed', detail: String(e) }, { status: 500 });
  }
}

async function runSeed() {
  // Pega top 6 produtos ativos (precisa pra wishlist/restock/ugc/reviews)
  const topProducts = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      priceCents: products.priceCents,
    })
    .from(products)
    .where(and(eq(products.tenantId, TENANT_ID), eq(products.status, 'active')))
    .limit(6);

  if (topProducts.length === 0) {
    return NextResponse.json({ error: 'no_active_products' }, { status: 400 });
  }

  // Variants pros restock (precisa variantId NOT NULL idealmente; nullable mas filtrar)
  const variants = await db
    .select({ id: productVariants.id, productId: productVariants.productId })
    .from(productVariants)
    .where(
      and(
        eq(productVariants.tenantId, TENANT_ID),
        inArray(productVariants.productId, topProducts.map(p => p.id)),
      ),
    )
    .limit(20);

  const variantByProduct = new Map<string, string>();
  for (const v of variants) {
    if (!variantByProduct.has(v.productId)) variantByProduct.set(v.productId, v.id);
  }

  const now = new Date();
  const DAY = 24 * 60 * 60 * 1000;

  // ── 1. WISHLIST ITEMS ── distribuir entre top 6 produtos com 4 personas anônimas
  const personas = ['ana', 'beatriz', 'carla', 'diana', 'elena', 'fernanda', 'gabi', 'helena'];
  const wishlistData = topProducts.flatMap((p, i) => {
    const count = Math.max(8, 30 - i * 4); // 30, 26, 22, 18, 14, 10
    return Array.from({ length: count }, (_, idx) => ({
      tenantId: TENANT_ID,
      productId: p.id,
      anonymousId: `${SEED_PREFIX}wl_${personas[idx % personas.length]}_${i}_${idx}`,
      createdAt: new Date(now.getTime() - Math.floor(Math.random() * 30) * DAY),
    }));
  });
  const errors: Record<string, string> = {};
  let wishlistInserted = 0;
  try {
    if (wishlistData.length > 0) {
      const r = await db.insert(wishlistItems).values(wishlistData).returning({ id: wishlistItems.id });
      wishlistInserted = r.length;
    }
  } catch (e) {
    errors.wishlist = String(e);
    console.error('seed wishlist failed', e);
  }

  // ── 2. GIFT CARDS ── 5 cards match Wishlist.jsx demo
  const giftCardsData = [
    { code: `${SEED_PREFIX}GFT-X4M2-9K7P`, initial: 50000, balance: 28000, recipient: 'amanda.reis@email.com', status: 'active', createdDays: 12, expiresDays: 730 },
    { code: `${SEED_PREFIX}GFT-Y8B1-3T6N`, initial: 20000, balance: 20000, recipient: 'fernanda.lima@email.com', status: 'active', createdDays: 14, expiresDays: 730 },
    { code: `${SEED_PREFIX}GFT-P2Q5-7L9V`, initial: 100000, balance: 0, recipient: 'julia.costa@email.com', status: 'used', createdDays: 18, expiresDays: 730 },
    { code: `${SEED_PREFIX}GFT-K3R8-1H4M`, initial: 30000, balance: 30000, recipient: 'beatriz.mendes@email.com', status: 'active', createdDays: 21, expiresDays: 25 }, // expirando 30d
    { code: `${SEED_PREFIX}GFT-N6Z2-8F4D`, initial: 15000, balance: 0, recipient: 'patricia.souza@email.com', status: 'active', createdDays: 55, expiresDays: -2 }, // expired
  ];
  let giftCardsInserted = 0;
  for (const g of giftCardsData) {
    try {
      const expiresAt = new Date(now.getTime() + g.expiresDays * DAY);
      await db.insert(giftCards).values({
        tenantId: TENANT_ID,
        code: g.code,
        initialValueCents: g.initial,
        currentBalanceCents: g.balance,
        recipientEmail: g.recipient,
        status: g.status,
        expiresAt,
        createdAt: new Date(now.getTime() - g.createdDays * DAY),
      });
      giftCardsInserted++;
    } catch (e) {
      errors.giftCard = String(e);
      console.error('seed gift_card failed', g.code, e);
    }
  }

  // ── 3. RESTOCK NOTIFICATIONS ── 6 produtos com waiting count
  const restockData: Array<{ tenantId: string; productId: string; variantId: string; email: string; createdAt: Date; notifiedAt: null }> = [];
  topProducts.slice(0, 5).forEach((p, i) => {
    const variantId = variantByProduct.get(p.id);
    if (!variantId) return;
    const waitCount = Math.max(3, 25 - i * 4); // 25, 21, 17, 13, 9
    for (let j = 0; j < waitCount; j++) {
      restockData.push({
        tenantId: TENANT_ID,
        productId: p.id,
        variantId,
        email: `${SEED_PREFIX}rs_${personas[j % personas.length]}_${i}_${j}@email.com`,
        createdAt: new Date(now.getTime() - Math.floor(Math.random() * 14) * DAY),
        notifiedAt: null,
      });
    }
  });
  let restockInserted = 0;
  try {
    if (restockData.length > 0) {
      const r = await db.insert(restockNotifications).values(restockData).returning({ id: restockNotifications.id });
      restockInserted = r.length;
    }
  } catch (e) {
    errors.restock = String(e);
    console.error('seed restock failed', e);
  }

  // ── 4. UGC POSTS ── 6 approved posts com placeholder
  const ugcData = topProducts.slice(0, 6).map((p, i) => ({
    tenantId: TENANT_ID,
    customerEmail: `${SEED_PREFIX}ugc_${personas[i]}@email.com`,
    customerName: ['Ana M.', 'Beatriz L.', 'Carla S.', 'Diana V.', 'Elena R.', 'Fernanda T.'][i],
    imageUrl: `https://images.unsplash.com/photo-${['1599643478518-a784e5dc4c8f', '1605100804763-247f67b3557e', '1611591437281-460bfbe1220a', '1617038260897-41a1f14a8ca0', '1635767798638-3a0bdadd2bbf', '1599643478518-a784e5dc4c8f'][i]}?w=600&q=80`,
    thumbnailUrl: `https://images.unsplash.com/photo-${['1599643478518-a784e5dc4c8f', '1605100804763-247f67b3557e', '1611591437281-460bfbe1220a', '1617038260897-41a1f14a8ca0', '1635767798638-3a0bdadd2bbf', '1599643478518-a784e5dc4c8f'][i]}?w=300&q=80`,
    caption: ['Novo membro da família ✨', 'Presente perfeito!', 'Acabou de chegar 💛', 'Combinou com tudo', 'Pra sempre 🥰', 'Detalhes que importam'][i],
    status: 'approved',
    source: 'direct_upload',
    productsTagged: [{ productId: p.id, x: 0.5, y: 0.5 }],
    approvedAt: new Date(now.getTime() - i * 2 * DAY),
    moderatedAt: new Date(now.getTime() - i * 2 * DAY),
    createdAt: new Date(now.getTime() - (i + 1) * 2 * DAY),
  }));
  let ugcInserted = 0;
  try {
    const r = await db.insert(ugcPosts).values(ugcData).returning({ id: ugcPosts.id });
    ugcInserted = r.length;
  } catch (e) {
    errors.ugc = String(e);
    console.error('seed ugc failed', e);
  }

  // ── 5. PRODUCT REVIEWS ── 8 reviews approved
  const reviewsData: Array<typeof productReviews.$inferInsert> = [];
  const reviewBodies = [
    { rating: 5, title: 'Apaixonada!', body: 'Peça linda, acabamento impecável. Veio embalada com muito cuidado, entregue antes do prazo. Recomendo demais!' },
    { rating: 5, title: 'Vale cada centavo', body: 'Comprei pra mim e amei tanto que voltei pra comprar pra minha mãe.' },
    { rating: 4, title: 'Bonita mas vem pequena', body: 'Visualmente exatamente como a foto. Ficou um número menor que esperava — mas devolução foi rápida e troca chegou em 5 dias.' },
    { rating: 5, title: 'Surpreendente', body: 'Achei que ia ser bonito mas a peça pessoalmente é ainda mais delicada que nas fotos.' },
    { rating: 5, title: 'Atendimento nota 10', body: 'Tive dúvida sobre o tamanho, responderam em minutos no Insta com vídeo. Isso pra mim já valeu a compra.' },
    { rating: 4, title: 'Recomendo', body: 'Bom custo benefício, entrega rápida.' },
    { rating: 5, title: 'Presente perfeito', body: 'Comprei pro aniversário da minha irmã. Ela amou. Embalagem já vem como presente.' },
    { rating: 3, title: 'OK', body: 'Esperava algo um pouco mais robusto. Bonito mas frágil.' },
  ];
  topProducts.forEach((p, pi) => {
    // 1-2 reviews por produto
    const numReviews = pi < 2 ? 2 : 1;
    for (let j = 0; j < numReviews && reviewsData.length < 8; j++) {
      const r = reviewBodies[reviewsData.length % reviewBodies.length]!;
      reviewsData.push({
        tenantId: TENANT_ID,
        productId: p.id,
        anonymousName: ['Ana M.', 'Beatriz L.', 'Carla S.', 'Diana V.', 'Elena R.', 'Fernanda T.', 'Gabi A.', 'Helena R.'][reviewsData.length % 8] ?? 'Cliente',
        anonymousEmail: `${SEED_PREFIX}rev_${personas[reviewsData.length % personas.length]}@email.com`,
        rating: r.rating,
        title: r.title,
        body: r.body,
        status: 'approved',
        verifiedPurchase: true,
        helpfulCount: Math.floor(Math.random() * 8),
        createdAt: new Date(now.getTime() - reviewsData.length * 3 * DAY),
        updatedAt: new Date(now.getTime() - reviewsData.length * 3 * DAY),
      });
    }
  });
  let reviewsInserted = 0;
  try {
    const r = await db.insert(productReviews).values(reviewsData).returning({ id: productReviews.id });
    reviewsInserted = r.length;
  } catch (e) {
    errors.reviews = String(e);
    console.error('seed reviews failed', e);
  }

  // ── 6. SUPPORT TICKETS ── 3 tickets em estados diferentes
  const ticketsData = [
    { subject: 'Fecho da pulseira veio quebrado', status: 'open', priority: 'high', email: `${SEED_PREFIX}tk_beatriz@email.com`, name: 'Beatriz Lima', createdHoursAgo: 48 },
    { subject: 'Como faço pra trocar tamanho do anel?', status: 'in_progress', priority: 'medium', email: `${SEED_PREFIX}tk_carolina@email.com`, name: 'Carolina P.', createdHoursAgo: 24 },
    { subject: 'Embalagem chegou amassada mas peça inteira', status: 'resolved', priority: 'low', email: `${SEED_PREFIX}tk_julia@email.com`, name: 'Júlia T.', createdHoursAgo: 96, resolvedHoursAgo: 70 },
  ];
  let ticketsInserted = 0;
  for (const t of ticketsData) {
    try {
      const createdAt = new Date(now.getTime() - t.createdHoursAgo * 60 * 60 * 1000);
      const slaDeadline = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
      const resolvedAt = 'resolvedHoursAgo' in t && t.resolvedHoursAgo ? new Date(now.getTime() - t.resolvedHoursAgo * 60 * 60 * 1000) : null;
      const [created] = await db.insert(supportTickets).values({
        tenantId: TENANT_ID,
        customerEmail: t.email,
        customerName: t.name,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        source: 'web',
        slaHours: 24,
        slaDeadlineAt: slaDeadline,
        resolvedAt,
        createdAt,
        updatedAt: resolvedAt ?? createdAt,
      }).returning();
      if (created) {
        ticketsInserted++;
        await db.insert(ticketMessages).values({
          ticketId: created.id,
          senderType: 'customer',
          body: t.subject + ' · Detalhes adicionais: peça delicada, comprei pra presentear minha mãe e fiquei chateada com o problema.',
          isInternal: false,
          createdAt,
        });
      }
    } catch (e) {
      errors.ticket = String(e);
      console.error('seed ticket failed', t.subject, e);
    }
  }

  return NextResponse.json({
    ok: true,
    counts: {
      wishlistItems: wishlistInserted,
      giftCards: giftCardsInserted,
      restockNotifications: restockInserted,
      ugcPosts: ugcInserted,
      reviews: reviewsInserted,
      tickets: ticketsInserted,
    },
    errors,
  });
}

/**
 * DELETE /api/seed/all
 *
 * Cleanup: remove rows com markers seed_* em campos identificadores.
 */
export async function DELETE(req: NextRequest) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const deleted: Record<string, number> = {};

  const wlDel = await db.delete(wishlistItems).where(
    and(eq(wishlistItems.tenantId, TENANT_ID), like(wishlistItems.anonymousId, `${SEED_PREFIX}%`))
  ).returning({ id: wishlistItems.id });
  deleted.wishlistItems = wlDel.length;

  const gcDel = await db.delete(giftCards).where(
    and(eq(giftCards.tenantId, TENANT_ID), like(giftCards.code, `${SEED_PREFIX}%`))
  ).returning({ id: giftCards.id });
  deleted.giftCards = gcDel.length;

  const rsDel = await db.delete(restockNotifications).where(
    and(eq(restockNotifications.tenantId, TENANT_ID), like(restockNotifications.email, `${SEED_PREFIX}%`))
  ).returning({ id: restockNotifications.id });
  deleted.restockNotifications = rsDel.length;

  const ugDel = await db.delete(ugcPosts).where(
    and(eq(ugcPosts.tenantId, TENANT_ID), like(ugcPosts.customerEmail, `${SEED_PREFIX}%`))
  ).returning({ id: ugcPosts.id });
  deleted.ugcPosts = ugDel.length;

  const rvDel = await db.delete(productReviews).where(
    and(eq(productReviews.tenantId, TENANT_ID), like(productReviews.anonymousEmail, `${SEED_PREFIX}%`))
  ).returning({ id: productReviews.id });
  deleted.reviews = rvDel.length;

  const tkDel = await db.delete(supportTickets).where(
    and(eq(supportTickets.tenantId, TENANT_ID), like(supportTickets.customerEmail, `${SEED_PREFIX}%`))
  ).returning({ id: supportTickets.id });
  deleted.tickets = tkDel.length;
  // ticket_messages cascade via FK

  // Suppress unused sql warning (helper fn for future filters)
  void sql;

  return NextResponse.json({ ok: true, deleted });
}
