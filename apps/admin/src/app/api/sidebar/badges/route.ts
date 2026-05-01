import { NextResponse } from 'next/server';
import { eq, and, sql, inArray, isNull, or } from 'drizzle-orm';
import { db, orders, ugcPosts, supportTickets, returnRequests, sellerNotifications } from '@lojeo/db';
import { auth } from '../../../../auth';

export const dynamic = 'force-dynamic';

const TENANT_ID = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

/**
 * GET /api/sidebar/badges
 *
 * Retorna counts pra exibir no sidebar admin (match design oficial):
 * - pedidos pendentes pagamento
 * - ugc aguardando moderação
 * - tickets abertos
 * - devoluções solicitadas/em análise
 *
 * Falha silenciosa: 0 quando DB indisponível.
 */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ pedidos: 0, ugc: 0, tickets: 0, devolucoes: 0, notificacoes: 0 });

  const tid = TENANT_ID();
  const userId = session.user?.id;

  const [pedidos, ugc, tickets, devolucoes, notificacoes] = await Promise.all([
    db.select({ n: sql<number>`COUNT(*)::int` })
      .from(orders)
      .where(and(eq(orders.tenantId, tid), eq(orders.status, 'pending')))
      .then(r => Number(r[0]?.n ?? 0))
      .catch(() => 0),
    db.select({ n: sql<number>`COUNT(*)::int` })
      .from(ugcPosts)
      .where(and(eq(ugcPosts.tenantId, tid), eq(ugcPosts.status, 'pending')))
      .then(r => Number(r[0]?.n ?? 0))
      .catch(() => 0),
    db.select({ n: sql<number>`COUNT(*)::int` })
      .from(supportTickets)
      .where(and(eq(supportTickets.tenantId, tid), inArray(supportTickets.status, ['open', 'in_progress'])))
      .then(r => Number(r[0]?.n ?? 0))
      .catch(() => 0),
    db.select({ n: sql<number>`COUNT(*)::int` })
      .from(returnRequests)
      .where(and(eq(returnRequests.tenantId, tid), inArray(returnRequests.status, ['requested', 'analyzing'])))
      .then(r => Number(r[0]?.n ?? 0))
      .catch(() => 0),
    db.select({ n: sql<number>`COUNT(*)::int` })
      .from(sellerNotifications)
      .where(and(
        eq(sellerNotifications.tenantId, tid),
        isNull(sellerNotifications.readAt),
        userId
          ? or(eq(sellerNotifications.userId, userId), isNull(sellerNotifications.userId))
          : isNull(sellerNotifications.userId),
      ))
      .then(r => Number(r[0]?.n ?? 0))
      .catch(() => 0),
  ]);

  return NextResponse.json({ pedidos, ugc, tickets, devolucoes, notificacoes });
}
