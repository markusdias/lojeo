import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, tenants } from '@lojeo/db';
import { auth } from '../../../../auth';
import { TENANT_ID, requirePermission } from '../../../../lib/roles';
import { getProvider, mergeCredentials, type StoredCredentials } from '../../../../lib/integrations-config';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ provider: string }> };

interface TenantConfigShape {
  integrations?: Record<string, StoredCredentials>;
  [k: string]: unknown;
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const session = await auth();
  try {
    await requirePermission(session, 'settings', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const { provider: providerId } = await ctx.params;
  const provider = getProvider(providerId);
  if (!provider) return NextResponse.json({ error: 'unknown_provider' }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { credentials?: StoredCredentials };
  const incoming = body.credentials ?? {};

  // Validação: required fields presentes (ou já em config existente)
  const tenant = await db.query.tenants?.findFirst({ where: eq(tenants.id, TENANT_ID) });
  if (!tenant) return NextResponse.json({ error: 'tenant_not_found' }, { status: 404 });

  const config = (tenant.config ?? {}) as TenantConfigShape;
  const integrations = config.integrations ?? {};
  const existing = integrations[providerId] ?? {};
  const merged = mergeCredentials(existing, incoming);

  for (const f of provider.fields.filter((x) => x.required)) {
    if (!merged[f.key]) {
      return NextResponse.json({ error: 'missing_field', field: f.key }, { status: 400 });
    }
  }

  const newConfig: TenantConfigShape = {
    ...config,
    integrations: { ...integrations, [providerId]: merged },
  };

  await db
    .update(tenants)
    .set({ config: newConfig, updatedAt: new Date() })
    .where(eq(tenants.id, TENANT_ID));

  return NextResponse.json({ ok: true, provider: providerId, connected: true });
}

export async function DELETE(_: NextRequest, ctx: Ctx) {
  const session = await auth();
  try {
    await requirePermission(session, 'settings', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const { provider: providerId } = await ctx.params;
  const provider = getProvider(providerId);
  if (!provider) return NextResponse.json({ error: 'unknown_provider' }, { status: 404 });

  const tenant = await db.query.tenants?.findFirst({ where: eq(tenants.id, TENANT_ID) });
  if (!tenant) return NextResponse.json({ error: 'tenant_not_found' }, { status: 404 });

  const config = (tenant.config ?? {}) as TenantConfigShape;
  const integrations = { ...(config.integrations ?? {}) };
  delete integrations[providerId];

  await db
    .update(tenants)
    .set({ config: { ...config, integrations }, updatedAt: new Date() })
    .where(eq(tenants.id, TENANT_ID));

  return NextResponse.json({ ok: true, provider: providerId, connected: false });
}
