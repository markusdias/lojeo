import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { db, tenants } from '@lojeo/db';
import { eq } from 'drizzle-orm';
import { auth } from '../../../../auth';
import { TENANT_ID, requirePermission, recordAuditLog } from '../../../../lib/roles';

export const dynamic = 'force-dynamic';

interface MaintenanceConfig {
  enabled: boolean;
  message: string;
  etaIso?: string;
  bypassToken?: string;
  contactEmail?: string;
}

async function bustStorefrontMaintenance(): Promise<void> {
  const url = process.env.STOREFRONT_URL;
  const secret = process.env.INTERNAL_API_SECRET;
  if (!url || !secret) return;
  try {
    await fetch(`${url}/api/internal/maintenance?bust=1`, {
      headers: { 'x-internal-token': secret },
      cache: 'no-store',
    });
  } catch {
    // best effort
  }
}

/**
 * POST: gera novo bypassToken (32 bytes hex) e persiste em tenant.config.maintenance.
 * Usado pelo botão "Regenerar token" no /settings#manutencao.
 */
export async function POST() {
  const session = await auth();
  try {
    await requirePermission(session, 'settings', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const tenant = await db.query.tenants?.findFirst({ where: eq(tenants.id, TENANT_ID) });
  if (!tenant) return NextResponse.json({ error: 'tenant_not_found' }, { status: 404 });

  const config = (tenant.config ?? {}) as { maintenance?: MaintenanceConfig };
  const current: MaintenanceConfig = config.maintenance ?? {
    enabled: false,
    message: 'Estamos fazendo melhorias',
  };

  const token = randomBytes(32).toString('hex');
  const next: MaintenanceConfig = { ...current, bypassToken: token };

  await db
    .update(tenants)
    .set({ config: { ...config, maintenance: next }, updatedAt: new Date() })
    .where(eq(tenants.id, TENANT_ID));

  await recordAuditLog({
    session,
    action: 'maintenance.token.regenerate',
    entityType: 'tenant',
    entityId: TENANT_ID,
  });

  await bustStorefrontMaintenance();

  return NextResponse.json({ token });
}
