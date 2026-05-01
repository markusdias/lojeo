import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, tenants } from '@lojeo/db';
import { DEFAULT_MAINTENANCE, type MaintenanceConfig } from '../../../../lib/tenant-config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
const TTL_MS = 60_000;

let cache: { data: MaintenanceConfig; expiresAt: number } | null = null;

async function readMaintenance(): Promise<MaintenanceConfig> {
  try {
    const [row] = await db
      .select({ config: tenants.config })
      .from(tenants)
      .where(eq(tenants.id, TENANT_ID))
      .limit(1);
    const cfg = (row?.config ?? {}) as { maintenance?: Partial<MaintenanceConfig> };
    return { ...DEFAULT_MAINTENANCE, ...(cfg.maintenance ?? {}) };
  } catch {
    return DEFAULT_MAINTENANCE;
  }
}

export async function GET(req: NextRequest) {
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected) {
    // Fail open: sem secret configurado, manutenção fica indisponível (loja acessível).
    return NextResponse.json({ error: 'internal_secret_not_set' }, { status: 401 });
  }
  const got = req.headers.get('x-internal-token') ?? '';
  if (got !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (req.nextUrl.searchParams.get('bust') === '1') {
    cache = null;
  }

  if (!cache || cache.expiresAt < Date.now()) {
    const data = await readMaintenance();
    cache = { data, expiresAt: Date.now() + TTL_MS };
  }

  return NextResponse.json(cache.data, {
    headers: { 'cache-control': 'no-store' },
  });
}
