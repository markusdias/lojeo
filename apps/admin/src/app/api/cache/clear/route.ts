import { NextRequest, NextResponse } from 'next/server';
import { invalidateBudgetCache } from '@lojeo/ai';
import { auth } from '../../../../auth';
import { TENANT_ID, requirePermission, recordAuditLog } from '../../../../lib/roles';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cache/clear?type=ai_budget|all
 *
 * Invalida caches em memória após mudanças críticas (settings, overrides).
 *
 * Tipos suportados:
 * - ai_budget: invalida cache de orçamento mensal IA por tenant
 * - all: futuro — sinaliza outros caches via PubSub (FBT pairs cache vive em
 *   storefront server, não admin — invalidar lá exige Redis ou similar; v1 só
 *   ai_budget que é admin-side)
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  try {
    await requirePermission(session, 'settings', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get('type') ?? 'all';

  const cleared: string[] = [];

  if (type === 'ai_budget' || type === 'all') {
    invalidateBudgetCache(TENANT_ID);
    cleared.push('ai_budget');
  }

  await recordAuditLog({
    session,
    action: 'cache.clear',
    metadata: { type, cleared },
  });

  return NextResponse.json({ ok: true, cleared });
}
