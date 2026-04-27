import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { db, restockNotifications, products, emitSellerNotification } from '@lojeo/db';
import { checkRateLimit, getClientIp } from '../../../lib/rate-limit';

const RESTOCK_DEMAND_THRESHOLD = 5;

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const RestockSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  email: z.string().email().max(300),
});

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = RestockSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload', issues: parsed.error.issues }, { status: 400 });
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit({
    key: `restock:${parsed.data.email.toLowerCase()}:${ip}`,
    max: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  try {
    const tid = tenantId();
    await db.insert(restockNotifications).values({
      tenantId: tid,
      email: parsed.data.email,
      productId: parsed.data.productId,
      variantId: parsed.data.variantId ?? null,
    });

    // Conta pendentes (notifiedAt IS NULL) deste produto. Se cruzou threshold
    // exatamente agora, dispara notification para lojista priorizar reposição.
    const countRows = await db
      .select({ pending: sql<number>`count(*)::int` })
      .from(restockNotifications)
      .where(
        and(
          eq(restockNotifications.tenantId, tid),
          eq(restockNotifications.productId, parsed.data.productId),
          isNull(restockNotifications.notifiedAt),
        ),
      );
    const pending = countRows[0]?.pending ?? 0;

    if (pending === RESTOCK_DEMAND_THRESHOLD) {
      const [product] = await db
        .select({ name: products.name })
        .from(products)
        .where(and(eq(products.tenantId, tid), eq(products.id, parsed.data.productId)))
        .limit(1);
      const productName = product?.name ?? 'Produto';
      void emitSellerNotification({
        tenantId: tid,
        type: 'restock.demand',
        severity: 'warning',
        title: `Demanda alta para reposição · ${RESTOCK_DEMAND_THRESHOLD}+ esperando`,
        body: `${productName} acumulou ${RESTOCK_DEMAND_THRESHOLD} clientes pedindo "avise-me quando voltar". Hora de repor.`,
        link: '/wishlist?tab=back-in-stock',
        entityType: 'product',
        entityId: parsed.data.productId,
        metadata: { pending, threshold: RESTOCK_DEMAND_THRESHOLD },
      });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/restock-notify]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
