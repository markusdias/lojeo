import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import {
  db,
  users,
  orders,
  customerAddresses,
  behaviorEvents,
  sessions as authSessions,
  ugcPosts,
  wishlistItems,
  restockNotifications,
  productReviews,
} from '@lojeo/db';
import { auth, signOut } from '../../../auth';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

/**
 * GET /api/conta — exporta dados pessoais (LGPD art. 18 II — portabilidade)
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const [userRow] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const myOrders = email
    ? await db.select().from(orders).where(and(eq(orders.tenantId, TENANT_ID), eq(orders.customerEmail, email)))
    : [];
  const myAddresses = await db.select().from(customerAddresses).where(and(eq(customerAddresses.tenantId, TENANT_ID), eq(customerAddresses.userId, userId)));
  const myUgc = await db.select().from(ugcPosts).where(and(eq(ugcPosts.tenantId, TENANT_ID), eq(ugcPosts.userId, userId)));
  const myWishlist = await db.select().from(wishlistItems).where(and(eq(wishlistItems.tenantId, TENANT_ID), eq(wishlistItems.userId, userId)));
  const myReviews = await db.select().from(productReviews).where(and(eq(productReviews.tenantId, TENANT_ID), eq(productReviews.userId, userId)));

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    user: userRow,
    orders: myOrders,
    addresses: myAddresses,
    ugcPosts: myUgc,
    wishlist: myWishlist,
    reviews: myReviews,
  });
}

/**
 * DELETE /api/conta — exclusão de dados pessoais (LGPD art. 18 VI — eliminação)
 *
 * Política:
 * - PII removida: nome, email, telefone, imagem (users + customer_addresses)
 * - Pedidos: anonimizados (manter para obrigação fiscal — NF-e exige guarda 5 anos)
 * - Eventos comportamentais: deletados (não há obrigação legal de retenção)
 * - UGC posts: deletados (imagens permanecem em storage por 30d, depois purga)
 * - Wishlist, restock, reviews: deletados
 *
 * Esta operação é IRREVERSÍVEL.
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { confirm?: string };
  if (body.confirm !== 'EXCLUIR_MINHA_CONTA') {
    return NextResponse.json({ error: 'confirmation_required', expected: 'EXCLUIR_MINHA_CONTA' }, { status: 400 });
  }

  // Anonimizar pedidos (manter para fiscal)
  if (email) {
    await db.update(orders)
      .set({
        userId: null,
        customerEmail: `deleted-${userId.slice(0, 8)}@anonymized.lgpd`,
        anonymousId: null,
      })
      .where(and(eq(orders.tenantId, TENANT_ID), eq(orders.customerEmail, email)));
  }

  // Deletar dados sem retenção legal
  await Promise.all([
    db.delete(customerAddresses).where(and(eq(customerAddresses.tenantId, TENANT_ID), eq(customerAddresses.userId, userId))),
    db.delete(ugcPosts).where(and(eq(ugcPosts.tenantId, TENANT_ID), eq(ugcPosts.userId, userId))),
    db.delete(wishlistItems).where(and(eq(wishlistItems.tenantId, TENANT_ID), eq(wishlistItems.userId, userId))),
    db.delete(restockNotifications).where(and(eq(restockNotifications.tenantId, TENANT_ID), eq(restockNotifications.userId, userId))),
    db.delete(productReviews).where(and(eq(productReviews.tenantId, TENANT_ID), eq(productReviews.userId, userId))),
    db.delete(behaviorEvents).where(eq(behaviorEvents.userId, userId)),
    db.delete(authSessions).where(eq(authSessions.userId, userId)),
  ]);

  // Deletar usuário (cascade nas FKs do auth: accounts, authSessions, etc.)
  await db.delete(users).where(eq(users.id, userId));

  // Logout
  await signOut({ redirect: false }).catch(() => null);

  return NextResponse.json({ ok: true, deletedAt: new Date().toISOString() });
}
