import { NextResponse } from 'next/server';
import { eq, and, or, desc, inArray } from 'drizzle-orm';
import { db, orders, orderItems } from '@lojeo/db';
import { auth } from '../../../../auth';

export const dynamic = 'force-dynamic';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

// Lista pedidos do usuário logado já entregues (estado mínimo para abrir devolução)
// junto com os itens — usado no formulário /conta/devolucoes.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const tid = tenantId();
  const userId = session.user.id;
  const email = session.user.email ?? null;

  const conditions = [eq(orders.tenantId, tid), eq(orders.status, 'delivered')];
  if (userId && email) {
    conditions.push(or(eq(orders.userId, userId), eq(orders.customerEmail, email))!);
  } else if (userId) {
    conditions.push(eq(orders.userId, userId));
  } else if (email) {
    conditions.push(eq(orders.customerEmail, email));
  }

  const rows = await db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(50);

  const orderIds = rows.map(o => o.id);
  const items = orderIds.length > 0
    ? await db
        .select()
        .from(orderItems)
        .where(and(eq(orderItems.tenantId, tid), inArray(orderItems.orderId, orderIds)))
    : [];

  const itemsByOrder = items.reduce<Record<string, typeof items>>((acc, it) => {
    if (!acc[it.orderId]) acc[it.orderId] = [];
    acc[it.orderId]!.push(it);
    return acc;
  }, {});

  return NextResponse.json({
    orders: rows.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      createdAt: o.createdAt,
      items: (itemsByOrder[o.id] ?? []).map(it => ({
        id: it.id,
        productName: it.productName,
        variantName: it.variantName,
        qty: it.qty,
      })),
    })),
  });
}
