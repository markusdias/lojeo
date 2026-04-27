import { NextRequest, NextResponse } from 'next/server';
import { db, affiliateLinks } from '@lojeo/db';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { TENANT_ID } from '../../../../lib/roles';
import { authorizeCronRequest } from '../../../../lib/cron-auth';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  active: z.boolean().optional(),
  commissionBps: z.number().int().min(0).max(10000).optional(),
  notes: z.string().max(500).nullable().optional(),
  affiliateName: z.string().min(2).max(200).optional(),
  affiliateEmail: z.string().email().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeCronRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error', issues: parsed.error.issues }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) updates[k] = v;
  }

  const updated = await db
    .update(affiliateLinks)
    .set(updates)
    .where(and(eq(affiliateLinks.tenantId, TENANT_ID), eq(affiliateLinks.id, id)))
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, affiliate: updated[0] });
}

/**
 * POST /api/affiliates/[id]/payout — move pendingCents → payoutCents.
 * Lojista pagou afiliado offline; marca como settled.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeCronRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const url = new URL(req.url);
  if (!url.pathname.endsWith('/payout')) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const [row] = await db
    .select({ pendingCents: affiliateLinks.pendingCents, payoutCents: affiliateLinks.payoutCents })
    .from(affiliateLinks)
    .where(and(eq(affiliateLinks.tenantId, TENANT_ID), eq(affiliateLinks.id, id)))
    .limit(1);
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (row.pendingCents <= 0) {
    return NextResponse.json({ error: 'no_pending' }, { status: 400 });
  }

  const settled = row.pendingCents;
  const updated = await db
    .update(affiliateLinks)
    .set({
      payoutCents: row.payoutCents + settled,
      pendingCents: 0,
      updatedAt: new Date(),
    })
    .where(and(eq(affiliateLinks.tenantId, TENANT_ID), eq(affiliateLinks.id, id)))
    .returning();

  return NextResponse.json({ ok: true, settled, affiliate: updated[0] });
}
