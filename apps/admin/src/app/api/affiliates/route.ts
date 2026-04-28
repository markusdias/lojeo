import { NextRequest, NextResponse } from 'next/server';
import { db, affiliateLinks } from '@lojeo/db';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { TENANT_ID } from '../../../lib/roles';
import { authorizeCronRequest } from '../../../lib/cron-auth';
import { guardPermission } from '../../../lib/permission-guard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeCronRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const denied = await guardPermission('settings', 'read');
  if (denied) return denied;

  const rows = await db
    .select()
    .from(affiliateLinks)
    .where(eq(affiliateLinks.tenantId, TENANT_ID))
    .orderBy(desc(affiliateLinks.createdAt))
    .limit(200);

  return NextResponse.json({ ok: true, affiliates: rows });
}

const createSchema = z.object({
  affiliateName: z.string().min(2).max(200),
  affiliateEmail: z.string().email().optional().nullable(),
  code: z.string().min(2).max(32).regex(/^[A-Z0-9-]+$/, 'code must be A-Z 0-9 -'),
  commissionBps: z.number().int().min(0).max(10000).default(1000),
  notes: z.string().max(500).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const auth = await authorizeCronRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const denied = await guardPermission('settings', 'write');
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error', issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const inserted = await db
      .insert(affiliateLinks)
      .values({
        tenantId: TENANT_ID,
        affiliateName: parsed.data.affiliateName,
        affiliateEmail: parsed.data.affiliateEmail ?? null,
        code: parsed.data.code.toUpperCase(),
        commissionBps: parsed.data.commissionBps,
        notes: parsed.data.notes ?? null,
        active: true,
      })
      .returning();

    return NextResponse.json({ ok: true, affiliate: inserted[0] }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('uniq_affiliates_tenant_code')) {
      return NextResponse.json({ error: 'code_already_exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'create_failed', detail: msg }, { status: 500 });
  }
}
