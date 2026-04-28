import { NextResponse } from 'next/server';
import { db, affiliateLinks, orders } from '@lojeo/db';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '../../../../auth';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

/**
 * GET /api/conta/afiliado — retorna affiliate_link do user logado.
 * 404 se ainda não cadastrado.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const [row] = await db
    .select()
    .from(affiliateLinks)
    .where(and(eq(affiliateLinks.tenantId, TENANT_ID), eq(affiliateLinks.userId, userId)))
    .limit(1);

  if (!row) return NextResponse.json({ error: 'not_registered' }, { status: 404 });

  // Conversões attributed para este código.
  const recentConversions = await db
    .select({
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      totalCents: orders.totalCents,
      paidAt: orders.paidAt,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, TENANT_ID),
        sql`${orders.metadata}->>'affiliateRef' = ${row.code}`,
      ),
    )
    .orderBy(sql`${orders.createdAt} DESC`)
    .limit(20);

  return NextResponse.json({
    ok: true,
    affiliate: {
      id: row.id,
      affiliateName: row.affiliateName,
      affiliateEmail: row.affiliateEmail ?? email,
      code: row.code,
      commissionBps: row.commissionBps,
      clicks: row.clicks,
      conversions: row.conversions,
      payoutCents: row.payoutCents,
      pendingCents: row.pendingCents,
      active: row.active,
      createdAt: row.createdAt,
    },
    recentConversions,
  });
}

const signupSchema = z.object({
  affiliateName: z.string().min(2).max(200),
  code: z.string().min(2).max(32).regex(/^[A-Z0-9-]+$/, 'code must be A-Z 0-9 -'),
});

/**
 * POST /api/conta/afiliado — cliente logado se cadastra como afiliado.
 * Auto-aprovação V1 (active=true). Code único por tenant.
 */
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Já cadastrado?
  const [existing] = await db
    .select({ id: affiliateLinks.id })
    .from(affiliateLinks)
    .where(and(eq(affiliateLinks.tenantId, TENANT_ID), eq(affiliateLinks.userId, userId)))
    .limit(1);
  if (existing) {
    return NextResponse.json({ error: 'already_registered' }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error', issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const inserted = await db
      .insert(affiliateLinks)
      .values({
        tenantId: TENANT_ID,
        userId,
        affiliateName: parsed.data.affiliateName,
        affiliateEmail: email ?? null,
        code: parsed.data.code.toUpperCase(),
        commissionBps: 1000, // default 10%
        active: true,
      })
      .returning();

    return NextResponse.json({ ok: true, affiliate: inserted[0] }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('uniq_affiliates_tenant_code')) {
      return NextResponse.json({ error: 'code_already_exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'create_failed' }, { status: 500 });
  }
}
