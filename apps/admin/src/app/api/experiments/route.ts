import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db, experiments, experimentEvents } from '@lojeo/db';
import { auth } from '../../../auth';
import { TENANT_ID, requirePermission, recordAuditLog } from '../../../lib/roles';

export const dynamic = 'force-dynamic';

const VALID_STATUS = ['draft', 'active', 'paused', 'completed'];

interface VariantInput {
  key: string;
  name: string;
  weight: number;
  payload?: Record<string, unknown>;
}

function validateVariants(variants: unknown): { ok: boolean; error?: string; variants?: VariantInput[] } {
  if (!Array.isArray(variants) || variants.length < 2) {
    return { ok: false, error: 'mínimo 2 variantes' };
  }
  const seen = new Set<string>();
  let totalWeight = 0;
  const out: VariantInput[] = [];
  for (const v of variants) {
    const obj = v as Partial<VariantInput>;
    const key = String(obj.key ?? '').trim();
    const name = String(obj.name ?? '').trim();
    const weight = Number(obj.weight);
    if (!key || !/^[a-z0-9-_]+$/.test(key)) return { ok: false, error: `key inválida: ${key}` };
    if (seen.has(key)) return { ok: false, error: `key duplicada: ${key}` };
    seen.add(key);
    if (!name) return { ok: false, error: `name obrigatório para ${key}` };
    if (!Number.isFinite(weight) || weight <= 0 || weight > 100) {
      return { ok: false, error: `weight inválido para ${key}` };
    }
    totalWeight += weight;
    out.push({ key, name, weight, payload: obj.payload });
  }
  if (Math.abs(totalWeight - 100) > 0.5) {
    return { ok: false, error: `soma de weights deve ser 100 (atual: ${totalWeight})` };
  }
  return { ok: true, variants: out };
}

export async function GET() {
  const session = await auth();
  try {
    await requirePermission(session, 'settings', 'read');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const rows = await db.select()
    .from(experiments)
    .where(eq(experiments.tenantId, TENANT_ID))
    .orderBy(desc(experiments.createdAt));

  // Aggregate event counts por experiment
  const counts = await db.select({
    experimentId: experimentEvents.experimentId,
    variantKey: experimentEvents.variantKey,
    eventType: experimentEvents.eventType,
    n: sql<number>`COUNT(*)::int`,
  })
    .from(experimentEvents)
    .where(eq(experimentEvents.tenantId, TENANT_ID))
    .groupBy(experimentEvents.experimentId, experimentEvents.variantKey, experimentEvents.eventType);

  const stats: Record<string, Record<string, { exposures: number; conversions: number }>> = {};
  for (const c of counts) {
    if (!stats[c.experimentId]) stats[c.experimentId] = {};
    if (!stats[c.experimentId]![c.variantKey]) stats[c.experimentId]![c.variantKey] = { exposures: 0, conversions: 0 };
    if (c.eventType === 'exposure') stats[c.experimentId]![c.variantKey]!.exposures = Number(c.n);
    else if (c.eventType === 'conversion') stats[c.experimentId]![c.variantKey]!.conversions = Number(c.n);
  }

  return NextResponse.json({ experiments: rows, stats });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  try {
    await requirePermission(session, 'settings', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as {
    key?: string; name?: string; description?: string;
    targetMetric?: string; variants?: unknown; audience?: Record<string, unknown>;
  };

  const key = body.key?.trim();
  const name = body.name?.trim();
  if (!key || !/^[a-z0-9-_]+$/.test(key)) {
    return NextResponse.json({ error: 'key obrigatória (lowercase, dash, underscore)' }, { status: 400 });
  }
  if (!name) return NextResponse.json({ error: 'name obrigatório' }, { status: 400 });

  const v = validateVariants(body.variants);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  try {
    const [created] = await db.insert(experiments).values({
      tenantId: TENANT_ID,
      key,
      name,
      description: body.description ?? null,
      targetMetric: body.targetMetric?.trim() || 'conversion',
      variants: v.variants ?? [],
      audience: body.audience ?? {},
      status: 'draft',
    }).returning();

    await recordAuditLog({
      session,
      action: 'experiment.create',
      entityType: 'experiment',
      entityId: created?.id ?? null,
      after: { key, name, variants: v.variants },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('uniq_experiments_tenant_key')) {
      return NextResponse.json({ error: `key '${key}' já existe` }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
