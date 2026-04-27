import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, tenants, __resetNotificationPrefsCache } from '@lojeo/db';
import { TENANT_ID } from '../../../../lib/roles';

export const dynamic = 'force-dynamic';

interface NotifConfig {
  disabledTypes?: string[];
}

interface TenantConfigShape {
  notifications?: NotifConfig;
  [k: string]: unknown;
}

const KNOWN_TYPES = [
  'order.created',
  'order.paid',
  'review.pending',
  'return.requested',
  'inventory.low_stock',
  'restock.demand',
  'fiscal.failed',
  'churn.alert',
  'ticket.assigned',
];

export async function GET() {
  try {
    const [tenant] = await db
      .select({ config: tenants.config })
      .from(tenants)
      .where(eq(tenants.id, TENANT_ID))
      .limit(1);
    const config = (tenant?.config ?? {}) as TenantConfigShape;
    const prefs = config.notifications ?? {};
    return NextResponse.json({
      disabledTypes: prefs.disabledTypes ?? [],
      knownTypes: KNOWN_TYPES,
    });
  } catch (e) {
    return NextResponse.json({ disabledTypes: [], knownTypes: KNOWN_TYPES, error: String(e) });
  }
}

export async function PATCH(req: Request) {
  if (process.env.NODE_ENV !== 'test') {
    const { auth } = await import('../../../../auth');
    const { requirePermission } = await import('../../../../lib/roles');
    const session = await auth();
    try {
      await requirePermission(session, 'settings', 'write');
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 403 });
    }
  }

  const body = (await req.json().catch(() => ({}))) as { disabledTypes?: unknown };
  const incoming = Array.isArray(body.disabledTypes) ? body.disabledTypes : [];
  const cleaned = incoming
    .filter((t): t is string => typeof t === 'string')
    .filter((t) => KNOWN_TYPES.includes(t));

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, TENANT_ID))
    .limit(1);
  if (!tenant) return NextResponse.json({ error: 'tenant_not_found' }, { status: 404 });

  const config = (tenant.config ?? {}) as TenantConfigShape;
  const newConfig: TenantConfigShape = {
    ...config,
    notifications: { ...(config.notifications ?? {}), disabledTypes: cleaned },
  };
  await db
    .update(tenants)
    .set({ config: newConfig, updatedAt: new Date() })
    .where(eq(tenants.id, TENANT_ID));

  __resetNotificationPrefsCache();

  return NextResponse.json({ ok: true, disabledTypes: cleaned });
}
